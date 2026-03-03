"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavBarProps {
  isModerator: boolean;
  displayName: string;
  pictureUrl?: string | null;
}

export default function NavBar({ isModerator, displayName, pictureUrl }: NavBarProps) {
  const pathname = usePathname();

  const modLinks = [
    { href: "/moderator", label: "Dashboard" },
    { href: "/moderator/sessions", label: "Sessions" },
    { href: "/moderator/players", label: "Players" },
  ];

  const playerLinks = [
    { href: "/", label: "Home" },
    { href: "/stats", label: "My Stats" },
  ];

  const links = isModerator ? modLinks : playerLinks;

  return (
    <nav className="sticky top-0 z-40 border-b bg-white shadow-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href={isModerator ? "/moderator" : "/"} className="flex items-center gap-2">
            <span className="text-lg font-bold text-green-700">🏸 Badminton</span>
          </Link>
          <div className="hidden items-center gap-4 sm:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-sm font-medium transition-colors",
                  pathname === link.href || pathname.startsWith(link.href + "/")
                    ? "text-green-700"
                    : "text-gray-500 hover:text-gray-800"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {pictureUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={pictureUrl} alt={displayName} className="h-8 w-8 rounded-full" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-sm font-bold text-green-700">
                {displayName.charAt(0)}
              </div>
            )}
            <span className="hidden text-sm font-medium text-gray-700 sm:block">{displayName}</span>
            {isModerator && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                Mod
              </span>
            )}
          </div>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="rounded-lg border px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>

      {/* Mobile nav */}
      <div className="flex border-t sm:hidden">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex-1 py-2 text-center text-xs font-medium",
              pathname === link.href || pathname.startsWith(link.href + "/")
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
