import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, PlayCircle, ArrowUpCircle, RefreshCw, AlertTriangle } from "lucide-react";

const db = supabase as any;
const pct = (v: any) => (v === null || v === undefined ? "—" : `${Math.round(Number(v) * 100)}%`);

export function ModelGovernance() {
  const { toast } = useToast();
  const [models, setModels] = useState<any[]>([]);
  const [prompts, setPrompts] = useState<any[]>([]);
  const [preambles, setPreambles] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  const [evals, setEvals] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [drift, setDrift] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [newModel, setNewModel] = useState({ model_id: "", label: "", slot: "reasoning" });

  const load = async () => {
    const [m, p, pr, c, e, l, d] = await Promise.all([
      db.from("model_versions").select("*").order("created_at"),
      db.from("prompt_templates").select("*").order("function_name"),
      db.from("ai_safety_preambles").select("*").order("effective_from", { ascending: false }),
      db.from("ai_model_cards").select("*"),
      db.from("eval_results").select("*").order("test_date", { ascending: false }).limit(30),
      db.from("ai_confidence_log").select("function_name, language_of_input, clinician_override, clinician_override_reason, clinician_id, calibrated_confidence").limit(5000),
      db.from("ai_drift_metrics").select("*").order("period_start", { ascending: false }).limit(100),
    ]);
    setModels(m.data ?? []); setPrompts(p.data ?? []); setPreambles(pr.data ?? []); setCards(c.data ?? []);
    setEvals(e.data ?? []); setLogs(l.data ?? []); setDrift(d.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const latestEval = (id: string) => evals.find(e => e.model_version_id === id);

  const runRegression = async (id: string) => {
    setBusy(`run-${id}`);
    const { data, error } = await supabase.functions.invoke("run-regression-suite", { body: { model_version_id: id } });
    setBusy(null);
    if (error || data?.error) return toast({ title: "Regression failed to run", description: data?.error ?? error?.message, variant: "destructive" });
    toast({ title: data.passed ? "Regression passed" : "Regression failed", description: `${data.summary.cases} multilingual cases checked.` });
    load();
  };

  const promote = async (id: string) => {
    setBusy(`promote-${id}`);
    const { error } = await db.rpc("promote_model_version", { _model_version_id: id });
    setBusy(null);
    if (error) return toast({ title: "Promotion blocked", description: error.message, variant: "destructive" });
    toast({ title: "Model promoted", description: "Recorded in the audit log." });
    load();
  };

  const addCandidate = async () => {
    if (!newModel.model_id.trim() || !newModel.label.trim()) return;
    const { error } = await db.from("model_versions").insert({ provider: newModel.model_id.split("/")[0] || "unknown", model_id: newModel.model_id.trim(), model_version_label: newModel.label.trim(), slot: newModel.slot, status: "candidate" });
    if (error) return toast({ title: "Could not register", description: error.message, variant: "destructive" });
    setNewModel({ model_id: "", label: "", slot: "reasoning" });
    load();
  };

  const overrideRate = (key: string) => {
    const groups: Record<string, { n: number; o: number }> = {};
    for (const l of logs) {
      const k = String(l[key] ?? "unknown");
      groups[k] ??= { n: 0, o: 0 };
      groups[k].n++; if (l.clinician_override) groups[k].o++;
    }
    return Object.entries(groups).sort((a, b) => b[1].n - a[1].n);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>AI Model Governance</CardTitle>
          <CardDescription>Registered models, versioned prompts and safety preamble, regression gate, confidence, overrides and per-language drift.</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1" />Refresh</Button>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="registry">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="registry">Model Registry</TabsTrigger>
            <TabsTrigger value="cards">Model Cards</TabsTrigger>
            <TabsTrigger value="prompts">Prompts & Preamble</TabsTrigger>
            <TabsTrigger value="evals">Regression</TabsTrigger>
            <TabsTrigger value="monitor">Overrides & Drift</TabsTrigger>
          </TabsList>

          <TabsContent value="registry" className="space-y-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Model</TableHead><TableHead>Used for</TableHead><TableHead>Status</TableHead><TableHead>Latest regression</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {models.map(m => {
                    const ev = latestEval(m.id);
                    return (
                      <TableRow key={m.id}>
                        <TableCell><div className="font-medium">{m.model_version_label}</div><div className="text-xs text-muted-foreground font-mono">{m.model_id}</div></TableCell>
                        <TableCell className="text-xs">{m.slot === "narrative" ? "Narrative extraction" : "Diagnosis, treatment, Ask AI, transcription, documents, self-assessment"}</TableCell>
                        <TableCell><Badge variant={m.status === "active" ? "default" : m.status === "candidate" ? "secondary" : "outline"}>{m.status}</Badge></TableCell>
                        <TableCell className="text-xs">{ev ? <Badge variant={ev.passed ? "default" : "destructive"}>{ev.passed ? "Passed" : "Failed"} · {new Date(ev.test_date).toLocaleDateString("en-AU")}</Badge> : "Not run"}</TableCell>
                        <TableCell className="text-right space-x-2 whitespace-nowrap">
                          <Button size="sm" variant="outline" disabled={!!busy || m.status === "retired"} onClick={() => runRegression(m.id)}>
                            {busy === `run-${m.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4 mr-1" />}Run regression
                          </Button>
                          {m.status === "candidate" && (
                            <Button size="sm" disabled={!!busy || !ev?.passed} title={!ev?.passed ? "Requires a passing regression run" : ""} onClick={() => promote(m.id)}>
                              <ArrowUpCircle className="h-4 w-4 mr-1" />Promote
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="grid gap-2 sm:grid-cols-4 items-end border rounded-md p-3">
              <Input placeholder="Model id, e.g. google/gemini-3.5-flash" value={newModel.model_id} onChange={e => setNewModel({ ...newModel, model_id: e.target.value })} />
              <Input placeholder="Version label" value={newModel.label} onChange={e => setNewModel({ ...newModel, label: e.target.value })} />
              <Select value={newModel.slot} onValueChange={v => setNewModel({ ...newModel, slot: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="narrative">Narrative slot</SelectItem><SelectItem value="reasoning">Reasoning slot</SelectItem></SelectContent>
              </Select>
              <Button onClick={addCandidate}>Register candidate</Button>
            </div>
          </TabsContent>

          <TabsContent value="cards" className="grid gap-4 md:grid-cols-2">
            {cards.map(c => (
              <Card key={c.id}>
                <CardHeader><CardTitle className="text-base">{c.model_name}</CardTitle><CardDescription className="font-mono text-xs">{c.model_version} · {c.provider}</CardDescription></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p><strong>Intended use:</strong> {c.intended_use}</p>
                  <div><strong>Capabilities</strong><ul className="list-disc pl-5">{(c.capabilities ?? []).map((x: string) => <li key={x}>{x}</li>)}</ul></div>
                  <div><strong>Out of scope</strong><ul className="list-disc pl-5">{(c.out_of_scope_uses ?? []).map((x: string) => <li key={x}>{x}</li>)}</ul></div>
                  <div><strong>Limitations</strong><ul className="list-disc pl-5">{(c.limitations ?? []).map((x: string) => <li key={x}>{x}</li>)}</ul></div>
                  <p><strong>Performance:</strong> {c.performance_metrics?.status}</p>
                  <p><strong>Bias:</strong> {c.bias_assessment?.status}</p>
                  <p><strong>Ethics:</strong> {c.ethical_considerations}</p>
                  <p className="text-xs text-muted-foreground">Training data: {c.training_data_summary} · Reviewed by: {c.reviewed_by}</p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="prompts" className="space-y-4">
            {preambles.map(p => (
              <div key={p.id} className="border rounded-md p-3">
                <div className="flex gap-2 items-center mb-2"><strong>Safety preamble v{p.version}</strong>{p.is_current && <Badge>Current</Badge>}<span className="text-xs font-mono text-muted-foreground truncate">sha256 {p.preamble_hash.slice(0, 16)}…</span></div>
                <pre className="whitespace-pre-wrap text-xs bg-muted p-2 rounded">{p.preamble_text}</pre>
              </div>
            ))}
            <Table>
              <TableHeader><TableRow><TableHead>Function</TableHead><TableHead>Version</TableHead><TableHead>Model slot</TableHead><TableHead>Status</TableHead><TableHead>Prompt</TableHead></TableRow></TableHeader>
              <TableBody>{prompts.map(p => (
                <TableRow key={p.id}><TableCell className="font-mono text-xs">{p.function_name}</TableCell><TableCell>{p.version}</TableCell><TableCell>{p.model_slot}</TableCell><TableCell><Badge variant="outline">{p.status}</Badge></TableCell><TableCell className="text-xs max-w-md"><details><summary className="cursor-pointer">View</summary><p className="whitespace-pre-wrap mt-1">{p.system_prompt}</p></details></TableCell></TableRow>
              ))}</TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="evals">
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Model</TableHead><TableHead>Result</TableHead><TableHead>Cases</TableHead><TableHead>Schema</TableHead><TableHead>No dosage</TableHead><TableHead>Idiom flags</TableHead></TableRow></TableHeader>
              <TableBody>
                {evals.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No regression runs yet.</TableCell></TableRow>}
                {evals.map(e => (
                  <TableRow key={e.id}>
                    <TableCell className="text-xs">{new Date(e.test_date).toLocaleString("en-AU")}</TableCell>
                    <TableCell className="text-xs font-mono">{models.find(m => m.id === e.model_version_id)?.model_id}</TableCell>
                    <TableCell><Badge variant={e.passed ? "default" : "destructive"}>{e.passed ? "Passed" : "Failed"}</Badge></TableCell>
                    <TableCell>{e.score?.cases}</TableCell><TableCell>{pct(e.score?.schema_rate)}</TableCell><TableCell>{pct(e.score?.no_dosage_rate)}</TableCell><TableCell>{pct(e.score?.idiom_flag_rate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="monitor" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              {(["function_name", "language_of_input", "clinician_id"] as const).map(k => (
                <div key={k} className="border rounded-md p-3">
                  <p className="font-medium text-sm mb-2">Override rate by {k === "function_name" ? "function" : k === "language_of_input" ? "language" : "clinician"}</p>
                  {overrideRate(k).length === 0 ? <p className="text-xs text-muted-foreground">No AI outputs logged yet.</p> :
                    <ul className="text-xs space-y-1">{overrideRate(k).slice(0, 12).map(([name, g]) => (
                      <li key={name} className="flex justify-between gap-2"><span className="truncate font-mono">{k === "clinician_id" ? name.slice(0, 8) : name}</span><span>{pct(g.o / g.n)} of {g.n}</span></li>
                    ))}</ul>}
                </div>
              ))}
            </div>
            <div>
              <p className="font-medium text-sm mb-2">Weekly drift (per language, flagged when &gt;2 SD from 8-week baseline)</p>
              <Table>
                <TableHeader><TableRow><TableHead>Week</TableHead><TableHead>Function</TableHead><TableHead>Language</TableHead><TableHead>Calls</TableHead><TableHead>Avg confidence</TableHead><TableHead>Override</TableHead><TableHead>Error</TableHead><TableHead>Flag</TableHead></TableRow></TableHeader>
                <TableBody>
                  {drift.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">First weekly calculation runs Monday 02:00 UTC.</TableCell></TableRow>}
                  {drift.map(d => (
                    <TableRow key={d.id}>
                      <TableCell className="text-xs">{new Date(d.period_start).toLocaleDateString("en-AU")}</TableCell>
                      <TableCell className="text-xs font-mono">{d.function_name}</TableCell><TableCell>{d.language}</TableCell><TableCell>{d.total_invocations}</TableCell>
                      <TableCell>{pct(d.avg_confidence)}</TableCell><TableCell>{pct(d.override_rate)}</TableCell><TableCell>{pct(d.error_rate)}</TableCell>
                      <TableCell>{d.flagged ? <Badge variant="destructive" title={d.flag_reason}><AlertTriangle className="h-3 w-3 mr-1" />Drift</Badge> : <Badge variant="outline">OK</Badge>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
