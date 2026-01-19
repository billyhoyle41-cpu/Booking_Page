import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type AppointmentInput, type AppointmentUpdateInput } from "@shared/routes";
import { format } from "date-fns";

// GET /api/appointments?date=YYYY-MM-DD
export function useAppointments(date: Date) {
  const dateStr = format(date, 'yyyy-MM-dd');
  
  return useQuery({
    queryKey: [api.appointments.list.path, { date: dateStr }],
    queryFn: async () => {
      // Manually constructing URL with query param since buildUrl usually handles path params
      const url = `${api.appointments.list.path}?date=${dateStr}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error('Failed to fetch appointments');
      return api.appointments.list.responses[200].parse(await res.json());
    },
  });
}

// GET /api/appointments/:id
export function useAppointment(id: number) {
  return useQuery({
    queryKey: [api.appointments.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.appointments.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error('Failed to fetch appointment');
      return api.appointments.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

// POST /api/appointments
export function useCreateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: AppointmentInput) => {
      const res = await fetch(api.appointments.create.path, {
        method: api.appointments.create.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.appointments.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error('Failed to create appointment');
      }
      return api.appointments.create.responses[201].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      // Invalidate the specific day's list
      queryClient.invalidateQueries({ 
        queryKey: [api.appointments.list.path, { date: variables.date }] 
      });
    },
  });
}

// PUT /api/appointments/:id
export function useUpdateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & AppointmentUpdateInput) => {
      const url = buildUrl(api.appointments.update.path, { id });
      const res = await fetch(url, {
        method: api.appointments.update.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error('Failed to update appointment');
      }
      return api.appointments.update.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: [api.appointments.list.path, { date: data.date }] 
      });
      queryClient.invalidateQueries({
        queryKey: [api.appointments.get.path, data.id]
      });
    },
  });
}

// DELETE /api/appointments/:id
export function useDeleteAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, date }: { id: number, date: string }) => {
      const url = buildUrl(api.appointments.delete.path, { id });
      const res = await fetch(url, { 
        method: api.appointments.delete.method, 
        credentials: "include" 
      });
      if (!res.ok) throw new Error('Failed to delete appointment');
      return date; // return date to invalidate correctly
    },
    onSuccess: (date) => {
      queryClient.invalidateQueries({ 
        queryKey: [api.appointments.list.path, { date }] 
      });
    },
  });
}
