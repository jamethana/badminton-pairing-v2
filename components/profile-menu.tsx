"use client";

import Link from "next/link";
import { useTransition } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { switchViewAs } from "@/app/actions/view-as";
import { signOut } from "@/app/actions/auth";

interface ProfileMenuProps {
  displayName: string;
  pictureUrl?: string | null;
  isModerator: boolean;
  effectiveView: "player" | "moderator";
}

export default function ProfileMenu({
  displayName,
  pictureUrl,
  isModerator,
  effectiveView,
}: ProfileMenuProps) {
  const [isPending, startTransition] = useTransition();

  const handleSwitchView = () => {
    startTransition(() => {
      switchViewAs(effectiveView === "moderator" ? "player" : "moderator");
    });
  };

  const handleSignOut = () => {
    startTransition(() => {
      signOut();
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
          aria-label="Profile menu"
          disabled={isPending}
        >
          {pictureUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pictureUrl}
              alt={displayName}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-sm font-bold text-green-700">
              {displayName.charAt(0)}
            </div>
          )}
          <span className="hidden text-sm font-medium text-gray-700 sm:block">
            {displayName}
          </span>
          {isModerator && effectiveView === "moderator" && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
              Mod
            </span>
          )}
          {isModerator && effectiveView === "player" && (
            <span className="rounded-full border border-amber-400 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
              Player view
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs font-normal text-gray-500">
          Signed in as {displayName}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile" className="cursor-pointer">
            Edit profile
          </Link>
        </DropdownMenuItem>
        {isModerator && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={handleSwitchView}
              className="cursor-pointer"
              disabled={isPending}
            >
              {effectiveView === "moderator"
                ? "Switch to player view"
                : "Switch to moderator view"}
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={handleSignOut}
          className="cursor-pointer text-red-600 focus:text-red-600"
          disabled={isPending}
        >
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
