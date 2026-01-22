import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { TIME_SLOTS } from "@shared/schema";

import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent, getSyncedCalendarInfo, setupCalendarWatch, handleCalendarWebhook, syncFromGoogleCalendar } from "./google-calendar";
import { syncGHLAppointmentsForDate, getGHLCalendarInfo } from "./ghl-calendar";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Google Calendar webhook endpoint - receives push notifications
  app.post("/api/calendar/webhook", async (req, res) => {
    try {
      const headers: Record<string, string> = {};
      for (const [key, value] of Object.entries(req.headers)) {
        if (typeof value === 'string') {
          headers[key] = value;
        }
      }
      await handleCalendarWebhook(headers);
      res.status(200).send('OK');
    } catch (err) {
      console.error("Webhook error:", err);
      res.status(500).send('Error');
    }
  });

  // Manual sync endpoint
  app.post("/api/calendar/sync", async (_req, res) => {
    try {
      const result = await syncFromGoogleCalendar();
      res.json({ 
        message: `Synced from Google Calendar: ${result.synced} new, ${result.updated} updated, ${result.deleted} deleted`,
        ...result
      });
    } catch (err) {
      console.error("Sync error:", err);
      res.status(500).json({ message: "Failed to sync from Google Calendar" });
    }
  });

  // Set up calendar watch endpoint
  app.post("/api/calendar/watch", async (req, res) => {
    try {
      // Get the host from request headers or environment
      const host = req.headers.host || process.env.REPLIT_DEV_DOMAIN || '';
      const protocol = host.includes('localhost') ? 'http' : 'https';
      const webhookUrl = `${protocol}://${host}/api/calendar/webhook`;
      
      const result = await setupCalendarWatch(webhookUrl);
      if (result) {
        res.json({ message: "Calendar watch set up successfully", channelId: result.id });
      } else {
        res.status(500).json({ message: "Failed to set up calendar watch" });
      }
    } catch (err) {
      console.error("Watch setup error:", err);
      res.status(500).json({ message: "Failed to set up calendar watch" });
    }
  });

  app.get("/api/calendar/info", async (_req, res) => {
    try {
      const summary = await getSyncedCalendarInfo();
      res.json({ summary });
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch calendar info" });
    }
  });

  // GHL Calendar sync endpoint
  const ghlSyncSchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
  });

  app.post("/api/ghl/sync", async (req, res) => {
    try {
      const parsed = ghlSyncSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }
      const { date } = parsed.data;
      const result = await syncGHLAppointmentsForDate(date);
      res.json({ 
        message: `Synced ${result.synced} appointments from GHL`,
        ...result
      });
    } catch (err) {
      console.error("GHL sync error:", err);
      res.status(500).json({ message: "Failed to sync from GHL Calendar" });
    }
  });

  // GHL Calendar info endpoint
  app.get("/api/ghl/info", async (_req, res) => {
    try {
      const info = await getGHLCalendarInfo();
      res.json(info);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch GHL calendar info" });
    }
  });

  app.get(api.appointments.list.path, async (req, res) => {
    try {
      const date = req.query.date as string;
      if (!date) {
        return res.status(400).json({ message: "Date query parameter is required" });
      }
      const appointments = await storage.getAppointments(date);
      res.json(appointments);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.appointments.get.path, async (req, res) => {
    const appointment = await storage.getAppointment(Number(req.params.id));
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    res.json(appointment);
  });

  app.post(api.appointments.create.path, async (req, res) => {
    try {
      const input = api.appointments.create.input.parse(req.body);
      
      // Check if slot is already taken
      const existing = await storage.getAppointments(input.date);
      const isTaken = existing.some(a => a.time === input.time);
      
      if (isTaken) {
        return res.status(400).json({ 
          message: "This time slot is already booked",
          field: "time"
        });
      }

      const appointment = await storage.createAppointment(input);
      
      // Sync to Google Calendar
      try {
        await createCalendarEvent(appointment);
      } catch (err) {
        console.error("Failed to sync to Google Calendar:", err);
        // We don't fail the request if calendar sync fails
      }

      res.status(201).json(appointment);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.put(api.appointments.update.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const input = api.appointments.update.input.parse(req.body);
      
      const existing = await storage.getAppointment(id);
      if (!existing) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      const updated = await storage.updateAppointment(id, input);
      
      // Sync update to Google Calendar
      try {
        await updateCalendarEvent(updated);
      } catch (err) {
        console.error("Failed to sync update to Google Calendar:", err);
      }
      
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.appointments.delete.path, async (req, res) => {
    const id = Number(req.params.id);
    const existing = await storage.getAppointment(id);
    if (!existing) {
      return res.status(404).json({ message: "Appointment not found" });
    }
    
    // Delete from Google Calendar first
    if (existing.googleEventId) {
      try {
        await deleteCalendarEvent(existing.googleEventId);
      } catch (err) {
        console.error("Failed to delete from Google Calendar:", err);
      }
    }
    
    await storage.deleteAppointment(id);
    res.status(204).send();
  });

  // Initialize seed data if empty
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const today = new Date().toISOString().split('T')[0];
  const existing = await storage.getAppointments(today);
  
  if (existing.length === 0) {
    console.log("Seeding database with sample appointments...");
    
    // Create a few sample appointments for today
    await storage.createAppointment({
      date: today,
      time: "09:00",
      customerName: "John Smith",
      service: "Haircut",
      notes: "Regular trim"
    });

    await storage.createAppointment({
      date: today,
      time: "10:30",
      customerName: "Mike Johnson",
      service: "Beard Trim",
      notes: "First time customer"
    });

    await storage.createAppointment({
      date: today,
      time: "14:00",
      customerName: "David Wilson",
      service: "Haircut & Shave",
      isCompleted: true
    });
  }
}
