"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";

type Theme = "light" | "dark";

const navigation = [
  { href: "/", label: "Dashboard", icon: "home" },
  { href: "/courses", label: "Courses", icon: "book" },
  { href: "/results", label: "Results", icon: "chart" },
  { href: "/carryover", label: "Recovery", icon: "recovery" },
  { href: "/planner", label: "Planner", icon: "calendar" },
  { href: "/notes", label: "Notes", icon: "file" },
  { href: "/study", label: "Study", icon: "study" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function Icon({ name }: { name: string }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (name === "home") {
    return (
      <svg {...common}>
        <path d="m3 10 9-7 9 7" />
        <path d="M5 9v11h14V9" />
        <path d="M9 20v-6h6v6" />
      </svg>
    );
  }

  if (name === "book") {
    return (
      <svg {...common}>
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22V5.5Z" />
        <path d="M4 5.5v13A2.5 2.5 0 0 1 6.5 21H20" />
      </svg>
    );
  }

  if (name === "chart") {
    return (
      <svg {...common}>
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="m7 15 3-4 3 2 5-7" />
      </svg>
    );
  }

  if (name === "recovery") {
    return (
      <svg {...common}>
        <path d="M20 7v5h-5" />
        <path d="M4 17v-5h5" />
        <path d="M6.3 8.8A7 7 0 0 1 20 12" />
        <path d="M17.7 15.2A7 7 0 0 1 4 12" />
      </svg>
    );
  }

  if (name === "calendar") {
    return (
      <svg {...common}>
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M16 2v4M8 2v4M3 9h18" />
      </svg>
    );
  }

  if (name === "file") {
    return (
      <svg {...common}>
        <path d="M6 3h8l4 4v14H6z" />
        <path d="M14 3v5h5" />
        <path d="M9 13h6M9 17h6" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </svg>
  );
}

function ThemeIcon({ theme }: { theme: Theme }) {
  if (theme === "dark") {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.8 6.8 0 0 0 9.8 9.8Z" />
      </svg>
    );
  }

  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
      <path d="M14 5V3h7v18h-7v-2" />
    </svg>
  );
}

function RouteTitle({ pathname }: { pathname: string }) {
  const match = navigation.find((item) => isActive(pathname, item.href));

  if (match) {
    return (
      <div>
        <p className="text-sm font-semibold">{match.label}</p>
        <p className="hidden text-xs text-zinc-500 sm:block">
          Academic operating system
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm font-semibold">REBOOT</p>
      <p className="hidden text-xs text-zinc-500 sm:block">
        Academic operating system
      </p>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const saved = window.localStorage.getItem("reboot-theme");

    if (saved === "light" || saved === "dark") {
      setTheme(saved);
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("reboot-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  };

  const shellSurface =
    theme === "light"
      ? "bg-[#f7f8f9] text-[#17202a]"
      : "bg-[#0b0d10] text-zinc-100";

  const sidebarSurface =
    theme === "light"
      ? "border-black/10 bg-white"
      : "border-white/[0.08] bg-[#101216]";

  const headerSurface =
    theme === "light"
      ? "border-black/10 bg-white/85"
      : "border-white/[0.08] bg-[#0b0d10]/85";

  const mutedText = theme === "light" ? "text-[#68727c]" : "text-zinc-400";

  const hoverSurface =
    theme === "light" ? "hover:bg-black/[0.04]" : "hover:bg-white/[0.05]";

  return (
    <div className={`min-h-screen transition-colors duration-200 ${shellSurface}`}>
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden overflow-y-auto border-r p-4 transition-[width] duration-200 lg:flex lg:flex-col ${sidebarSurface} ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/")}
            aria-label="Go to REBOOT overview"
            className={`flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
              collapsed ? "justify-center" : "px-3"
            }`}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-300 text-sm font-black text-[#101216]">
              R
            </span>

            {!collapsed && (
              <span>
                <span className="block text-sm font-bold tracking-tight">
                  REBOOT
                </span>
                <span className={`block text-[11px] ${mutedText}`}>
                  Academic operating system
                </span>
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setCollapsed((current) => !current)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${mutedText} ${hoverSurface} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300`}
          >
            {collapsed ? "›" : "‹"}
          </button>
        </div>

        <nav aria-label="Primary navigation" className="mt-8 space-y-1">
          {navigation.map((item) => {
            const active = isActive(pathname, item.href);

            return (
              <button
                key={item.href}
                type="button"
                onClick={() => router.push(item.href)}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 w-full items-center gap-3 rounded-xl text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                  collapsed ? "justify-center px-2" : "px-3"
                } ${
                  active
                    ? theme === "light"
                      ? "bg-amber-100 text-amber-900"
                      : "bg-amber-300/10 text-amber-200"
                    : `${mutedText} ${hoverSurface}`
                }`}
              >
                <Icon name={item.icon} />
                {!collapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto pt-4">
          {!collapsed && (
            <div
              className={`mb-3 rounded-xl p-4 ${
                theme === "light" ? "bg-black/[0.04]" : "bg-white/[0.04]"
              }`}
            >
              <p className="text-sm font-semibold">Your academic record</p>
              <p className={`mt-1 text-xs leading-5 ${mutedText}`}>
                Courses, study evidence, and recovery progress stay connected
                here.
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={toggleTheme}
            title={
              collapsed
                ? `Switch to ${theme === "dark" ? "light" : "dark"} mode`
                : undefined
            }
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            className={`flex min-h-11 w-full items-center gap-3 rounded-xl text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
              collapsed ? "justify-center px-2" : "px-3"
            } ${mutedText} ${hoverSurface}`}
          >
            <ThemeIcon theme={theme} />
            {!collapsed && (
              <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            title={collapsed ? "Sign out" : undefined}
            aria-label="Sign out"
            className={`mt-2 flex min-h-11 w-full items-center gap-3 rounded-xl text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 ${
              collapsed ? "justify-center px-2" : "px-3"
            } ${
              theme === "light"
                ? "text-[#7b858e] hover:bg-red-500/10 hover:text-red-600"
                : "text-zinc-500 hover:bg-red-400/10 hover:text-red-200"
            }`}
          >
            <SignOutIcon />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      <div
        className={`pb-20 transition-[padding] duration-200 lg:pb-0 ${
          collapsed ? "lg:pl-20" : "lg:pl-64"
        }`}
      >
        <header
          className={`sticky top-0 z-20 flex min-h-16 items-center justify-between border-b px-5 backdrop-blur lg:px-8 ${headerSurface}`}
        >
          <RouteTitle pathname={pathname} />

          <button
            type="button"
            onClick={() => router.push("/results")}
            className={`min-h-10 rounded-lg px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${mutedText} ${hoverSurface}`}
          >
            Academic record
          </button>
        </header>

        <main className="min-h-[calc(100vh-4rem)]">{children}</main>
      </div>

      <nav
        aria-label="Mobile navigation"
        className={`fixed inset-x-0 bottom-0 z-40 border-t p-2 lg:hidden ${sidebarSurface}`}
      >
        <div className="flex gap-1 overflow-x-auto">
          {navigation.map((item) => {
            const active = isActive(pathname, item.href);

            return (
              <button
                key={item.href}
                type="button"
                onClick={() => router.push(item.href)}
                aria-current={active ? "page" : undefined}
                className={`flex min-w-[76px] shrink-0 flex-col items-center gap-1 rounded-lg px-2 py-2 text-[11px] ${
                  active
                    ? theme === "light"
                      ? "bg-amber-100 text-amber-900"
                      : "bg-amber-300/10 text-amber-200"
                    : mutedText
                }`}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
