import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MBS_MENTAL_HEALTH_ITEMS, type MBSProvider } from "@/lib/mbs/itemCatalogue";
import { Info, Video } from "lucide-react";

const PROVIDERS: (MBSProvider | "All")[] = [
  "All",
  "GP",
  "Psychiatrist",
  "Clinical Psychologist",
  "Other Psychologist",
  "Eligible Allied Mental Health",
  "Eligible Aboriginal & Torres Strait Islander Health Worker",
];

const AUD = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" });

export const MBSItemCatalogue = () => {
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState<MBSProvider | "All">("All");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MBS_MENTAL_HEALTH_ITEMS.filter(item => {
      if (provider !== "All" && item.provider !== provider) return false;
      if (!q) return true;
      return (
        item.itemNumber.includes(q) ||
        item.shortName.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.notes.toLowerCase().includes(q)
      );
    });
  }, [query, provider]);

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Medicare Benefits Schedule — Mental Health</CardTitle>
          <CardDescription>
            Better Access initiative and related MBS items used in refugee / CALD mental-health workflows.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Rebates are <strong>indicative</strong> (MBS schedule as at 1 March 2026 indexation).
              Always confirm against MBS Online (health.gov.au/mbs) before billing. No automated
              rebate lookup is performed.
            </AlertDescription>
          </Alert>

          <div className="flex flex-col md:flex-row gap-3">
            <Input
              placeholder="Search item number, name, description…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="md:flex-1"
            />
            <Select value={provider} onValueChange={(v) => setProvider(v as any)}>
              <SelectTrigger className="md:w-[320px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROVIDERS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[90px]">Item</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[180px]">Provider</TableHead>
                  <TableHead className="w-[110px] text-right">Rebate</TableHead>
                  <TableHead className="w-[90px]">Telehealth</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(item => (
                  <TableRow key={item.itemNumber}>
                    <TableCell className="font-mono font-semibold">{item.itemNumber}</TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{item.shortName}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{item.description}</div>
                      {item.notes && (
                        <div className="text-xs text-muted-foreground italic mt-1">{item.notes}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{item.provider}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {AUD.format(item.rebateAUD)}
                    </TableCell>
                    <TableCell>
                      {item.telehealthAvailable ? (
                        <Badge variant="secondary" className="gap-1"><Video className="h-3 w-3" />Yes</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">No</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8 text-sm">
                      No items match this filter.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MBSItemCatalogue;
