import { useState } from "react";
import { format, addDays, subDays, isToday, parseISO } from "date-fns";
import { useAppointments, useDeleteAppointment, useUpdateAppointment } from "@/hooks/use-appointments";
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
  Pencil
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
import { Calendar } from "@/components/ui/calendar"; // Assuming standard shadcn calendar exists or will be generated
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

  // Helper to find appointment for a slot
  const getAppointmentForSlot = (time: string) => {
    return appointments?.find(apt => apt.time === time);
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
  const displayDate = format(currentDate, "EEEE, MMMM do, yyyy");

  return (
    <div className="min-h-screen bg-stone-100 p-4 md:p-8 flex justify-center items-start font-sans">
      
      {/* The Book Container */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl bg-[#faf9f6] rounded-xl paper-shadow overflow-hidden relative min-h-[800px] border border-stone-200"
      >
        
        {/* Header Section */}
        <header className="px-6 py-6 border-b border-stone-200/60 bg-[#fdfcf9] sticky top-0 z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl md:text-3xl font-hand font-bold text-primary tracking-wide">
              Appointments
            </h1>
            {isToday(currentDate) && (
              <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full uppercase tracking-widest">
                Today
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 bg-white p-1.5 rounded-lg border border-stone-200 shadow-sm">
            <button 
              onClick={handlePrevDay}
              className="p-2 hover:bg-stone-100 rounded-md text-stone-600 transition-colors"
              aria-label="Previous day"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-1.5 hover:bg-stone-100 rounded-md transition-colors min-w-[200px] justify-center text-sm font-medium text-stone-700">
                  <CalendarIcon className="w-4 h-4 text-stone-500" />
                  {displayDate}
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

            <button 
              onClick={handleNextDay}
              className="p-2 hover:bg-stone-100 rounded-md text-stone-600 transition-colors"
              aria-label="Next day"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Loading State */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-20 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              <p className="text-stone-500 font-hand text-xl">Opening the book...</p>
            </div>
          </div>
        )}

        {/* Book Content - The "Paper" Area */}
        <div className="relative min-h-[700px] notebook-lines pb-20">
          {/* Red Margin Line */}
          <div className="absolute left-[80px] md:left-[120px] top-0 bottom-0 border-l-2 border-red-300/50 h-full z-0 pointer-events-none" />

          {/* Time Slots */}
          <div className="pt-6 relative z-1">
            {TIME_SLOTS.map((time) => {
              const appointment = getAppointmentForSlot(time);
              const isPast = false; // Could implement based on current time if 'today'

              return (
                <div 
                  key={time} 
                  className="group flex items-start h-[3rem] relative hover:bg-stone-50/50 transition-colors"
                >
                  {/* Time Column */}
                  <div className="w-[80px] md:w-[120px] flex-shrink-0 flex items-start justify-end pr-4 md:pr-6 pt-2">
                    <span className="font-mono text-sm text-stone-400 group-hover:text-stone-600 transition-colors">
                      {time}
                    </span>
                  </div>

                  {/* Appointment Slot */}
                  <div className="flex-grow flex items-center h-full pr-4 pl-4 md:pl-6 relative">
                    {appointment ? (
                      <div className={cn(
                        "w-full flex items-center justify-between group/apt transition-all duration-300",
                        appointment.isCompleted && "opacity-50 grayscale"
                      )}>
                        <div 
                          className="flex items-center gap-3 cursor-pointer"
                          onClick={() => handleSlotClick(time, appointment)}
                        >
                          <div className="flex flex-col">
                            <span className={cn(
                              "text-xl md:text-2xl font-hand text-primary transition-all leading-tight",
                              appointment.isCompleted && "line-through decoration-stone-400 decoration-2"
                            )}>
                              {appointment.customerName}
                            </span>
                            <div className="flex items-center gap-2">
                              {appointment.phoneNumber && (
                                <span className="text-[10px] text-stone-400 font-mono">
                                  {appointment.phoneNumber}
                                </span>
                              )}
                              {appointment.service && (
                                <span className="text-[10px] uppercase tracking-wider text-stone-400 font-medium">
                                  • {appointment.service}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover/apt:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleStatusToggle(appointment)}
                            className={cn(
                              "p-2 rounded-full hover:bg-stone-200/50 transition-colors",
                              appointment.isCompleted ? "text-green-600" : "text-stone-400"
                            )}
                            title={appointment.isCompleted ? "Mark incomplete" : "Mark complete"}
                          >
                            <CheckCircle2 className="w-5 h-5" />
                          </button>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-2 text-stone-400 hover:text-stone-600 rounded-full hover:bg-stone-200/50 transition-colors">
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="font-sans">
                              <DropdownMenuItem onClick={() => handleSlotClick(time, appointment)}>
                                <Pencil className="w-4 h-4 mr-2" />
                                Edit Details
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDelete(appointment)}
                                className="text-red-600 focus:text-red-600 focus:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Cancel Appointment
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ) : (
                      /* Empty Slot */
                      <button
                        onClick={() => handleSlotClick(time)}
                        className="w-full h-full text-left opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2"
                      >
                        <div className="h-[2px] w-6 bg-stone-200" />
                        <span className="text-stone-400 font-hand text-lg">Write entry...</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer info */}
        <div className="bg-[#fdfcf9] border-t border-stone-200 p-4 text-center text-xs text-stone-400 font-mono uppercase tracking-widest">
          Daily Log • {format(currentDate, "PPP")}
        </div>

      </motion.div>

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
