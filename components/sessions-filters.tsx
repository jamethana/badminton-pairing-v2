"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type SessionCreator = {
  id: string;
  display_name: string;
};

interface Props {
  creators: SessionCreator[];
  initialCreatedBy: string;
  initialStatus: string;
  initialName: string;
  initialLocation: string;
}

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
] as const;

export default function SessionsFilters({
  creators,
  initialCreatedBy,
  initialStatus,
  initialName,
  initialLocation,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [name, setName] = useState(initialName);
  const [location, setLocation] = useState(initialLocation);
  const nameDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locationDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep local state in sync if searchParams change externally (e.g. browser back)
  useEffect(() => {
    setName(searchParams.get("name") ?? "");
  }, [searchParams]);
  useEffect(() => {
    setLocation(searchParams.get("location") ?? "");
  }, [searchParams]);

  const buildUrl = useCallback(
    (overrides: Record<string, string>) => {
      const params = new URLSearchParams();
      const current: Record<string, string> = {
        created_by: searchParams.get("created_by") ?? "",
        status: searchParams.get("status") ?? "",
        name: name,
        location: location,
        ...overrides,
      };
      for (const [key, val] of Object.entries(current)) {
        if (val.trim()) params.set(key, val.trim());
      }
      const qs = params.toString();
      return `/moderator/sessions${qs ? `?${qs}` : ""}`;
    },
    [searchParams, name, location]
  );

  const hasFilters =
    !!searchParams.get("created_by") ||
    !!searchParams.get("status") ||
    !!(searchParams.get("name") ?? "").trim() ||
    !!(searchParams.get("location") ?? "").trim();

  function handleSelectChange(key: "created_by" | "status", value: string) {
    router.push(buildUrl({ [key]: value === "all" ? "" : value }));
  }

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setName(val);
    if (nameDebounceRef.current) clearTimeout(nameDebounceRef.current);
    nameDebounceRef.current = setTimeout(() => {
      router.push(buildUrl({ name: val }));
    }, 300);
  }

  function handleLocationChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setLocation(val);
    if (locationDebounceRef.current) clearTimeout(locationDebounceRef.current);
    locationDebounceRef.current = setTimeout(() => {
      router.push(buildUrl({ location: val }));
    }, 300);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    router.push(buildUrl({}));
  }

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      aria-label="Filter sessions"
      className="mb-4 flex flex-wrap gap-2"
    >
      {/* Created by */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="filter-created-by"
          className="text-xs font-medium text-gray-600"
        >
          Created by
        </label>
        <Select
          value={searchParams.get("created_by") ?? "all"}
          onValueChange={(val) => handleSelectChange("created_by", val)}
        >
          <SelectTrigger
            id="filter-created-by"
            size="sm"
            className="w-40"
            aria-label="Created by"
          >
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {creators.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* State */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="filter-status"
          className="text-xs font-medium text-gray-600"
        >
          State
        </label>
        <Select
          value={searchParams.get("status") ?? "all"}
          onValueChange={(val) => handleSelectChange("status", val)}
        >
          <SelectTrigger
            id="filter-status"
            size="sm"
            className="w-36"
            aria-label="State"
          >
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Name */}
      <div className="flex flex-col gap-1">
        <label htmlFor="filter-name" className="text-xs font-medium text-gray-600">
          Name
        </label>
        <Input
          id="filter-name"
          name="name"
          type="search"
          value={name}
          onChange={handleNameChange}
          placeholder="Filter by name…"
          className="h-8 w-44 text-sm"
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      {/* Location */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="filter-location"
          className="text-xs font-medium text-gray-600"
        >
          Location
        </label>
        <Input
          id="filter-location"
          name="location"
          type="search"
          value={location}
          onChange={handleLocationChange}
          placeholder="Filter by location…"
          className="h-8 w-44 text-sm"
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      {/* Clear filters — rendered as a Link so Cmd/Ctrl+click works */}
      {hasFilters && (
        <div className="flex flex-col justify-end">
          <Link
            href="/moderator/sessions"
            className="inline-flex h-8 items-center rounded-md border border-input bg-transparent px-3 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Clear filters
          </Link>
        </div>
      )}
    </form>
  );
}
