import { useState } from 'react';
import { Plus, GripVertical, X, ThumbsUp, ThumbsDown, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DiagnosisCodeSelector } from './DiagnosisCodeSelector';
import { DiagnosticCode, CONFIDENCE_LEVELS } from '@/lib/diagnosis/diagnosticCodes';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export interface DifferentialDiagnosis {
  id: string;
  code: DiagnosticCode;
  confidence: string;
  evidenceType: 'supporting' | 'refuting' | 'neutral';
  notes?: string;
  rank: number;
}

interface DifferentialDiagnosisListProps {
  framework: 'ICD-11' | 'ICD-10' | 'DSM-5';
  differentials: DifferentialDiagnosis[];
  onChange: (differentials: DifferentialDiagnosis[]) => void;
  maxItems?: number;
}

export function DifferentialDiagnosisList({
  framework,
  differentials,
  onChange,
  maxItems = 5,
}: DifferentialDiagnosisListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const addDifferential = (code: DiagnosticCode) => {
    const newDifferential: DifferentialDiagnosis = {
      id: crypto.randomUUID(),
      code,
      confidence: 'rule_out',
      evidenceType: 'neutral',
      rank: differentials.length + 1,
    };
    onChange([...differentials, newDifferential]);
  };

  const removeDifferential = (id: string) => {
    const updated = differentials
      .filter(d => d.id !== id)
      .map((d, index) => ({ ...d, rank: index + 1 }));
    onChange(updated);
  };

  const updateDifferential = (id: string, updates: Partial<DifferentialDiagnosis>) => {
    onChange(
      differentials.map(d => (d.id === id ? { ...d, ...updates } : d))
    );
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...differentials];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    onChange(updated.map((d, i) => ({ ...d, rank: i + 1 })));
  };

  const moveDown = (index: number) => {
    if (index === differentials.length - 1) return;
    const updated = [...differentials];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    onChange(updated.map((d, i) => ({ ...d, rank: i + 1 })));
  };

  const getEvidenceIcon = (type: DifferentialDiagnosis['evidenceType']) => {
    switch (type) {
      case 'supporting':
        return <ThumbsUp className="h-4 w-4 text-green-600" />;
      case 'refuting':
        return <ThumbsDown className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'definite':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'probable':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'provisional':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rule_out':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-3">
      {/* Differential List */}
      {differentials.map((diff, index) => (
        <div
          key={diff.id}
          className="border rounded-lg p-3 bg-card"
        >
          <div className="flex items-start gap-2">
            {/* Drag Handle & Rank */}
            <div className="flex flex-col items-center gap-1 pt-1">
              <span className="text-xs font-medium text-muted-foreground">#{diff.rank}</span>
              <div className="flex flex-col">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => moveUp(index)}
                  disabled={index === 0}
                >
                  <GripVertical className="h-3 w-3 rotate-90" />
                </Button>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-medium">{diff.code.code}</span>
                  <Badge variant="outline" className={getConfidenceColor(diff.confidence)}>
                    {CONFIDENCE_LEVELS.find(c => c.value === diff.confidence)?.label}
                  </Badge>
                  {getEvidenceIcon(diff.evidenceType)}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => removeDifferential(diff.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <p className="text-sm text-muted-foreground">{diff.code.name}</p>

              {/* Expanded Details */}
              {expandedId === diff.id ? (
                <div className="space-y-3 pt-2 border-t">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium mb-1 block">Confidence</label>
                      <Select
                        value={diff.confidence}
                        onValueChange={(value) => updateDifferential(diff.id, { confidence: value })}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CONFIDENCE_LEVELS.map((level) => (
                            <SelectItem key={level.value} value={level.value}>
                              {level.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block">Evidence</label>
                      <Select
                        value={diff.evidenceType}
                        onValueChange={(value: DifferentialDiagnosis['evidenceType']) => 
                          updateDifferential(diff.id, { evidenceType: value })
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="supporting">Supporting</SelectItem>
                          <SelectItem value="neutral">Neutral</SelectItem>
                          <SelectItem value="refuting">Refuting</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Notes</label>
                    <Textarea
                      value={diff.notes || ''}
                      onChange={(e) => updateDifferential(diff.id, { notes: e.target.value })}
                      placeholder="Clinical notes for this differential..."
                      className="min-h-[60px]"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedId(null)}
                  >
                    Collapse
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => setExpandedId(diff.id)}
                >
                  Edit details
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Add New Differential */}
      {differentials.length < maxItems && (
        <div className="border rounded-lg p-3 border-dashed">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Add Differential Diagnosis
          </p>
          <DiagnosisCodeSelector
            framework={framework}
            onSelect={addDifferential}
            placeholder="Search and add differential..."
          />
        </div>
      )}

      {differentials.length >= maxItems && (
        <p className="text-xs text-muted-foreground text-center">
          Maximum {maxItems} differentials reached
        </p>
      )}
    </div>
  );
}
