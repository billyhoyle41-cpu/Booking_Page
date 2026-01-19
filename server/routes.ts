import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { TIME_SLOTS } from "@shared/schema";

import { createCalendarEvent, getSyncedCalendarInfo } from "./google-calendar";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.post("/api/calendar/delete-brendas", async (_req, res) => {
    res.status(410).json({ message: "This operation is no longer supported with fixed calendar ID" });
  });

  app.get("/api/calendar/info", async (_req, res) => {
    try {
      const summary = await getSyncedCalendarInfo();
      res.json({ summary });
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch calendar info" });
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
