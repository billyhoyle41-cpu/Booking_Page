import { Link } from "wouter";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-stone-100 p-4">
      <div className="bg-[#faf9f6] p-8 rounded-xl shadow-lg border border-stone-200 max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <AlertCircle className="h-16 w-16 text-stone-300" />
        </div>
        
        <h1 className="text-4xl font-hand font-bold text-primary">Page Missing</h1>
        <p className="text-stone-500 font-sans">
          Looks like this page was torn out of the book. 
        </p>

        <Link href="/" className="inline-block">
          <button className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
            Return to Appointment Book
          </button>
        </Link>
      </div>
    </div>
  );
}
