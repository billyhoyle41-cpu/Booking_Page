import { storage } from './storage';
import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';
import { startOfDay, endOfDay, parseISO, addMinutes, parse } from 'date-fns';

const TIMEZONE = 'America/Detroit';
const GHL_API_BASE = 'https://services.leadconnectorhq.com';

// Get GHL Calendar ID from environment or use default (Brenda's Appointments)
function getGHLCalendarId(): string {
  return process.env.GHL_CALENDAR_ID || 'qyfrHvgNL27l6DS0tPsd';
}

interface GHLAppointment {
  id: string;
  title?: string;
  calendarId: string;
  contactId?: string;
  startTime: string;
  endTime: string;
  status: string;
  appointmentStatus?: string;
  notes?: string;
  contact?: {
    id: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
}

interface GHLCalendar {
  id: string;
  name: string;
  description?: string;
  locationId: string;
}

function getGHLHeaders() {
  const apiKey = process.env.GHL_API_KEY;
  if (!apiKey) {
    throw new Error('GHL_API_KEY not configured');
  }
  
  return {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'Version': '2021-04-15'
  };
}

function getLocationId() {
  const locationId = process.env.GHL_LOCATION_ID;
  if (!locationId) {
    throw new Error('GHL_LOCATION_ID not configured');
  }
  return locationId;
}

// Fetch contact details by ID
async function fetchContactDetails(contactId: string): Promise<{ name?: string; phone?: string; email?: string } | null> {
  try {
    const headers = getGHLHeaders();
    const response = await fetch(
      `${GHL_API_BASE}/contacts/${contactId}`,
      { headers }
    );
    
    if (!response.ok) {
      console.log('Could not fetch contact details for', contactId);
      return null;
    }
    
    const data = await response.json();
    const contact = data.contact;
    
    if (!contact) return null;
    
    const name = contact.name || 
      (contact.firstName || contact.lastName 
        ? `${contact.firstName || ''} ${contact.lastName || ''}`.trim() 
        : null);
    
    return {
      name,
      phone: contact.phone,
      email: contact.email
    };
  } catch (error) {
    console.log('Error fetching contact:', error);
    return null;
  }
}

export async function getGHLCalendars(): Promise<GHLCalendar[]> {
  const locationId = getLocationId();
  const headers = getGHLHeaders();
  
  try {
    const response = await fetch(
      `${GHL_API_BASE}/calendars/?locationId=${locationId}`,
      { headers }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('GHL API error fetching calendars:', response.status, errorText);
      throw new Error(`GHL API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.calendars || [];
  } catch (error) {
    console.error('Error fetching GHL calendars:', error);
    throw error;
  }
}

export async function getGHLAppointmentsForDate(date: string, calendarId?: string): Promise<GHLAppointment[]> {
  const locationId = getLocationId();
  const headers = getGHLHeaders();
  
  // Parse date and compute start/end of day in America/Detroit timezone
  // Then convert to UTC milliseconds for the API
  const localDate = parse(date, 'yyyy-MM-dd', new Date());
  const startOfDayLocal = startOfDay(localDate);
  const endOfDayLocal = endOfDay(localDate);
  
  // Convert from Detroit time to UTC for API call
  const startOfDayUTC = fromZonedTime(startOfDayLocal, TIMEZONE);
  const endOfDayUTC = fromZonedTime(endOfDayLocal, TIMEZONE);
  
  const startOfDayMs = startOfDayUTC.getTime();
  const endOfDayMs = endOfDayUTC.getTime();
  
  // Use provided calendarId or get from environment
  const targetCalendarId = calendarId || getGHLCalendarId();
  
  try {
    const url = `${GHL_API_BASE}/calendars/events?locationId=${locationId}&calendarId=${targetCalendarId}&startTime=${startOfDayMs}&endTime=${endOfDayMs}`;
    
    console.log('GHL API: Fetching events for', date, 'calendar:', targetCalendarId);
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('GHL API error:', response.status, errorData.message || 'Unknown error');
      throw new Error(`GHL API error: ${response.status} - ${errorData.message || 'Unknown error'}`);
    }
    
    const data = await response.json();
    console.log('GHL API: Found', data.events?.length || 0, 'events');
    return data.events || [];
  } catch (error) {
    console.error('Error fetching GHL appointments:', error);
    throw error;
  }
}

export async function syncGHLAppointmentsForDate(date: string, calendarId?: string): Promise<{ synced: number; errors: number }> {
  let synced = 0;
  let errors = 0;
  
  try {
    // calendarId is optional - getGHLAppointmentsForDate will use environment default
    const ghlAppointments = await getGHLAppointmentsForDate(date, calendarId);
    console.log(`Found ${ghlAppointments.length} GHL appointments for ${date}`);
    
    for (const ghlAppt of ghlAppointments) {
      try {
        // Log the raw appointment data for debugging
        console.log('GHL Appointment raw data:', JSON.stringify({
          id: ghlAppt.id,
          title: ghlAppt.title,
          status: ghlAppt.status,
          contactId: ghlAppt.contactId,
          contact: ghlAppt.contact,
          notes: ghlAppt.notes
        }));
        
        const startTime = parseISO(ghlAppt.startTime);
        const zonedTime = toZonedTime(startTime, TIMEZONE);
        const time = formatInTimeZone(startTime, TIMEZONE, 'HH:mm');
        const apptDate = formatInTimeZone(startTime, TIMEZONE, 'yyyy-MM-dd');
        
        if (apptDate !== date) {
          continue;
        }
        
        // Try multiple ways to get customer name from GHL data
        let customerName = 'GHL Appointment';
        let phoneNumber = '';
        let email = '';
        
        // First try contact info from the event
        if (ghlAppt.contact?.name) {
          customerName = ghlAppt.contact.name;
          phoneNumber = ghlAppt.contact.phone || '';
          email = ghlAppt.contact.email || '';
        } else if (ghlAppt.contact?.firstName || ghlAppt.contact?.lastName) {
          customerName = `${ghlAppt.contact.firstName || ''} ${ghlAppt.contact.lastName || ''}`.trim();
          phoneNumber = ghlAppt.contact.phone || '';
          email = ghlAppt.contact.email || '';
        } else if (ghlAppt.contactId) {
          // Fetch contact details from GHL if we have a contactId
          console.log('Fetching contact details for contactId:', ghlAppt.contactId);
          const contactDetails = await fetchContactDetails(ghlAppt.contactId);
          if (contactDetails?.name) {
            customerName = contactDetails.name;
            phoneNumber = contactDetails.phone || '';
            email = contactDetails.email || '';
          } else if (ghlAppt.title && ghlAppt.title.toLowerCase() !== 'busy' && ghlAppt.title.toLowerCase() !== 'blocked') {
            customerName = ghlAppt.title;
          }
        } else if (ghlAppt.title && ghlAppt.title.toLowerCase() !== 'busy' && ghlAppt.title.toLowerCase() !== 'blocked') {
          // Use title if it's not just "busy" or "blocked"
          customerName = ghlAppt.title;
        }
        
        console.log('Resolved customer name:', customerName);
        
        const existingAppointments = await storage.getAppointments(date);
        const existingByGoogleEventId = existingAppointments.find((a: any) => a.googleEventId === `ghl_${ghlAppt.id}`);
        const existingByTimeAndName = existingAppointments.find((a: any) => 
          a.time === time && 
          a.customerName.toLowerCase() === customerName.toLowerCase()
        );
        
        if (existingByGoogleEventId) {
          await storage.updateAppointment(existingByGoogleEventId.id, {
            customerName,
            phoneNumber: phoneNumber || existingByGoogleEventId.phoneNumber,
            email: email || existingByGoogleEventId.email,
            notes: ghlAppt.notes || existingByGoogleEventId.notes,
          });
          synced++;
        } else if (!existingByTimeAndName) {
          await storage.createAppointment({
            date: apptDate,
            time,
            customerName,
            phoneNumber,
            email,
            service: '',
            notes: ghlAppt.notes || '',
            googleEventId: `ghl_${ghlAppt.id}`,
          });
          synced++;
        }
      } catch (apptError) {
        console.error('Error processing GHL appointment:', apptError);
        errors++;
      }
    }
    
    return { synced, errors };
  } catch (error) {
    console.error('Error syncing GHL appointments:', error);
    throw error;
  }
}

export async function getGHLCalendarInfo(): Promise<{ name: string; calendars: GHLCalendar[] } | null> {
  try {
    const calendars = await getGHLCalendars();
    return {
      name: 'GoHighLevel',
      calendars
    };
  } catch (error) {
    console.error('Error fetching GHL calendar info:', error);
    return null;
  }
}
