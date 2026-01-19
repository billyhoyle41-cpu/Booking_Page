import { useState } from "react";
import { format, addDays, subDays, isToday, parseISO, parse } from "date-fns";
import { useAppointments, useDeleteAppointment, useUpdateAppointment, useSyncFromCalendar } from "@/hooks/use-appointments";
import { AppointmentForm } from "@/components/AppointmentForm";
import { TIME_SLOTS, type Appointment } from "@shared/schema";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  MoreVertical, 
  Trash2, 
  CheckCircle2, 
  XCircle,
  Pencil,
  RefreshCw,
  User,
  Phone,
  Scissors
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { AnimatePresence, motion } from "framer-motion";

export default function DailyView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Navigation handlers
  const handlePrevDay = () => setCurrentDate(d => subDays(d, 1));
  const handleNextDay = () => setCurrentDate(d => addDays(d, 1));
  const handleToday = () => setCurrentDate(new Date());

  // Data fetching
  const { data: appointments, isLoading, error } = useAppointments(currentDate);

  // Form state
  const [selectedSlot, setSelectedSlot] = useState<{ time: string, appointment?: Appointment } | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Mutations
  const deleteMutation = useDeleteAppointment();
  const updateMutation = useUpdateAppointment();
  const syncMutation = useSyncFromCalendar();

  // Helper to find appointment for a slot
  const getAppointmentForSlot = (time: string) => {
    return appointments?.find(apt => apt.time === time);
  };

  // Format time as AM/PM
  const formatTimeAmPm = (time: string) => {
    const date = parse(time, 'HH:mm', new Date());
    return format(date, 'h:mm a');
  };

  const handleSlotClick = (time: string, appointment?: Appointment) => {
    setSelectedSlot({ time, appointment });
    setIsFormOpen(true);
  };

  const handleStatusToggle = async (appointment: Appointment) => {
    try {
      await updateMutation.mutateAsync({
        id: appointment.id,
        isCompleted: !appointment.isCompleted
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (appointment: Appointment) => {
    if (confirm("Are you sure you want to cancel this appointment?")) {
      await deleteMutation.mutateAsync({
        id: appointment.id,
        date: appointment.date
      });
    }
  };

  const dateStr = format(currentDate, "yyyy-MM-dd");
  const displayDate = format(currentDate, "EEEE, MMMM do");

  return (
    <div className="min-h-screen warm-gradient">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-border sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                <Scissors className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-display font-semibold text-foreground">
                  The Family Barbershop
                </h1>
                <p className="text-sm text-muted-foreground">Appointment Book</p>
              </div>
            </div>
            
            <button
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground rounded-lg transition-colors hover-elevate"
              title="Sync from Google Calendar"
              data-testid="button-sync-calendar"
            >
              <RefreshCw className={cn("w-4 h-4", syncMutation.isPending && "animate-spin")} />
              <span className="hidden sm:inline">Sync Calendar</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Date Navigation */}
        <div className="bg-white rounded-xl card-shadow p-4 mb-6">
          <div className="flex items-center justify-between">
            <button 
              onClick={handlePrevDay}
              className="p-2 rounded-lg text-muted-foreground transition-colors hover-elevate"
              aria-label="Previous day"
              data-testid="button-prev-day"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <button 
                    className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors hover-elevate"
                    data-testid="button-date-picker"
                  >
                    <CalendarIcon className="w-5 h-5 text-accent" />
                    <span className="font-display text-lg font-medium text-foreground">
                      {displayDate}
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
                  <Calendar
                    mode="single"
                    selected={currentDate}
                    onSelect={(d) => d && setCurrentDate(d)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              
              {isToday(currentDate) && (
                <span className="px-3 py-1 bg-accent/10 text-accent text-xs font-semibold rounded-full uppercase tracking-wide">
                  Today
                </span>
              )}
            </div>

            <button 
              onClick={handleNextDay}
              className="p-2 rounded-lg text-muted-foreground transition-colors hover-elevate"
              aria-label="Next day"
              data-testid="button-next-day"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
              <p className="text-muted-foreground">Loading appointments...</p>
            </div>
          </div>
        )}

        {/* Time Slots */}
        {!isLoading && (
          <div className="space-y-2">
            {TIME_SLOTS.map((time, index) => {
              const appointment = getAppointmentForSlot(time);
              const isHourStart = time.endsWith(':00');

              return (
                <motion.div
                  key={time}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                >
                  {appointment ? (
                    /* Booked Slot */
                    <div 
                      className={cn(
                        "bg-white rounded-xl card-shadow p-4 transition-all hover:card-shadow-hover cursor-pointer group",
                        appointment.isCompleted && "opacity-60"
                      )}
                      onClick={() => handleSlotClick(time, appointment)}
                      data-testid={`slot-appointment-${appointment.id}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          {/* Time */}
                          <div className="flex flex-col items-center min-w-[70px]">
                            <span className="text-sm font-medium text-accent">
                              {formatTimeAmPm(time)}
                            </span>
                            <span className="text-xs text-muted-foreground">20 min</span>
                          </div>
                          
                          {/* Customer Info */}
                          <div className="flex flex-col gap-1">
                            <h3 className={cn(
                              "font-display text-lg font-semibold text-foreground",
                              appointment.isCompleted && "line-through decoration-muted-foreground"
                            )}>
                              {appointment.customerName}
                            </h3>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                              {appointment.phoneNumber && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {appointment.phoneNumber}
                                </span>
                              )}
                              {appointment.service && (
                                <span className="flex items-center gap-1">
                                  <Scissors className="w-3 h-3" />
                                  {appointment.service}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusToggle(appointment);
                            }}
                            className={cn(
                              "p-2 rounded-lg transition-colors hover-elevate",
                              appointment.isCompleted && "text-green-600 bg-green-50"
                            )}
                            title={appointment.isCompleted ? "Mark incomplete" : "Mark complete"}
                            data-testid={`button-toggle-status-${appointment.id}`}
                          >
                            <CheckCircle2 className="w-5 h-5" />
                          </button>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button 
                                onClick={(e) => e.stopPropagation()}
                                className="p-2 text-muted-foreground rounded-lg transition-colors hover-elevate"
                                data-testid={`button-actions-${appointment.id}`}
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={() => handleSlotClick(time, appointment)}
                                data-testid={`menu-edit-${appointment.id}`}
                              >
                                <Pencil className="w-4 h-4 mr-2" />
                                Edit Details
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDelete(appointment)}
                                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                data-testid={`menu-delete-${appointment.id}`}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Cancel Appointment
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Empty Slot */
                    <button
                      onClick={() => handleSlotClick(time)}
                      className={cn(
                        "w-full flex items-center gap-4 px-4 py-3 rounded-xl border-2 border-dashed border-border/50 transition-all group hover-elevate",
                        isHourStart && "border-border"
                      )}
                      data-testid={`slot-empty-${time.replace(':', '')}`}
                    >
                      <span className={cn(
                        "text-sm min-w-[70px] text-center",
                        isHourStart ? "font-medium text-foreground" : "text-muted-foreground"
                      )}>
                        {formatTimeAmPm(time)}
                      </span>
                      <span className="text-sm text-muted-foreground group-hover:text-accent transition-colors">
                        + Book appointment
                      </span>
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-white/50 mt-8">
        <div className="max-w-4xl mx-auto px-4 py-4 text-center text-sm text-muted-foreground">
          The Family Barbershop • {format(currentDate, "PPPP")}
        </div>
      </footer>

      {/* Booking Form Modal */}
      {selectedSlot && (
        <AppointmentForm 
          open={isFormOpen}
          onOpenChange={(isOpen) => {
            setIsFormOpen(isOpen);
            if (!isOpen) setTimeout(() => setSelectedSlot(null), 300);
          }}
          date={dateStr}
          time={selectedSlot.time}
          existingAppointment={selectedSlot.appointment}
        />
      )}
    </div>
  );
}
