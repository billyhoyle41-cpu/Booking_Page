
import { google } from 'googleapis';

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
    
    const startDateTime = new Date(`${appointment.date}T${appointment.time}:00`);
    const endDateTime = new Date(startDateTime.getTime() + 20 * 60000);

    const event = {
      summary: `Barber: ${appointment.customerName}`,
      description: `Service: ${appointment.service || 'N/A'}\nNotes: ${appointment.notes || ''}\nPhone: ${appointment.phoneNumber || ''}\nEmail: ${appointment.email || ''}`,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: TIMEZONE,
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: TIMEZONE,
      },
    };

    const response = await calendar.events.insert({
      calendarId: CALENDAR_ID,
      requestBody: event,
    });

    return response.data.id;
  } catch (error) {
    console.error('Error creating Google Calendar event:', error);
    return null;
  }
}
