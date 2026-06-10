import { useState, useMemo } from 'react';
import { Search, ChevronRight, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DiagnosticCode,
  searchDiagnosticCodes,
  getCommonDiagnoses,
  DIAGNOSTIC_CATEGORIES,
  ICD11_CODES,
  ICD10_CODES,
  DSM5_CODES,
} from '@/lib/diagnosis/diagnosticCodes';

interface DiagnosisCodeSelectorProps {
  framework: 'ICD-11' | 'ICD-10' | 'DSM-5';
  selectedCode?: DiagnosticCode;
  onSelect: (code: DiagnosticCode) => void;
  placeholder?: string;
}

export function DiagnosisCodeSelector({
  framework,
  selectedCode,
  onSelect,
  placeholder = 'Select diagnosis code...',
}: DiagnosisCodeSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const codes = framework === 'ICD-10' ? ICD10_CODES : framework === 'ICD-11' ? ICD11_CODES : DSM5_CODES;
  const commonDiagnoses = useMemo(() => getCommonDiagnoses(framework), [framework]);

  const filteredCodes = useMemo(() => {
    if (searchQuery) {
      return searchDiagnosticCodes(searchQuery, framework);
    }
    if (selectedCategory) {
      return codes.filter(c => c.category === selectedCategory);
    }
    return [];
  }, [searchQuery, selectedCategory, framework, codes]);

  const categories = useMemo(() => {
    return [...new Set(codes.map(c => c.category))];
  }, [codes]);

  const handleSelect = (code: DiagnosticCode) => {
    onSelect(code);
    setOpen(false);
    setSearchQuery('');
    setSelectedCategory(null);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-auto min-h-10 py-2"
        >
          {selectedCode ? (
            <div className="flex flex-col items-start text-left">
              <span className="font-medium">{selectedCode.code}</span>
              <span className="text-xs text-muted-foreground truncate max-w-[300px]">
                {selectedCode.name}
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronRight className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by code or name..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedCategory(null);
              }}
              className="pl-8"
            />
          </div>
        </div>

        <ScrollArea className="h-[350px]">
          {!searchQuery && !selectedCategory && (
            <>
              {/* Common Diagnoses */}
              <div className="p-2">
                <p className="text-xs font-medium text-muted-foreground px-2 py-1">
                  Common Diagnoses
                </p>
                {commonDiagnoses.map((code) => (
                  <button
                    key={code.code}
                    onClick={() => handleSelect(code)}
                    className="w-full text-left px-2 py-2 hover:bg-accent rounded-md flex items-center justify-between group"
                  >
                    <div>
                      <span className="font-mono text-sm font-medium">{code.code}</span>
                      <span className="text-sm text-muted-foreground ml-2">{code.name}</span>
                    </div>
                    {selectedCode?.code === code.code && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </button>
                ))}
              </div>

              {/* Categories */}
              <div className="p-2 border-t">
                <p className="text-xs font-medium text-muted-foreground px-2 py-1">
                  Browse by Category
                </p>
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className="w-full text-left px-2 py-2 hover:bg-accent rounded-md flex items-center justify-between"
                  >
                    <span className="text-sm">{category}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Category Results */}
          {selectedCategory && !searchQuery && (
            <div className="p-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className="text-xs text-primary hover:underline mb-2 px-2"
              >
                ← Back to categories
              </button>
              <p className="text-xs font-medium text-muted-foreground px-2 py-1">
                {selectedCategory}
              </p>
              {filteredCodes.map((code) => (
                <button
                  key={code.code}
                  onClick={() => handleSelect(code)}
                  className="w-full text-left px-2 py-2 hover:bg-accent rounded-md flex items-center justify-between"
                >
                  <div className="flex-1 min-w-0">
                    <span className="font-mono text-sm font-medium">{code.code}</span>
                    <p className="text-sm text-muted-foreground truncate">{code.name}</p>
                  </div>
                  {selectedCode?.code === code.code && (
                    <Check className="h-4 w-4 text-primary shrink-0 ml-2" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Search Results */}
          {searchQuery && (
            <div className="p-2">
              {filteredCodes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No diagnoses found for "{searchQuery}"
                </p>
              ) : (
                <>
                  <p className="text-xs font-medium text-muted-foreground px-2 py-1">
                    {filteredCodes.length} result{filteredCodes.length !== 1 ? 's' : ''}
                  </p>
                  {filteredCodes.map((code) => (
                    <button
                      key={code.code}
                      onClick={() => handleSelect(code)}
                      className="w-full text-left px-2 py-2 hover:bg-accent rounded-md flex items-center justify-between"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-medium">{code.code}</span>
                          <Badge variant="outline" className="text-xs">
                            {code.category}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{code.name}</p>
                      </div>
                      {selectedCode?.code === code.code && (
                        <Check className="h-4 w-4 text-primary shrink-0 ml-2" />
                      )}
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
