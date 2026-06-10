import { useState } from 'react';
import { 
  AlertTriangle, 
  Shield, 
  ClipboardCheck, 
  ArrowRight, 
  Loader2,
  Save,
  CheckCircle,
  Clock,
  WifiOff,
  Wifi
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmergencyChecklist } from './EmergencyChecklist';
import { CrisisProtocolView } from './CrisisProtocolView';
import { ReferralForm } from './ReferralForm';
import {
  CRISIS_TYPES,
  SEVERITY_LEVELS,
  REFERRAL_PATHWAYS,
  getProtocolByCrisisType,
  getChecklistByCrisisType,
} from '@/lib/firstaid/crisisProtocols';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';

interface FirstAidModuleProps {
  patientId: string;
  patientName: string;
  onComplete?: () => void;
}

export function FirstAidModule({
  patientId,
  patientName,
  onComplete,
}: FirstAidModuleProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { enqueue, isOnline } = useOfflineQueue();
  const [crisisType, setCrisisType] = useState<string>('');
  const [severityLevel, setSeverityLevel] = useState<string>('');
  const [completedChecklist, setCompletedChecklist] = useState<string[]>([]);
  const [interventionsApplied, setInterventionsApplied] = useState<string[]>([]);
  const [outcome, setOutcome] = useState('');
  const [referral, setReferral] = useState<{
    type: string;
    destination: string;
    notes: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingReferral, setIsSavingReferral] = useState(false);
  const [activeTab, setActiveTab] = useState('assess');

  const protocol = crisisType ? getProtocolByCrisisType(crisisType) : null;
  const checklist = crisisType ? getChecklistByCrisisType(crisisType) : null;

  const handleChecklistToggle = (itemId: string) => {
    setCompletedChecklist(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleInterventionToggle = (intervention: string) => {
    setInterventionsApplied(prev =>
      prev.includes(intervention)
        ? prev.filter(i => i !== intervention)
        : [...prev, intervention]
    );
  };

  const buildReferralPayload = (ref: typeof referral) => {
    if (!ref) return null;
    const pathway = REFERRAL_PATHWAYS.find(p => p.name === ref.type);
    const urgency = pathway?.id === 'emergency' || pathway?.id === 'psychiatric_emergency'
      ? 'immediate'
      : pathway?.id === 'crisis_line'
        ? 'urgent'
        : 'routine';
    return {
      context: 'crisis_intervention',
      pathway_id: pathway?.id ?? null,
      referral_type: ref.type,
      destination: ref.destination,
      notes: ref.notes,
      urgency,
      status: 'active',
    };
  };

  const handleReferralSubmit = async (ref: typeof referral) => {
    if (!ref || !user) return;
    setIsSavingReferral(true);

    const payload = buildReferralPayload(ref);
    if (!payload) { setIsSavingReferral(false); return; }

    if (!isOnline) {
      enqueue({ type: "referral", patientId, data: payload });
      setReferral(ref);
      setIsSavingReferral(false);
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('referrals').insert({
        patient_id: patientId,
        recorded_by: user.id,
        ...payload,
      });

      if (error) throw error;

      setReferral(ref);
      toast({
        title: 'Referral Saved',
        description: `Referral to ${ref.type} has been saved.`,
      });
    } catch (err) {
      console.error('Error saving referral:', err);
      enqueue({ type: "referral", patientId, data: payload });
      setReferral(ref);
    } finally {
      setIsSavingReferral(false);
    }
  };

  const buildCrisisPayload = (resolved: boolean) => ({
    crisis_type: crisisType,
    severity_level: severityLevel,
    interventions_applied: JSON.parse(JSON.stringify(interventionsApplied)),
    checklist_completed: JSON.parse(JSON.stringify({ items: completedChecklist })),
    referral_made: !!referral,
    referral_type: referral?.type || null,
    referral_destination: referral?.destination || null,
    referral_notes: referral?.notes || null,
    outcome,
    follow_up_required: !resolved,
    resolved_at: resolved ? new Date().toISOString() : null,
  });

  const handleSave = async (resolved: boolean = false) => {
    if (!user || !crisisType || !severityLevel) {
      toast({
        title: 'Validation Error',
        description: 'Please select crisis type and severity level.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    const payload = buildCrisisPayload(resolved);

    if (!isOnline) {
      enqueue({ type: "crisis_intervention", patientId, data: payload });
      if (resolved && onComplete) onComplete();
      setIsSaving(false);
      return;
    }

    try {
      const { error } = await supabase.from('crisis_interventions').insert({
        patient_id: patientId,
        user_id: user.id,
        ...payload,
      });

      if (error) throw error;

      toast({
        title: resolved ? 'Crisis Resolved' : 'Progress Saved',
        description: resolved
          ? 'Crisis intervention has been documented and marked as resolved.'
          : 'Crisis intervention progress has been saved.',
      });

      if (resolved && onComplete) {
        onComplete();
      }
    } catch (err) {
      console.error('Error saving crisis intervention:', err);
      enqueue({ type: "crisis_intervention", patientId, data: payload });
      if (resolved && onComplete) onComplete();
    } finally {
      setIsSaving(false);
    }
  };

  const getSeverityColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-red-200 bg-red-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-red-800">
                <Shield className="h-5 w-5" />
                Mental Health First Aid
              </CardTitle>
              <CardDescription className="text-red-600">
                Crisis intervention for: {patientName}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {severityLevel && (
                <Badge className={getSeverityColor(severityLevel)}>
                  {SEVERITY_LEVELS.find(s => s.value === severityLevel)?.label} Severity
                </Badge>
              )}
              <Badge variant="outline" className="flex items-center gap-1 text-xs">
                {isOnline ? (
                  <><Wifi className="h-3 w-3 text-green-600" /> Online</>
                ) : (
                  <><WifiOff className="h-3 w-3 text-destructive" /> Offline — protocols cached locally</>
                )}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Crisis Selection */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Crisis Type</Label>
              <Select value={crisisType} onValueChange={(v) => {
                setCrisisType(v);
                setCompletedChecklist([]);
                setInterventionsApplied([]);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select crisis type..." />
                </SelectTrigger>
                <SelectContent>
                  {CRISIS_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className={`h-4 w-4 text-${type.color}-500`} />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Severity Level</Label>
              <Select value={severityLevel} onValueChange={setSeverityLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="Assess severity..." />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITY_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      <div>
                        <span className="font-medium">{level.label}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          - {level.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      {crisisType && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="assess">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Protocol
            </TabsTrigger>
            <TabsTrigger value="checklist">
              <ClipboardCheck className="h-4 w-4 mr-2" />
              Checklist
            </TabsTrigger>
            <TabsTrigger value="intervene">
              <Shield className="h-4 w-4 mr-2" />
              Intervene
            </TabsTrigger>
            <TabsTrigger value="refer">
              <ArrowRight className="h-4 w-4 mr-2" />
              Refer
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assess" className="mt-4">
            {protocol && <CrisisProtocolView protocol={protocol} />}
          </TabsContent>

          <TabsContent value="checklist" className="mt-4">
            {checklist ? (
              <EmergencyChecklist
                checklist={checklist}
                completedItems={completedChecklist}
                onItemToggle={handleChecklistToggle}
              />
            ) : (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  No specific checklist available for this crisis type. Follow the protocol guidelines.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="intervene" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Interventions Applied</CardTitle>
                <CardDescription>
                  Select all interventions you have applied
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {protocol && (
                  <div className="space-y-2">
                    {protocol.immediateActions.map((action, i) => {
                      const isApplied = interventionsApplied.includes(action);
                      return (
                        <button
                          key={i}
                          onClick={() => handleInterventionToggle(action)}
                          className={`w-full text-left p-3 rounded-lg border transition-colors ${
                            isApplied
                              ? 'bg-green-50 border-green-200'
                              : 'bg-card border-border hover:bg-accent'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {isApplied ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <Clock className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="text-sm">{action}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="pt-4 border-t">
                  <Label>Outcome Notes</Label>
                  <Textarea
                    value={outcome}
                    onChange={(e) => setOutcome(e.target.value)}
                    placeholder="Document the outcome of interventions, patient response, and any ongoing concerns..."
                    className="min-h-[100px] mt-1"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="refer" className="mt-4">
            <ReferralForm onSubmit={handleReferralSubmit} isSaving={isSavingReferral} />
            {referral && (
              <Alert className="mt-4 border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Referral to {referral.type} has been documented.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Action Buttons */}
      {crisisType && severityLevel && (
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => handleSave(false)}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : !isOnline ? (
              <WifiOff className="h-4 w-4 mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {!isOnline ? 'Save Offline' : 'Save Progress'}
          </Button>
          <Button
            onClick={() => handleSave(true)}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : !isOnline ? (
              <WifiOff className="h-4 w-4 mr-2" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            {!isOnline ? 'Resolve Offline' : 'Resolve & Complete'}
          </Button>
        </div>
      )}
    </div>
  );
}
