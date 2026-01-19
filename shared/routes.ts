import { z } from 'zod';
import { insertAppointmentSchema, appointments } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  appointments: {
    calendarInfo: {
      method: 'GET' as const,
      path: '/api/calendar/info',
      responses: {
        200: z.object({ summary: z.string().nullable() }),
      },
    },
    deleteBrendasCalendar: {
      method: 'POST' as const,
      path: '/api/calendar/delete-brendas',
      responses: {
        200: z.object({ message: z.string() }),
        404: z.object({ message: z.string() }),
      },
    },
    list: {
      method: 'GET' as const,
      path: '/api/appointments',
      input: z.object({
        date: z.string(), // Filter by date YYYY-MM-DD
      }),
      responses: {
        200: z.array(z.custom<typeof appointments.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/appointments/:id',
      responses: {
        200: z.custom<typeof appointments.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/appointments',
      input: insertAppointmentSchema,
      responses: {
        201: z.custom<typeof appointments.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/appointments/:id',
      input: insertAppointmentSchema.partial(),
      responses: {
        200: z.custom<typeof appointments.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/appointments/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type AppointmentInput = z.infer<typeof api.appointments.create.input>;
export type AppointmentResponse = z.infer<typeof api.appointments.create.responses[201]>;
export type AppointmentUpdateInput = z.infer<typeof api.appointments.update.input>;
export type AppointmentListResponse = z.infer<typeof api.appointments.list.responses[200]>;
