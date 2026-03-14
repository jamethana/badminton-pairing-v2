import { Skeleton } from "@/components/ui/skeleton";

export default function LoginLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-8 text-center">
          <Skeleton className="mx-auto mb-4 h-16 w-16 rounded-full" />
          <Skeleton className="mx-auto h-7 w-44" />
          <Skeleton className="mx-auto mt-2 h-4 w-64" />
        </div>
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="mx-auto mt-4 h-3 w-56" />
      </div>
    </div>
  );
}
