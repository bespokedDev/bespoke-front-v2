import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, subtitle, className, children }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <h1 className="text-xl sm:text-2xl font-bold leading-tight">{title}</h1>
      {subtitle && <p className="text-muted-foreground text-sm font-semibold">{subtitle}</p>}
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
}
