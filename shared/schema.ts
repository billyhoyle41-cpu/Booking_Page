import { pgTable, text, serial, timestamp, date, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(), // YYYY-MM-DD
  time: text("time").notNull(), // HH:mm
  customerName: text("customer_name").notNull(),
  phoneNumber: text("phone_number"),
  email: text("email"),
  service: text("service"),
  notes: text("notes"),
  isCompleted: boolean("is_completed").default(false),
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({ id: true });

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;

export type CreateAppointmentRequest = InsertAppointment;
export type UpdateAppointmentRequest = Partial<InsertAppointment>;

// Generate 20 minute blocks from 9am to 5pm
const generateTimeSlots = () => {
  const slots = [];
  let hour = 9;
  let minute = 0;
  
  while (hour < 17 || (hour === 17 && minute === 0)) {
    const h = hour.toString().padStart(2, '0');
    const m = minute.toString().padStart(2, '0');
    slots.push(`${h}:${m}`);
    
    minute += 20;
    if (minute >= 60) {
      hour += 1;
      minute = 0;
    }
  }
  return slots;
};

export const TIME_SLOTS = generateTimeSlots();
