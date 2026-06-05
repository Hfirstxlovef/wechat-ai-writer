"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { FileText, FolderOpen, BookOpen, Settings } from "lucide-react";

const navItems = [
  { href: "/", labelKey: "nav.articles", icon: FileText },
  { href: "/categories", labelKey: "nav.categories", icon: FolderOpen },
  { href: "/style-library", labelKey: "nav.styleLibrary", icon: BookOpen },
  { href: "/settings", labelKey: "nav.settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useT();
  return (
    <div className="flex h-screen bg-white">
      <aside className="w-56 bg-wechat-bg border-r border-wechat-border flex flex-col">
        <div className="px-4 py-3 border-b border-wechat-border flex items-center gap-2.5">
          <img
            src="/hongan.png"
            alt={t("nav.logoAlt")}
            className="w-10 h-8 object-contain flex-shrink-0"
          />
          <div className="min-w-0">
            <div className="font-semibold text-wechat-text leading-tight">{t("nav.appTitle")}</div>
            <div className="text-[10px] text-wechat-text-tertiary leading-tight">{t("nav.appSubtitle")}</div>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/" || pathname.startsWith("/editor")
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  active
                    ? "bg-wechat-green-light text-wechat-green font-medium"
                    : "text-wechat-text hover:bg-white"
                )}
              >
                <Icon className="w-4 h-4" />
                {t(item.labelKey)}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 text-xs text-wechat-text-tertiary border-t border-wechat-border">
          {t("nav.footer")}
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
