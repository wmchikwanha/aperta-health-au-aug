import { useState } from 'react';
import { ArrowRight, Phone, FileText, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { REFERRAL_PATHWAYS } from '@/lib/firstaid/crisisProtocols';

interface ReferralFormProps {
  onSubmit: (referral: {
    type: string;
    destination: string;
    notes: string;
  }) => void | Promise<void>;
  isSaving?: boolean;
}

export function ReferralForm({ onSubmit, isSaving = false }: ReferralFormProps) {
  const [selectedPathway, setSelectedPathway] = useState<string>('');
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    const pathway = REFERRAL_PATHWAYS.find(p => p.id === selectedPathway);
    if (pathway) {
      onSubmit({
        type: pathway.name,
        destination: pathway.contact,
        notes,
      });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ArrowRight className="h-4 w-4" />
          Referral Pathway
        </CardTitle>
        <CardDescription>
          Select appropriate referral destination
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup value={selectedPathway} onValueChange={setSelectedPathway}>
          <div className="space-y-3">
            {REFERRAL_PATHWAYS.map((pathway) => (
              <div
                key={pathway.id}
                className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedPathway === pathway.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-accent'
                }`}
                onClick={() => setSelectedPathway(pathway.id)}
              >
                <RadioGroupItem value={pathway.id} id={pathway.id} className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor={pathway.id} className="font-medium cursor-pointer">
                    {pathway.name}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    {pathway.description}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Phone className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{pathway.contact}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {pathway.criteria.map((c, i) => (
                      <span
                        key={i}
                        className="text-xs bg-muted px-2 py-0.5 rounded"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </RadioGroup>

        <div>
          <Label htmlFor="referral-notes">Referral Notes</Label>
          <Textarea
            id="referral-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Clinical summary, reason for referral, urgency, relevant history..."
            className="min-h-[100px] mt-1"
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!selectedPathway || isSaving}
          className="w-full"
        >
          {isSaving
            ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            : <FileText className="h-4 w-4 mr-2" />}
          {isSaving ? 'Saving...' : 'Document Referral'}
        </Button>
      </CardContent>
    </Card>
  );
}
