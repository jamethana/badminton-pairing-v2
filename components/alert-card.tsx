import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge, type badgeVariants } from "@/components/ui/badge";
import type { VariantProps } from "class-variance-authority";

interface AlertCardProps {
  badgeLabel: string;
  badgeVariant?: VariantProps<typeof badgeVariants>["variant"];
  items: { id: string; label: string; href: string }[];
}

export default function AlertCard({
  badgeLabel,
  badgeVariant = "secondary",
  items,
}: AlertCardProps) {
  if (items.length === 0) return null;

  return (
    <Card className="border border-border bg-accent/60 shadow-sm">
      <CardHeader className="flex flex-row items-center gap-2 px-4 pt-3">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary"
          aria-hidden="true"
        >
          <span className="text-xs font-semibold">●</span>
        </div>
        <Badge variant={badgeVariant} className="text-[11px] font-semibold tracking-wide uppercase">
          {badgeLabel}
        </Badge>
      </CardHeader>
      <CardContent className="px-2 pb-2 pt-1 sm:px-4 sm:pb-4 sm:pt-1.5">
        {items.map((item) => (
          <div key={item.id} className="rounded-md hover:bg-accent/40 focus-within:bg-accent/40">
            <Link
              href={item.href}
              className="flex min-h-[44px] items-center px-2 text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:px-0"
            >
              <span className="truncate">{item.label}</span>
              <span aria-hidden="true" className="ml-1">
                →
              </span>
            </Link>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
