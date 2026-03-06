import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn("rounded bg-gray-200 animate-pulse motion-reduce:animate-none", className)}
    />
  );
}
