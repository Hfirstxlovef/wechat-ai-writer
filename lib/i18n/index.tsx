"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { apiSend } from "@/lib/api";
import {
  DEFAULT_LOCALE,
  translate,
  type Locale,
} from "./messages";

export type { Locale };
export { translate, DEFAULT_LOCALE, normalizeLocale } from "./messages";

type Params = Record<string, string | number>;
type TFunc = (key: string, params?: Params) => string;

type LanguageCtx = {
  locale: Locale;
  t: TFunc;
  setLocale: (next: Locale) => void;
};

const LanguageContext = createContext<LanguageCtx | null>(null);

export function LanguageProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    if (typeof document !== "undefined") {
      document.documentElement.lang = next === "en" ? "en" : "zh-CN";
    }
    // 持久化到数据库；失败不回滚（本地单用户场景，下次刷新会以 DB 为准）
    apiSend("/api/settings", "PUT", { language: next }).catch(() => {});
  }, []);

  const t = useCallback<TFunc>(
    (key, params) => translate(locale, key, params),
    [locale]
  );

  return (
    <LanguageContext.Provider value={{ locale, t, setLocale }}>
      {children}
    </LanguageContext.Provider>
  );
}

/** 取当前语言上下文。若不在 Provider 内（理论上不会发生），回退默认语言而非崩溃。 */
export function useT(): LanguageCtx {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    return {
      locale: DEFAULT_LOCALE,
      t: (key, params) => translate(DEFAULT_LOCALE, key, params),
      setLocale: () => {},
    };
  }
  return ctx;
}
