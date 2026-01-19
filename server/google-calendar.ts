
import { google } from 'googleapis';

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

async function getOrCreateBrendasCalendarId() {
  const calendar = await getUncachableGoogleCalendarClient();
  const list = await calendar.calendarList.list();
  
  const brendasCalendar = list.data.items?.find(c => c.summary === "Brenda's Calendar");
  if (brendasCalendar) return brendasCalendar.id;

  const newCalendar = await calendar.calendars.insert({
    requestBody: {
      summary: "Brenda's Calendar",
      description: "Appointment Book Appointments"
    }
  });
  return newCalendar.data.id;
}

export async function getSyncedCalendarInfo() {
  try {
    const calendar = await getUncachableGoogleCalendarClient();
    const calendarId = await getOrCreateBrendasCalendarId();
    const response = await calendar.calendars.get({ calendarId: calendarId as string });
    return response.data.summary;
  } catch (error) {
    console.error('Error fetching calendar info:', error);
    return null;
  }
}

export async function createCalendarEvent(appointment: any) {
  try {
    const calendar = await getUncachableGoogleCalendarClient();
    const calendarId = await getOrCreateBrendasCalendarId();
    
    const startDateTime = new Date(`${appointment.date}T${appointment.time}:00`);
    const endDateTime = new Date(startDateTime.getTime() + 20 * 60000);

    const event = {
      summary: `Barber: ${appointment.customerName}`,
      description: `Service: ${appointment.service || 'N/A'}\nNotes: ${appointment.notes || ''}\nPhone: ${appointment.phoneNumber || ''}\nEmail: ${appointment.email || ''}`,
      start: {
        dateTime: startDateTime.toISOString(),
      },
      end: {
        dateTime: endDateTime.toISOString(),
      },
    };

    const response = await calendar.events.insert({
      calendarId: calendarId as string,
      requestBody: event,
    });

    return response.data.id;
  } catch (error) {
    console.error('Error creating Google Calendar event:', error);
    return null;
  }
}
