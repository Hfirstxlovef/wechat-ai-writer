import { prisma } from "./db";
import { normalizeLocale, type Locale } from "./i18n/messages";

export const SETTING_KEYS = {
  ZENMUX_API_KEY: "zenmux_api_key",
  MODEL_TEXT: "model_text",
  MODEL_STYLE: "model_style",
  MODEL_IMAGE: "model_image",
  MODEL_EMBEDDING: "model_embedding",
  LANGUAGE: "ui_language",
} as const;

export const DEFAULTS = {
  [SETTING_KEYS.MODEL_TEXT]: "anthropic/claude-sonnet-4.6",
  [SETTING_KEYS.MODEL_IMAGE]: "openai/gpt-image-2",
  [SETTING_KEYS.MODEL_EMBEDDING]: "openai/text-embedding-3-small",
} as Record<string, string>;

type SettingsMap = Record<string, string>;

let cache: SettingsMap | null = null;

async function loadAll(): Promise<SettingsMap> {
  if (cache) return cache;
  const rows = await prisma.setting.findMany();
  const map: SettingsMap = {};
  for (const r of rows) map[r.key] = r.value;
  cache = map;
  return map;
}

export function invalidateSettingsCache() {
  cache = null;
}

export async function getSetting(key: string): Promise<string | undefined> {
  const all = await loadAll();
  return all[key];
}

export async function getApiKey(): Promise<string> {
  const fromDb = await getSetting(SETTING_KEYS.ZENMUX_API_KEY);
  return fromDb || process.env.ZENMUX_API_KEY || "";
}

export async function getModel(
  taskKey:
    | typeof SETTING_KEYS.MODEL_TEXT
    | typeof SETTING_KEYS.MODEL_IMAGE
    | typeof SETTING_KEYS.MODEL_EMBEDDING
): Promise<string> {
  return (await getSetting(taskKey)) || DEFAULTS[taskKey];
}

/** 当前界面语言，供服务端组件（如 root layout）首屏读取。非法/缺失回退 zh。 */
export async function getLanguage(): Promise<Locale> {
  return normalizeLocale(await getSetting(SETTING_KEYS.LANGUAGE));
}

export async function getAllSettings(): Promise<{
  apiKeyMasked: string | null;
  apiKeySource: "db" | "env" | "none";
  modelText: string;
  modelStyle: string;
  modelImage: string;
  modelEmbedding: string;
  language: Locale;
}> {
  const all = await loadAll();
  const dbKey = all[SETTING_KEYS.ZENMUX_API_KEY];
  const envKey = process.env.ZENMUX_API_KEY;
  const effective = dbKey || envKey || "";
  return {
    apiKeyMasked: effective
      ? effective.length <= 8
        ? "***"
        : `${effective.slice(0, 4)}...${effective.slice(-4)}`
      : null,
    apiKeySource: dbKey ? "db" : envKey ? "env" : "none",
    modelText: all[SETTING_KEYS.MODEL_TEXT] || DEFAULTS[SETTING_KEYS.MODEL_TEXT],
    modelStyle: all[SETTING_KEYS.MODEL_STYLE] || "",
    modelImage: all[SETTING_KEYS.MODEL_IMAGE] || DEFAULTS[SETTING_KEYS.MODEL_IMAGE],
    modelEmbedding:
      all[SETTING_KEYS.MODEL_EMBEDDING] || DEFAULTS[SETTING_KEYS.MODEL_EMBEDDING],
    language: normalizeLocale(all[SETTING_KEYS.LANGUAGE]),
  };
}

export async function upsertSettings(updates: Record<string, string | null>) {
  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === "") {
      await prisma.setting.deleteMany({ where: { key } });
    } else {
      await prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }
  }
  invalidateSettingsCache();
}
