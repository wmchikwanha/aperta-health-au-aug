import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, Clock, Plus } from "lucide-react";
import { format, addDays, addWeeks, addMonths } from "date-fns";
import { cn } from "@/lib/utils";

interface AppointmentSchedulerProps {
  patientId: string;
  patientName: string;
  treatmentPlanFollowUp?: string; // e.g., "2 weeks", "1 month"
  onScheduled?: () => void;
}

const APPOINTMENT_TYPES = [
  { value: "initial_consultation", label: "Initial Consultation" },
  { value: "follow_up", label: "Follow-up" },
  { value: "medication_review", label: "Medication Review" },
  { value: "therapy_session", label: "Therapy Session" },
  { value: "screening_assessment", label: "Screening Assessment" },
  { value: "crisis_intervention", label: "Crisis Intervention" },
];

const DURATION_OPTIONS = [
  { value: "30", label: "30 minutes" },
  { value: "45", label: "45 minutes" },
  { value: "60", label: "1 hour" },
  { value: "90", label: "1.5 hours" },
  { value: "120", label: "2 hours" },
];

export const AppointmentScheduler = ({ 
  patientId, 
  patientName,
  treatmentPlanFollowUp,
  onScheduled 
}: AppointmentSchedulerProps) => {
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState("");
  const [appointmentType, setAppointmentType] = useState("");
  const [duration, setDuration] = useState("60");
  const [notes, setNotes] = useState("");
  const [isScheduling, setIsScheduling] = useState(false);
  const { toast } = useToast();

  // Parse treatment plan follow-up interval
  const suggestedDate = () => {
    if (!treatmentPlanFollowUp) return null;
    
    const lower = treatmentPlanFollowUp.toLowerCase();
    const today = new Date();
    
    if (lower.includes("1 week") || lower.includes("weekly")) {
      return addWeeks(today, 1);
    } else if (lower.includes("2 week") || lower.includes("biweekly") || lower.includes("fortnight")) {
      return addWeeks(today, 2);
    } else if (lower.includes("3 week")) {
      return addWeeks(today, 3);
    } else if (lower.includes("1 month") || lower.includes("monthly")) {
      return addMonths(today, 1);
    } else if (lower.includes("2 month")) {
      return addMonths(today, 2);
    } else if (lower.includes("daily")) {
      return addDays(today, 1);
    } else if (lower.includes("72 hours") || lower.includes("3 days")) {
      return addDays(today, 3);
    }
    
    return null;
  };

  const handleApplySuggested = () => {
    const suggested = suggestedDate();
    if (suggested) {
      setDate(suggested);
      toast({
        title: "Suggested Date Applied",
        description: `Based on treatment plan recommendation: ${treatmentPlanFollowUp}`
      });
    }
  };

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!date || !time || !appointmentType) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setIsScheduling(true);
    try {
      // Combine date and time
      const [hours, minutes] = time.split(":").map(Number);
      const scheduledAt = new Date(date);
      scheduledAt.setHours(hours, minutes, 0, 0);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("appointments").insert({
        patient_id: patientId,
        user_id: user.id,
        scheduled_at: scheduledAt.toISOString(),
        duration_minutes: parseInt(duration),
        appointment_type: appointmentType,
        notes: notes.trim() || null,
        treatment_plan_reference: treatmentPlanFollowUp 
          ? { follow_up_interval: treatmentPlanFollowUp } 
          : null
      });

      if (error) throw error;

      toast({
        title: "Appointment Scheduled",
        description: `${format(scheduledAt, "PPp")} - ${patientName}`
      });

      // Reset form
      setDate(undefined);
      setTime("");
      setAppointmentType("");
      setDuration("60");
      setNotes("");
      
      onScheduled?.();
    } catch (error) {
      console.error("Error scheduling appointment:", error);
      toast({
        title: "Scheduling Failed",
        description: error instanceof Error ? error.message : "Failed to schedule appointment",
        variant: "destructive"
      });
    } finally {
      setIsScheduling(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Schedule Appointment
        </CardTitle>
        <CardDescription>
          Book a follow-up appointment for {patientName}
          {treatmentPlanFollowUp && (
            <span className="block mt-1 text-primary font-medium">
              Treatment plan recommends: {treatmentPlanFollowUp}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSchedule} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Date Picker */}
            <div className="space-y-2">
              <Label>Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {treatmentPlanFollowUp && (
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm" 
                  onClick={handleApplySuggested}
                  className="w-full text-xs"
                >
                  Apply Suggested Date
                </Button>
              )}
            </div>

            {/* Time Input */}
            <div className="space-y-2">
              <Label htmlFor="time">Time *</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Appointment Type */}
            <div className="space-y-2">
              <Label>Appointment Type *</Label>
              <Select value={appointmentType} onValueChange={setAppointmentType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {APPOINTMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label>Duration</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional appointment details..."
              rows={3}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isScheduling}>
            {isScheduling ? "Scheduling..." : "Schedule Appointment"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};