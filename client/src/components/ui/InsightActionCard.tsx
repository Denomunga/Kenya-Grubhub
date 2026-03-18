import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, AlertCircle, Info, CheckCircle, ArrowRight, LucideIcon } from 'lucide-react';

export type InsightSeverity = 'critical' | 'warning' | 'info' | 'success';

export interface InsightAction {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'destructive';
  icon?: LucideIcon;
}

export interface InsightItem {
  id: string;
  severity: InsightSeverity;
  title: string;
  metric: string | number;
  description: string;
  action: InsightAction;
}

interface InsightActionCardProps {
  insights: InsightItem[];
  title?: string;
}

const severityConfig: Record<InsightSeverity, {
  icon: LucideIcon;
  bg: string;
  border: string;
  iconColor: string;
  titleColor: string;
  descColor: string;
  metricColor: string;
  pulse: boolean;
}> = {
  critical: {
    icon: AlertTriangle,
    bg: 'bg-red-50',
    border: 'border-red-200',
    iconColor: 'text-red-600',
    titleColor: 'text-red-800',
    descColor: 'text-red-600',
    metricColor: 'text-red-700',
    pulse: true,
  },
  warning: {
    icon: AlertCircle,
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    iconColor: 'text-amber-600',
    titleColor: 'text-amber-800',
    descColor: 'text-amber-600',
    metricColor: 'text-amber-700',
    pulse: false,
  },
  info: {
    icon: Info,
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    iconColor: 'text-blue-600',
    titleColor: 'text-blue-800',
    descColor: 'text-blue-600',
    metricColor: 'text-blue-700',
    pulse: false,
  },
  success: {
    icon: CheckCircle,
    bg: 'bg-green-50',
    border: 'border-green-200',
    iconColor: 'text-green-600',
    titleColor: 'text-green-800',
    descColor: 'text-green-600',
    metricColor: 'text-green-700',
    pulse: false,
  },
};

export function InsightActionCard({ insights, title = 'Action Required' }: InsightActionCardProps) {
  if (insights.length === 0) return null;

  return (
    <Card className="border-l-4 border-l-orange-400 shadow-md">
      <CardContent className="pt-4 pb-3">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          {title}
        </h3>
        <div className="space-y-3">
          {insights.map((insight) => {
            const config = severityConfig[insight.severity];
            const SeverityIcon = config.icon;
            const ActionIcon = insight.action.icon;

            return (
              <div
                key={insight.id}
                className={`flex items-center justify-between gap-4 p-3 rounded-lg ${config.bg} ${config.border} border`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`shrink-0 ${config.pulse ? 'animate-pulse' : ''}`}>
                    <SeverityIcon className={`h-5 w-5 ${config.iconColor}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-semibold ${config.titleColor}`}>
                        {insight.title}
                      </span>
                      <span className={`text-lg font-bold ${config.metricColor}`}>
                        {insight.metric}
                      </span>
                    </div>
                    <p className={`text-xs ${config.descColor} mt-0.5`}>
                      {insight.description}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={insight.action.variant || (insight.severity === 'critical' ? 'destructive' : 'default')}
                  onClick={insight.action.onClick}
                  className="shrink-0 whitespace-nowrap"
                >
                  {ActionIcon && <ActionIcon className="h-4 w-4 mr-1.5" />}
                  {insight.action.label}
                  <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default InsightActionCard;
