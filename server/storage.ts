import { db } from "./db";
import {
  appointments,
  type InsertAppointment,
  type UpdateAppointmentRequest,
  type Appointment
} from "@shared/schema";
import { eq, and, isNotNull } from "drizzle-orm";

export interface IStorage {
  getAppointments(date: string): Promise<Appointment[]>;
  getAppointment(id: number): Promise<Appointment | undefined>;
  getAppointmentByGoogleEventId(googleEventId: string): Promise<Appointment | undefined>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: number, updates: UpdateAppointmentRequest): Promise<Appointment>;
  deleteAppointment(id: number): Promise<void>;
  deleteAppointmentByGoogleEventId(googleEventId: string): Promise<void>;
  getAllAppointmentsWithGoogleEventId(): Promise<Appointment[]>;
}

export class DatabaseStorage implements IStorage {
  async getAppointments(date: string): Promise<Appointment[]> {
    return await db.select()
      .from(appointments)
      .where(eq(appointments.date, date));
  }

  async getAppointment(id: number): Promise<Appointment | undefined> {
    const [appointment] = await db.select()
      .from(appointments)
      .where(eq(appointments.id, id));
    return appointment;
  }

  async getAppointmentByGoogleEventId(googleEventId: string): Promise<Appointment | undefined> {
    const [appointment] = await db.select()
      .from(appointments)
      .where(eq(appointments.googleEventId, googleEventId));
    return appointment;
  }

  async getAllAppointmentsWithGoogleEventId(): Promise<Appointment[]> {
    return await db.select()
      .from(appointments)
      .where(isNotNull(appointments.googleEventId));
  }

  async createAppointment(insertAppointment: InsertAppointment): Promise<Appointment> {
    const [appointment] = await db.insert(appointments)
      .values(insertAppointment)
      .returning();
    return appointment;
  }

  async updateAppointment(id: number, updates: UpdateAppointmentRequest): Promise<Appointment> {
    const [updated] = await db.update(appointments)
      .set(updates)
      .where(eq(appointments.id, id))
      .returning();
    return updated;
  }

  async deleteAppointment(id: number): Promise<void> {
    await db.delete(appointments)
      .where(eq(appointments.id, id));
  }

  async deleteAppointmentByGoogleEventId(googleEventId: string): Promise<void> {
    await db.delete(appointments)
      .where(eq(appointments.googleEventId, googleEventId));
  }
}

export const storage = new DatabaseStorage();
