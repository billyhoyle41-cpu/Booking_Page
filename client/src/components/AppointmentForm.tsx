import { useState, useEffect } from "react";
import { type AppointmentInput, type AppointmentUpdateInput } from "@shared/routes";
import { useCreateAppointment, useUpdateAppointment } from "@/hooks/use-appointments";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AppointmentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  time: string;
  existingAppointment?: {
    id: number;
    customerName: string;
    service?: string | null;
    notes?: string | null;
    isCompleted?: boolean | null;
  };
}

export function AppointmentForm({ 
  open, 
  onOpenChange, 
  date, 
  time, 
  existingAppointment 
}: AppointmentFormProps) {
  const { toast } = useToast();
  const createMutation = useCreateAppointment();
  const updateMutation = useUpdateAppointment();
  
  const [formData, setFormData] = useState({
    customerName: "",
    service: "",
    notes: "",
  });

  useEffect(() => {
    if (open) {
      if (existingAppointment) {
        setFormData({
          customerName: existingAppointment.customerName,
          service: existingAppointment.service || "",
          notes: existingAppointment.notes || "",
        });
      } else {
        setFormData({
          customerName: "",
          service: "",
          notes: "",
        });
      }
    }
  }, [open, existingAppointment]);

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (existingAppointment) {
        await updateMutation.mutateAsync({
          id: existingAppointment.id,
          customerName: formData.customerName,
          service: formData.service || null,
          notes: formData.notes || null,
        });
        toast({ title: "Updated", description: "Appointment updated successfully." });
      } else {
        await createMutation.mutateAsync({
          date,
          time,
          customerName: formData.customerName,
          service: formData.service || null,
          notes: formData.notes || null,
        });
        toast({ title: "Booked", description: "Appointment scheduled successfully." });
      }
      onOpenChange(false);
    } catch (error) {
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-[#faf9f6] border-neutral-200 shadow-xl paper-shadow font-sans">
        <DialogHeader>
          <DialogTitle className="text-2xl font-hand text-primary">
            {existingAppointment ? "Edit Appointment" : "New Booking"} • {time}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Customer Name
            </label>
            <input
              required
              autoFocus
              className="w-full bg-transparent border-b-2 border-neutral-300 focus:border-primary px-1 py-2 text-2xl font-hand outline-none transition-colors placeholder:text-neutral-300"
              placeholder="e.g. John Doe"
              value={formData.customerName}
              onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Service
            </label>
            <input
              className="w-full bg-transparent border-b-2 border-neutral-300 focus:border-primary px-1 py-2 text-lg font-hand outline-none transition-colors placeholder:text-neutral-300"
              placeholder="e.g. Haircut & Shave"
              value={formData.service}
              onChange={(e) => setFormData(prev => ({ ...prev, service: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Notes
            </label>
            <textarea
              className="w-full bg-neutral-100/50 rounded-md border-0 p-3 text-base font-hand outline-none focus:ring-1 focus:ring-primary/20 resize-none"
              placeholder="Any special instructions..."
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="
                inline-flex items-center gap-2 px-6 py-2 rounded-full 
                bg-primary text-primary-foreground font-medium 
                shadow-lg shadow-primary/20 
                hover:shadow-xl hover:-translate-y-0.5 
                active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-200
              "
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Booking
                </>
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
