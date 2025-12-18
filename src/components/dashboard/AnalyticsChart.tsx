import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
export function AnalyticsChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Enrollment Evolution</CardTitle>
      </CardHeader>
      <CardContent className="h-48 flex items-center justify-center text-muted-foreground">
        [Enrollment chart (mock)]
      </CardContent>
    </Card>
  );
}
