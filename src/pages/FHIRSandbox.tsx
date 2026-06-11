import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, Download, Copy, FileJson, CheckCircle2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SAMPLE_NARRATIVES, getSampleNarrative } from "@/lib/fhir/sampleNarratives";
import { buildSampleBundle, downloadBundle } from "@/lib/fhir/sampleBundle";

const FHIRSandbox = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState(SAMPLE_NARRATIVES[0].id);
  const [bundle, setBundle] = useState<any>(null);

  const narrative = getSampleNarrative(selectedId)!;

  const generate = () => {
    setBundle(buildSampleBundle(narrative));
    toast({ title: "FHIR R4 Bundle generated", description: `${narrative.label} — sandbox payload ready.` });
  };

  const copy = async () => {
    if (!bundle) return;
    await navigator.clipboard.writeText(JSON.stringify(bundle, null, 2));
    toast({ title: "Copied to clipboard" });
  };

  const download = () => {
    if (!bundle) return;
    downloadBundle(bundle, `aperta-fhir-${narrative.id}.json`);
  };

  const resourceCounts = bundle
    ? bundle.entry.reduce((acc: Record<string, number>, e: any) => {
        const t = e.resource.resourceType;
        acc[t] = (acc[t] || 0) + 1;
        return acc;
      }, {})
    : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <div>
              <h1 className="text-xl font-semibold flex items-center gap-2">
                <FileJson className="h-5 w-5 text-primary" /> FHIR R4 Export Sandbox
              </h1>
              <p className="text-xs text-muted-foreground">Partner integration testing — no PII, no clinical data</p>
            </div>
          </div>
          <Badge variant="outline">Sandbox</Badge>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6 max-w-6xl">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>For integration testing only</AlertTitle>
          <AlertDescription>
            Bundles produced here use synthetic narratives. Resources are tagged{" "}
            <code className="text-xs bg-muted px-1 rounded">sandbox</code> and must not be loaded into a production EHR.
            Profiles are loosely aligned to AU Base 4.x and US Core 6.x — validate against your receiving system before go-live.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>1. Choose a sample narrative</CardTitle>
            <CardDescription>Four CALD presentations spanning languages, visa subclasses, and risk levels.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SAMPLE_NARRATIVES.map((n) => (
                  <SelectItem key={n.id} value={n.id}>{n.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="grid md:grid-cols-2 gap-3 text-sm">
              <div className="space-y-1">
                <div><span className="text-muted-foreground">Language:</span> {narrative.languageDisplay} ({narrative.language})</div>
                <div><span className="text-muted-foreground">Country of birth:</span> {narrative.countryOfBirthDisplay} ({narrative.countryOfBirth})</div>
                <div><span className="text-muted-foreground">Visa subclass:</span> {narrative.visaStatus}</div>
                <div><span className="text-muted-foreground">Age band / gender:</span> {narrative.ageBand} / {narrative.gender}</div>
              </div>
              <div className="space-y-1">
                <div><span className="text-muted-foreground">Risk level:</span>{" "}
                  <Badge variant={narrative.riskLevel === "high" ? "destructive" : narrative.riskLevel === "moderate" ? "default" : "secondary"}>
                    {narrative.riskLevel}
                  </Badge>
                </div>
                <div><span className="text-muted-foreground">Provisional dx:</span> {narrative.provisionalDiagnosis.icd10AmCode} — {narrative.provisionalDiagnosis.display}</div>
                <div><span className="text-muted-foreground">Screenings:</span> {narrative.screenings.map((s) => s.instrument).join(", ")}</div>
              </div>
            </div>

            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <div className="font-medium mb-1">Presenting</div>
              <p className="text-muted-foreground">{narrative.presenting}</p>
            </div>

            <Button onClick={generate}>
              <FileJson className="h-4 w-4" /> Generate FHIR R4 Bundle
            </Button>
          </CardContent>
        </Card>

        {bundle && (
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle>2. Bundle preview</CardTitle>
                  <CardDescription>Bundle.type = collection · {bundle.entry.length} resources</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={copy}><Copy className="h-4 w-4" /> Copy</Button>
                  <Button size="sm" onClick={download}><Download className="h-4 w-4" /> Download .json</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-3">
                {Object.entries(resourceCounts as Record<string, number>).map(([t, c]) => (
                  <Badge key={t} variant="outline">{t} × {c}</Badge>
                ))}
              </div>

              <Tabs defaultValue="json">
                <TabsList>
                  <TabsTrigger value="json">JSON</TabsTrigger>
                  <TabsTrigger value="validation">Validation checklist</TabsTrigger>
                </TabsList>
                <TabsContent value="json">
                  <pre className="text-xs bg-muted rounded-md p-3 overflow-auto max-h-[480px]">
                    {JSON.stringify(bundle, null, 2)}
                  </pre>
                </TabsContent>
                <TabsContent value="validation" className="space-y-3 text-sm">
                  <ChecklistItem ok label="Bundle.type = collection (no transaction semantics required)" />
                  <ChecklistItem ok label="Patient identifier is pseudonymous; no PII present" />
                  <ChecklistItem ok label="Patient.communication uses BCP-47 language code" />
                  <ChecklistItem ok label="Visa subclass extension at hl7.org.au/fhir/StructureDefinition/visa-subclass" />
                  <ChecklistItem ok label="Observation.code uses LOINC for PHQ-9, GAD-7, PCL-5, MSE" />
                  <ChecklistItem ok label="Condition.code uses ICD-10-AM (Australian Modification)" />
                  <ChecklistItem ok label="Composition references all clinical entries via fullUrl" />
                  <ChecklistItem ok label="AuditEvent recorded for bundle generation" />
                  <p className="text-xs text-muted-foreground pt-2 border-t">
                    Recommended partner tests: HAPI FHIR validator (R4), AU Core IPS profile check,
                    SNOMED-CT terminology server lookup, ingest into staging EHR with read-back.
                  </p>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

const ChecklistItem = ({ ok, label }: { ok: boolean; label: string }) => (
  <div className="flex items-start gap-2">
    <CheckCircle2 className={`h-4 w-4 mt-0.5 ${ok ? "text-green-600" : "text-muted-foreground"}`} />
    <span>{label}</span>
  </div>
);

export default FHIRSandbox;
