import { google } from 'googleapis';
import { storage } from './storage';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

const CALENDAR_ID = 'de43e8a726b5cbbd1c985cc89093f02ac1df504f0896b55b8bba74610b259d4e@group.calendar.google.com';
const TIMEZONE = 'America/Detroit';

let connectionSettings: any;

async function getConnectionSettings() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  const response = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-calendar',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json());
  
  return response.items?.[0];
}

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  connectionSettings = await getConnectionSettings();

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Calendar not connected');
  }
  return accessToken;
}

export async function getUncachableGoogleCalendarClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

export async function getSyncedCalendarInfo() {
  try {
    const calendar = await getUncachableGoogleCalendarClient();
    const response = await calendar.calendars.get({ calendarId: CALENDAR_ID });
    return response.data.summary;
  } catch (error) {
    console.error('Error fetching calendar info:', error);
    return null;
  }
}

export async function createCalendarEvent(appointment: any) {
  try {
    const calendar = await getUncachableGoogleCalendarClient();
    
    // Create start/end times in RFC3339 format with local time and timezone
    // This ensures Google interprets the time correctly in America/Detroit
    const startDateTimeStr = `${appointment.date}T${appointment.time}:00`;
    const endMinutes = parseInt(appointment.time.split(':')[1]) + 20;
    const endHour = parseInt(appointment.time.split(':')[0]) + Math.floor(endMinutes / 60);
    const endMin = endMinutes % 60;
    const endDateTimeStr = `${appointment.date}T${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}:00`;

    const event = {
      summary: `Barber: ${appointment.customerName}`,
      description: `Service: ${appointment.service || 'N/A'}\nNotes: ${appointment.notes || ''}\nPhone: ${appointment.phoneNumber || ''}\nEmail: ${appointment.email || ''}`,
      start: {
        dateTime: startDateTimeStr,
        timeZone: TIMEZONE,
      },
      end: {
        dateTime: endDateTimeStr,
        timeZone: TIMEZONE,
      },
    };

    const response = await calendar.events.insert({
      calendarId: CALENDAR_ID,
      requestBody: event,
    });

    // Update the appointment with the Google event ID
    if (response.data.id && appointment.id) {
      await storage.updateAppointment(appointment.id, { googleEventId: response.data.id });
    }

    return response.data.id;
  } catch (error) {
    console.error('Error creating Google Calendar event:', error);
    return null;
  }
}

export async function updateCalendarEvent(appointment: any) {
  if (!appointment.googleEventId) return;
  
  try {
    const calendar = await getUncachableGoogleCalendarClient();
    
    // Create start/end times in RFC3339 format with local time and timezone
    const startDateTimeStr = `${appointment.date}T${appointment.time}:00`;
    const endMinutes = parseInt(appointment.time.split(':')[1]) + 20;
    const endHour = parseInt(appointment.time.split(':')[0]) + Math.floor(endMinutes / 60);
    const endMin = endMinutes % 60;
    const endDateTimeStr = `${appointment.date}T${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}:00`;

    const event = {
      summary: `Barber: ${appointment.customerName}`,
      description: `Service: ${appointment.service || 'N/A'}\nNotes: ${appointment.notes || ''}\nPhone: ${appointment.phoneNumber || ''}\nEmail: ${appointment.email || ''}`,
      start: {
        dateTime: startDateTimeStr,
        timeZone: TIMEZONE,
      },
      end: {
        dateTime: endDateTimeStr,
        timeZone: TIMEZONE,
      },
    };

    await calendar.events.update({
      calendarId: CALENDAR_ID,
      eventId: appointment.googleEventId,
      requestBody: event,
    });
  } catch (error) {
    console.error('Error updating Google Calendar event:', error);
  }
}

export async function deleteCalendarEvent(googleEventId: string) {
  if (!googleEventId) return;
  
  try {
    const calendar = await getUncachableGoogleCalendarClient();
    await calendar.events.delete({
      calendarId: CALENDAR_ID,
      eventId: googleEventId,
    });
  } catch (error) {
    console.error('Error deleting Google Calendar event:', error);
  }
}

