import type { Metadata } from "next";
import "./globals.css";
import { getLanguage } from "@/lib/settings";
import { LanguageProvider } from "@/lib/i18n";
import { translate } from "@/lib/i18n/messages";

// 首屏需读取数据库里的语言设置，故强制动态渲染
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLanguage();
  return {
    title: translate(locale, "meta.title"),
    description: translate(locale, "meta.description"),
    icons: {
      icon: "/hongan.png",
      shortcut: "/hongan.png",
      apple: "/hongan.png",
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLanguage();
  return (
    <html lang={locale === "en" ? "en" : "zh-CN"}>
      <body className="font-sans antialiased bg-wechat-bg text-wechat-text">
        <LanguageProvider initialLocale={locale}>{children}</LanguageProvider>
      </body>
    </html>
  );
}
