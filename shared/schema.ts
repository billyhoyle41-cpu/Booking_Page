import { pgTable, text, serial, timestamp, date, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(), // YYYY-MM-DD
  time: text("time").notNull(), // HH:mm
  customerName: text("customer_name").notNull(),
  service: text("service"),
  notes: text("notes"),
  isCompleted: boolean("is_completed").default(false),
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({ id: true });

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;

export type CreateAppointmentRequest = InsertAppointment;
export type UpdateAppointmentRequest = Partial<InsertAppointment>;

export const TIME_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00"
];