function parseEventDescription(description: string | undefined | null): { service?: string; notes?: string; phoneNumber?: string; email?: string } {
  if (!description) return {};
  
  const result: { service?: string; notes?: string; phoneNumber?: string; email?: string } = {};
  const lines = description.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('Service: ')) {
      const val = line.substring(9).trim();
      if (val && val !== 'N/A') result.service = val;
    } else if (line.startsWith('Notes: ')) {
      const val = line.substring(7).trim();
      if (val) result.notes = val;
    } else if (line.startsWith('Phone: ')) {
      const val = line.substring(7).trim();
      if (val) result.phoneNumber = val;
    } else if (line.startsWith('Email: ')) {
      const val = line.substring(7).trim();
      if (val) result.email = val;
    }
  }
  
  return result;
}

export async function syncFromGoogleCalendar() {
  try {
    const calendar = await getUncachableGoogleCalendarClient();
    
    // Get events for the next 30 days
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    const response = await calendar.events.list({
      calendarId: CALENDAR_ID,
      timeMin: now.toISOString(),
      timeMax: thirtyDaysLater.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      showDeleted: true, // Include cancelled events
    });

    const events = response.data.items || [];
    let synced = 0;
    let updated = 0;
    let deleted = 0;
    
    // Track which Google event IDs we've seen
    const seenEventIds = new Set<string>();
    
    for (const event of events) {
      if (!event.id) continue;
      
      // Handle cancelled/deleted events
      if (event.status === 'cancelled') {
        const existing = await storage.getAppointmentByGoogleEventId(event.id);
        if (existing) {
          await storage.deleteAppointment(existing.id);
          deleted++;
        }
        continue;
      }
      
      // Skip events without a title
      if (!event.summary) continue;
      
      seenEventIds.add(event.id);
      
      // Extract customer name - remove "Barber: " prefix if present, otherwise use full title
      const customerName = event.summary.startsWith('Barber: ') 
        ? event.summary.substring(8) 
        : event.summary;
      const startDateTime = event.start?.dateTime;
      
      if (!startDateTime || !customerName) continue;
      
      // Parse the datetime in Detroit timezone
      const startDate = new Date(startDateTime);
      const zonedDate = toZonedTime(startDate, TIMEZONE);
      const date = formatInTimeZone(startDate, TIMEZONE, 'yyyy-MM-dd');
      const time = formatInTimeZone(startDate, TIMEZONE, 'HH:mm');
      
      // Parse description for additional fields
      const details = parseEventDescription(event.description);
      
      // Check if this appointment already exists by Google event ID
      const existing = await storage.getAppointmentByGoogleEventId(event.id);
      
      if (existing) {
        // Update existing appointment
        await storage.updateAppointment(existing.id, {
          date,
          time,
          customerName,
          service: details.service || null,
          notes: details.notes || null,
          phoneNumber: details.phoneNumber || null,
          email: details.email || null,
        });
        updated++;
      } else {
        // Create new appointment
        await storage.createAppointment({
          date,
          time,
          customerName,
          service: details.service || null,
          notes: details.notes || null,
          phoneNumber: details.phoneNumber || null,
          email: details.email || null,
          googleEventId: event.id,
        });
        synced++;
      }
    }
    
    console.log(`Sync complete: ${synced} new, ${updated} updated, ${deleted} deleted`);
    return { synced, updated, deleted };
  } catch (error) {
    console.error('Error syncing from Google Calendar:', error);
    return { synced: 0, updated: 0, deleted: 0 };
  }
}

// Simplified webhook handler - just triggers a sync
export async function handleCalendarWebhook(headers: Record<string, string>) {
  const resourceState = headers['x-goog-resource-state'];
  
  console.log('Received calendar webhook, resource state:', resourceState);
  
  // Any notification triggers a sync
  if (resourceState === 'sync' || resourceState === 'exists') {
    await syncFromGoogleCalendar();
  }
}

// Legacy functions for webhook watch (kept for compatibility but simplified)
export async function setupCalendarWatch(webhookUrl: string) {
  try {
    const calendar = await getUncachableGoogleCalendarClient();
    
    const channelId = `barber-app-${Date.now()}`;
    
    const response = await calendar.events.watch({
      calendarId: CALENDAR_ID,
      requestBody: {
        id: channelId,
        type: 'web_hook',
        address: webhookUrl,
        expiration: String(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    console.log('Calendar watch set up successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error setting up calendar watch:', error);
    return null;
  }
}
