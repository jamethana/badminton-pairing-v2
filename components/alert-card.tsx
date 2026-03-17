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
    <Card className="border border-border bg-card">
      <CardHeader className="flex flex-row items-center gap-2 px-4 pt-4">
        <Badge variant={badgeVariant} className="text-xs font-semibold">
          {badgeLabel}
        </Badge>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-2">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="block text-sm font-semibold text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {item.label} →
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
