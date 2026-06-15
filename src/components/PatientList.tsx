import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, User } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { getGenderLabel, getLanguageName } from "@/lib/languages";
import { cn } from "@/lib/utils";

interface Patient {
  id: string;
  patient_identifier: string;
  date_of_birth: string | null;
  gender: string | null;
  language_preference: string | null;
  cultural_background: string | null;
  created_at: string;
}

interface PatientListProps {
  onSelectPatient: (patientId: string) => void;
  onCreatePatient: () => void;
}

export const PatientList = ({ onSelectPatient, onCreatePatient }: PatientListProps) => {
  const { user, userRole } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchPatients();

    const channel = supabase
      .channel('patients-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'patients' },
        () => fetchPatients()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, userRole]);

  useEffect(() => {
    const filtered = patients.filter(patient =>
      patient.patient_identifier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.language_preference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.cultural_background?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredPatients(filtered);
  }, [searchTerm, patients]);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false });

      if (userRole !== 'admin') {
        query = query.eq('user_id', user!.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Exclude patients that are still pending a Bicultural Worker / CHW upward referral.
      // They must be reviewed and accepted from the Intake Queue first.
      const { data: pendingRefs } = await supabase
        .from('referrals')
        .select('patient_id')
        .in('context', ['chw_upward_referral', 'bcw_upward_referral'])
        .eq('status', 'active');

      const pendingIds = new Set((pendingRefs || []).map((r: any) => r.patient_id));
      const visible = (data || []).filter((p) => !pendingIds.has(p.id));

      setPatients(visible);
      setFilteredPatients(visible);
    } catch (error) {
      console.error('Error fetching patients:', error);
      toast({
        title: "Error",
        description: "Failed to load patients",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatAge = (dob: string | null) => {
    if (!dob) return null;
    const age = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    return `${age} yrs`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading patients...</p>
      </div>
    );
  }

  const getInitials = (id: string) => {
    const parts = id.split(/[-_\s]/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return id.slice(0, 2).toUpperCase();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Page header */}
      <div className="flex items-baseline gap-3 mb-6">
        <h1 className="font-serif text-[26px] font-bold tracking-tight text-foreground">Patients</h1>
        {filteredPatients.length > 0 && (
          <span className="text-sm text-text-3 font-light">{filteredPatients.length} active</span>
        )}
      </div>

      {/* Search + New */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by patient ID, language, or identifier…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={onCreatePatient}>
          <Plus className="h-4 w-4 mr-2" />
          New Patient
        </Button>
      </div>

      {/* Patient rows */}
      {filteredPatients.length === 0 ? (
        <div className="bg-card border border-border rounded-xl flex flex-col items-center justify-center py-14 shadow-sm">
          <User className="h-10 w-10 text-muted-foreground mb-3 opacity-40" />
          <p className="text-sm text-muted-foreground text-center">
            {searchTerm ? "No patients found matching your search" : "No patients yet. Create your first patient profile."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {filteredPatients.map((patient) => {
            const metaParts = [
              patient.date_of_birth ? formatAge(patient.date_of_birth) : null,
              patient.gender ? getGenderLabel(patient.gender) : null,
              patient.language_preference ? getLanguageName(patient.language_preference) : null,
            ].filter(Boolean);

            return (
              <button
                key={patient.id}
                onClick={() => onSelectPatient(patient.id)}
                className={cn(
                  "relative flex items-center gap-4 px-5 py-4 text-left",
                  "bg-card border border-border rounded-xl shadow-sm",
                  "hover:-translate-y-px hover:shadow-md hover:border-border-strong",
                  "transition-all duration-150 group overflow-hidden",
                  "border-l-[3px] border-l-border-strong"
                )}
              >
                {/* Avatar */}
                <div
                  className="w-[38px] h-[38px] rounded-[9px] flex items-center justify-center flex-shrink-0"
                  style={{ background: "linear-gradient(135deg,#d1fae5,#a7f3d0)" }}
                >
                  <span className="font-mono text-[11px] font-medium text-clinical-green-dark">
                    {getInitials(patient.patient_identifier)}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm font-medium text-foreground">
                    {patient.patient_identifier}
                  </p>
                  {metaParts.length > 0 && (
                    <p className="text-xs text-text-3 font-light mt-0.5">
                      {metaParts.join(" · ")}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {patient.cultural_background && (
                      <Badge variant="outline" className="text-xs font-mono">
                        {patient.cultural_background}
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-xs font-mono">
                      Added {format(new Date(patient.created_at), "MMM yyyy")}
                    </Badge>
                  </div>
                </div>

                {/* Hover arrow */}
                <span className="text-lg text-text-3 opacity-0 -translate-x-1.5 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 flex-shrink-0 pr-1">
                  ›
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
