import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, CheckCircle, XCircle, Bell, Trash2 } from "lucide-react";
import { format, isPast, isToday, isTomorrow, isWithinInterval, addDays } from "date-fns";

interface AppointmentListProps {
  patientId?: string;
  limit?: number;
  refreshTrigger?: number;
}

interface Appointment {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
  appointment_type: string;
  status: string;
  notes: string | null;
  reminder_sent: boolean;
  patient_id: string;
  patients: {
    patient_identifier: string;
  };
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'confirmed': return 'default';
    case 'completed': return 'secondary';
    case 'cancelled': return 'destructive';
    case 'no_show': return 'destructive';
    default: return 'outline';
  }
};

const getAppointmentTypeLabel = (type: string) => {
  return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

export const AppointmentList = ({ patientId, limit, refreshTrigger }: AppointmentListProps) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadAppointments();
  }, [patientId, refreshTrigger]);

  const loadAppointments = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("appointments")
        .select(`
          *,
          patients (
            patient_identifier
          )
        `)
        .order("scheduled_at", { ascending: true });

      if (patientId) {
        query = query.eq("patient_id", patientId);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error("Error loading appointments:", error);
      toast({
        title: "Loading Failed",
        description: "Failed to load appointments",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (appointmentId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: newStatus })
        .eq("id", appointmentId);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Appointment marked as ${newStatus}`
      });

      loadAppointments();
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update appointment status",
        variant: "destructive"
      });
    }
  };

  const handleSendReminder = async (appointment: Appointment) => {
    try {
      const { error } = await supabase.functions.invoke("send-appointment-reminder", {
        body: {
          appointmentId: appointment.id,
          patientId: appointment.patient_id,
          scheduledAt: appointment.scheduled_at
        }
      });

      if (error) throw error;

      toast({
        title: "Reminder Sent",
        description: "SMS reminder has been sent to the patient"
      });

      loadAppointments();
    } catch (error) {
      console.error("Error sending reminder:", error);
      toast({
        title: "Reminder Failed",
        description: error instanceof Error ? error.message : "Failed to send reminder",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (appointmentId: string) => {
    if (!confirm("Are you sure you want to delete this appointment?")) return;

    try {
      const { error } = await supabase
        .from("appointments")
        .delete()
        .eq("id", appointmentId);

      if (error) throw error;

      toast({
        title: "Appointment Deleted",
        description: "The appointment has been removed"
      });

      loadAppointments();
    } catch (error) {
      console.error("Error deleting appointment:", error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete appointment",
        variant: "destructive"
      });
    }
  };

  const getTimeUrgency = (scheduledAt: string) => {
    const date = new Date(scheduledAt);
    if (isPast(date)) return "past";
    if (isToday(date)) return "today";
    if (isTomorrow(date)) return "tomorrow";
    if (isWithinInterval(date, { start: new Date(), end: addDays(new Date(), 7) })) return "this-week";
    return "future";
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading appointments...</div>;
  }

  if (appointments.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No appointments scheduled</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {appointments.map((appointment) => {
        const urgency = getTimeUrgency(appointment.scheduled_at);
        const scheduledDate = new Date(appointment.scheduled_at);

        return (
          <Card key={appointment.id} className={cn(
            urgency === "today" && "border-primary border-2",
            urgency === "past" && appointment.status === "scheduled" && "border-destructive border-2"
          )}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-base flex items-center gap-2">
                    {!patientId && <span>{appointment.patients.patient_identifier}</span>}
                    <span className="text-muted-foreground">•</span>
                    <span>{getAppointmentTypeLabel(appointment.appointment_type)}</span>
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Calendar className="h-3 w-3" />
                    {format(scheduledDate, "PPP")}
                    <Clock className="h-3 w-3 ml-2" />
                    {format(scheduledDate, "p")}
                    <span>({appointment.duration_minutes} min)</span>
                  </CardDescription>
                </div>
                <Badge variant={getStatusColor(appointment.status)}>
                  {appointment.status}
                </Badge>
              </div>
            </CardHeader>

            {(urgency === "past" && appointment.status === "scheduled") && (
              <CardContent className="pt-0 pb-3">
                <Alert variant="destructive">
                  <AlertDescription className="text-xs">
                    This appointment is overdue. Please update the status.
                  </AlertDescription>
                </Alert>
              </CardContent>
            )}

            {urgency === "today" && appointment.status === "scheduled" && (
              <CardContent className="pt-0 pb-3">
                <Alert>
                  <AlertDescription className="text-xs font-semibold">
                    Appointment is today!
                  </AlertDescription>
                </Alert>
              </CardContent>
            )}

            {appointment.notes && (
              <CardContent className="pt-0 pb-3">
                <p className="text-xs text-muted-foreground">{appointment.notes}</p>
              </CardContent>
            )}

            <CardContent className="pt-0 flex flex-wrap gap-2">
              {appointment.status === "scheduled" && !isPast(scheduledDate) && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUpdateStatus(appointment.id, "confirmed")}
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Confirm
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSendReminder(appointment)}
                    disabled={appointment.reminder_sent}
                  >
                    <Bell className="h-3 w-3 mr-1" />
                    {appointment.reminder_sent ? "Reminder Sent" : "Send Reminder"}
                  </Button>
                </>
              )}

              {(appointment.status === "scheduled" || appointment.status === "confirmed") && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUpdateStatus(appointment.id, "completed")}
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Mark Complete
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUpdateStatus(appointment.id, "cancelled")}
                  >
                    <XCircle className="h-3 w-3 mr-1" />
                    Cancel
                  </Button>
                </>
              )}

              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDelete(appointment.id)}
                className="ml-auto"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}