import { AlertTriangle, Shield, MessageCircle, ArrowRight, Globe } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CrisisProtocol } from '@/lib/firstaid/crisisProtocols';

interface CrisisProtocolViewProps {
  protocol: CrisisProtocol;
}

export function CrisisProtocolView({ protocol }: CrisisProtocolViewProps) {
  return (
    <ScrollArea className="h-[500px]">
      <div className="space-y-4 pr-4">
        {/* Description */}
        <p className="text-sm text-muted-foreground">{protocol.description}</p>

        {/* Severity Indicators */}
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-4 w-4" />
              Severity Indicators
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {protocol.severityIndicators.map((indicator, i) => (
                <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                  <span className="text-red-400 mt-1">•</span>
                  {indicator}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Immediate Actions */}
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-orange-800">
              <Shield className="h-4 w-4" />
              Immediate Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2">
              {protocol.immediateActions.map((action, i) => (
                <li key={i} className="text-sm text-orange-700 flex items-start gap-2">
                  <Badge variant="outline" className="shrink-0 h-5 w-5 p-0 flex items-center justify-center text-xs border-orange-300">
                    {i + 1}
                  </Badge>
                  {action}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        {/* Safety Steps */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Safety Steps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2">
              {protocol.safetySteps.map((step, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <ArrowRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  {step}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        {/* Communication Tips */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-blue-800">
              <MessageCircle className="h-4 w-4" />
              Communication Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {protocol.communicationTips.map((tip, i) => (
                <li key={i} className="text-sm text-blue-700 flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Cultural Considerations */}
        {protocol.culturalConsiderations && protocol.culturalConsiderations.length > 0 && (
          <Card className="border-purple-200 bg-purple-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-purple-800">
                <Globe className="h-4 w-4" />
                Cultural Considerations (Southern Africa)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {protocol.culturalConsiderations.map((consideration, i) => (
                  <li key={i} className="text-sm text-purple-700 flex items-start gap-2">
                    <span className="text-purple-400 mt-1">•</span>
                    {consideration}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Referral Criteria */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-primary" />
              Referral Criteria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {protocol.referralCriteria.map((criteria, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <Badge variant="outline" className="shrink-0 text-xs">Refer</Badge>
                  {criteria}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
