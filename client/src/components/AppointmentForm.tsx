import { useState, useEffect } from "react";
import { type AppointmentInput, type AppointmentUpdateInput } from "@shared/routes";
import { useCreateAppointment, useUpdateAppointment } from "@/hooks/use-appointments";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, parse } from "date-fns";

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
    phoneNumber: "",
    email: "",
    service: "",
    notes: "",
  });

  useEffect(() => {
    if (open) {
      if (existingAppointment) {
        setFormData({
          customerName: existingAppointment.customerName,
          phoneNumber: (existingAppointment as any).phoneNumber || "",
          email: (existingAppointment as any).email || "",
          service: existingAppointment.service || "",
          notes: existingAppointment.notes || "",
        });
      } else {
        setFormData({
          customerName: "",
          phoneNumber: "",
          email: "",
          service: "",
          notes: "",
        });
      }
    }
  }, [open, existingAppointment]);

  const isPending = createMutation.isPending || updateMutation.isPending;

  const formatPhoneNumber = (value: string) => {
    if (!value) return value;
    const phoneNumber = value.replace(/[^\d]/g, '');
    const phoneNumberLength = phoneNumber.length;
    if (phoneNumberLength < 4) return phoneNumber;
    if (phoneNumberLength < 7) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    }
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedPhoneNumber = formatPhoneNumber(e.target.value);
    setFormData(prev => ({ ...prev, phoneNumber: formattedPhoneNumber }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (existingAppointment) {
        await updateMutation.mutateAsync({
          id: existingAppointment.id,
          customerName: formData.customerName,
          phoneNumber: formData.phoneNumber || null,
          email: formData.email || null,
          service: formData.service || null,
          notes: formData.notes || null,
        });
        toast({ title: "Updated", description: "Appointment updated successfully." });
      } else {
        await createMutation.mutateAsync({
          date,
          time,
          customerName: formData.customerName,
          phoneNumber: formData.phoneNumber || null,
          email: formData.email || null,
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
            {existingAppointment ? "Edit Appointment" : "New Booking"} • {format(parse(time, 'HH:mm', new Date()), 'h:mm a')}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Customer Name
            </label>
            <input
              required
              autoFocus
              className="w-full bg-transparent border-b-2 border-neutral-300 focus:border-primary px-1 py-1 text-2xl font-hand outline-none transition-colors placeholder:text-neutral-300"
              placeholder="Name"
              value={formData.customerName}
              onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Phone Number
              </label>
              <input
                type="tel"
                className="w-full bg-transparent border-b-2 border-neutral-300 focus:border-primary px-1 py-1 text-lg font-hand outline-none transition-colors placeholder:text-neutral-300"
                placeholder="(222) 222-2222"
                value={formData.phoneNumber}
                onChange={handlePhoneChange}
                maxLength={14}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                className="w-full bg-transparent border-b-2 border-neutral-300 focus:border-primary px-1 py-1 text-lg font-hand outline-none transition-colors placeholder:text-neutral-300"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Service
            </label>
            <input
              className="w-full bg-transparent border-b-2 border-neutral-300 focus:border-primary px-1 py-1 text-lg font-hand outline-none transition-colors placeholder:text-neutral-300"
              placeholder="Service"
              value={formData.service}
              onChange={(e) => setFormData(prev => ({ ...prev, service: e.target.value }))}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Notes
            </label>
            <textarea
              className="w-full bg-neutral-100/50 rounded-md border-0 p-2 text-base font-hand outline-none focus:ring-1 focus:ring-primary/20 resize-none"
              placeholder="Notes..."
              rows={2}
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
