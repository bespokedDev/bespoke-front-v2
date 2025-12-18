import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const colorClasses = {
  primary: "text-primary",
  secondary: "text-secondary",
  "accent-1": "text-accent-1",
  "accent-2": "text-accent-2",
} as const;

export function SummaryCard({
  title,
  count,
  color,
}: {
  title: string;
  count: number;
  color: keyof typeof colorClasses;
}) {
  return (
    <Card>
      <CardContent className="flex items-center p-6 gap-3">
        <div className="flex-shrink-0">
          <p className={cn("text-4xl font-bold", colorClasses[color])}>
            {count}
          </p>
        </div>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground leading-tight line-clamp-2 font-semibold">
            {title}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
