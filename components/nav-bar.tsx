"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import ProfileMenu from "@/components/profile-menu";
import type { ViewAs } from "@/lib/view-as";

interface NavBarProps {
  isModerator: boolean;
  displayName: string;
  pictureUrl?: string | null;
  viewAs?: ViewAs | null;
}

export default function NavBar({ isModerator, displayName, pictureUrl, viewAs }: NavBarProps) {
  const pathname = usePathname();

  // Compute the effective view: moderator paths always show moderator nav.
  // Moderators with view_as=player see the player nav on non-moderator pages.
  const effectiveView: "player" | "moderator" =
    pathname.startsWith("/moderator") && isModerator
      ? "moderator"
      : isModerator && viewAs === "player"
        ? "player"
        : isModerator
          ? "moderator"
          : "player";

  const modLinks = [
    { href: "/moderator", label: "Dashboard" },
    { href: "/moderator/sessions", label: "Sessions" },
    { href: "/moderator/players", label: "Players" },
  ];

  const playerLinks = [
    { href: "/", label: "Home" },
    { href: "/stats", label: "My Stats" },
  ];

  const links = effectiveView === "moderator" ? modLinks : playerLinks;

  return (
    <nav className="sticky top-0 z-40 border-b bg-white shadow-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href={effectiveView === "moderator" ? "/moderator" : "/"} className="flex items-center gap-2">
            <span className="text-lg font-bold text-green-700">Japkoo</span>
          </Link>
          <div className="hidden items-center gap-4 sm:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-sm font-medium transition-colors",
                  effectiveView === "moderator" && link.href === "/moderator"
                    ? pathname === "/moderator"
                      ? "text-green-700"
                      : "text-gray-500 hover:text-gray-800"
                    : pathname === link.href || pathname.startsWith(link.href + "/")
                      ? "text-green-700"
                      : "text-gray-500 hover:text-gray-800"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <ProfileMenu
          displayName={displayName}
          pictureUrl={pictureUrl}
          isModerator={isModerator}
          effectiveView={effectiveView}
        />
      </div>

      {/* Mobile nav */}
      <div className="flex border-t sm:hidden">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex-1 py-2 text-center text-xs font-medium",
              effectiveView === "moderator" && link.href === "/moderator"
                ? pathname === "/moderator"
                  ? "border-b-2 border-green-600 text-green-700"
                  : "text-gray-500"
                : pathname === link.href || pathname.startsWith(link.href + "/")
                  ? "border-b-2 border-green-600 text-green-700"
                  : "text-gray-500"
            )}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
