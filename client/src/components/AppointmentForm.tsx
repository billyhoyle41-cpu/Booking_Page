import { useState, useEffect } from "react";
import { type AppointmentInput, type AppointmentUpdateInput } from "@shared/routes";
import { useCreateAppointment, useUpdateAppointment } from "@/hooks/use-appointments";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Save, X, Clock, User, Phone, Mail, Scissors, FileText } from "lucide-react";
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
    const formatted = formatPhoneNumber(e.target.value);
    setFormData(prev => ({ ...prev, phoneNumber: formatted }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName.trim()) return;

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

  const formattedTime = format(parse(time, 'HH:mm', new Date()), 'h:mm a');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] bg-card border-border card-shadow">
        <DialogHeader className="pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-accent" />
            </div>
            <div>
              <DialogTitle className="text-xl font-display font-semibold text-foreground">
                {existingAppointment ? "Edit Appointment" : "New Booking"}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-0.5">{formattedTime}</p>
            </div>
          </div>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-5 pt-4">
          {/* Customer Name */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <User className="w-4 h-4 text-muted-foreground" />
              Customer Name
            </label>
            <input
              required
              autoFocus
              className="w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all placeholder:text-muted-foreground"
              placeholder="Enter customer name"
              value={formData.customerName}
              onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
              data-testid="input-customer-name"
            />
          </div>

          {/* Phone & Email */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Phone className="w-4 h-4 text-muted-foreground" />
                Phone
              </label>
              <input
                type="tel"
                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all placeholder:text-muted-foreground"
                placeholder="(555) 555-5555"
                value={formData.phoneNumber}
                onChange={handlePhoneChange}
                maxLength={14}
                data-testid="input-phone"
              />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Mail className="w-4 h-4 text-muted-foreground" />
                Email
              </label>
              <input
                type="email"
                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all placeholder:text-muted-foreground"
                placeholder="email@example.com"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                data-testid="input-email"
              />
            </div>
          </div>

          {/* Service */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Scissors className="w-4 h-4 text-muted-foreground" />
              Service
            </label>
            <input
              className="w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all placeholder:text-muted-foreground"
              placeholder="Haircut, Beard Trim, etc."
              value={formData.service}
              onChange={(e) => setFormData(prev => ({ ...prev, service: e.target.value }))}
              data-testid="input-service"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <FileText className="w-4 h-4 text-muted-foreground" />
              Notes
            </label>
            <textarea
              className="w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all placeholder:text-muted-foreground resize-none"
              placeholder="Any additional notes..."
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              data-testid="input-notes"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-5 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
              data-testid="button-cancel"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              data-testid="button-save"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {existingAppointment ? "Update" : "Book"}
                </>
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
