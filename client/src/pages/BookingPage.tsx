import { useEffect, useState } from "react";
import { useSearch } from "wouter";
import { format, parse } from "date-fns";
import { ArrowLeft, Clock, Calendar as CalendarIcon, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function BookingPage() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  
  const preselectDate = params.get("date") || "";
  const preselectTime = params.get("time") || "";
  
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [autoSelectAttempted, setAutoSelectAttempted] = useState(false);

  // Format time for display (24h to 12h AM/PM)
  const formatTimeDisplay = (time24: string) => {
    if (!time24) return "";
    try {
      const date = parse(time24, "HH:mm", new Date());
      return format(date, "h:mm a");
    } catch {
      return time24;
    }
  };

  // Format date for display
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const date = parse(dateStr, "yyyy-MM-dd", new Date());
      return format(date, "EEEE, MMMM do, yyyy");
    } catch {
      return dateStr;
    }
  };

  // Build the GHL widget URL with preselect parameters
  const baseUrl = "https://app.briancrossley.com/widget/bookings/brendas-appointments";
  const bookingUrl = new URL(baseUrl);
  
  if (preselectDate) {
    bookingUrl.searchParams.set("date", preselectDate);
  }

  useEffect(() => {
    if (iframeLoaded && !autoSelectAttempted) {
      setAutoSelectAttempted(true);
      // Note: Due to cross-origin restrictions, we cannot directly manipulate
      // the GHL widget DOM. The user will need to select the time slot manually.
      // The date parameter in the URL may help GHL navigate to the correct date.
      console.log("Booking page loaded for:", preselectDate, preselectTime);
    }
  }, [iframeLoaded, autoSelectAttempted, preselectDate, preselectTime]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-accent text-accent-foreground p-4 flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon" className="text-accent-foreground" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold uppercase tracking-wide font-heading">
          Book Appointment
        </h1>
      </header>

      {/* Selected time info banner */}
      {(preselectDate || preselectTime) && (
        <div className="bg-primary/10 border-b border-primary/20 p-4">
          <div className="max-w-4xl mx-auto flex items-center gap-4 flex-wrap">
            <AlertCircle className="h-5 w-5 text-primary flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                You selected:
              </p>
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                {preselectDate && (
                  <span className="flex items-center gap-1">
                    <CalendarIcon className="h-4 w-4" />
                    {formatDateDisplay(preselectDate)}
                  </span>
                )}
                {preselectTime && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {formatTimeDisplay(preselectTime)}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Please select this time slot in the booking calendar below to confirm your appointment.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* GHL Booking Widget Embed */}
      <div className="flex-1 relative">
        {!iframeLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-background">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading booking calendar...</p>
            </div>
          </div>
        )}
        <iframe
          src={bookingUrl.toString()}
          className="w-full h-full border-0"
          style={{ minHeight: "calc(100vh - 180px)" }}
          onLoad={() => setIframeLoaded(true)}
          title="Book Appointment"
          data-testid="iframe-booking"
        />
      </div>
    </div>
  );
}
