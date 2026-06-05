"use client";

import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { apiGet, apiSend } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { Loader2, Save, RefreshCw, Eye, EyeOff, Check, Search, X } from "lucide-react";

type Settings = {
  apiKeyMasked: string | null;
  apiKeySource: "db" | "env" | "none";
  modelText: string;
  modelStyle: string;
  modelImage: string;
  modelEmbedding: string;
  language: "zh" | "en";
};

type Modality = "text" | "image" | "video" | "audio" | "embedding";

type ModelItem = {
  id: string;
  display_name?: string;
  owned_by?: string;
  endpoint?: "openai" | "vertex" | "both";
  input_modalities?: string[];
  output_modalities?: string[];
  capabilities?: Record<string, boolean>;
  context_length?: number;
};

function classifyModality(m: ModelItem): Modality {
  const out = new Set(m.output_modalities ?? []);
  if (out.has("image")) return "image";
  if (out.has("video")) return "video";
  if (out.has("audio")) return "audio";
  if (out.has("embedding")) return "embedding";
  const idLower = m.id.toLowerCase();
  if (
    idLower.includes("embedding") ||
    idLower.includes("embed") ||
    m.capabilities?.embedding
  ) {
    return "embedding";
  }
  return "text";
}

const MODALITY_TABS: ("all" | Modality)[] = [
  "all",
  "text",
  "image",
  "video",
  "audio",
  "embedding",
];

export default function SettingsPage() {
  const { t, locale, setLocale } = useT();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [modelText, setModelText] = useState("");
  const [modelStyle, setModelStyle] = useState("");
  const [modelImage, setModelImage] = useState("");
  const [modelEmbedding, setModelEmbedding] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [models, setModels] = useState<ModelItem[] | null>(null);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsErr, setModelsErr] = useState<string | null>(null);

  const load = async () => {
    const s = await apiGet<Settings>("/api/settings");
    setSettings(s);
    setModelText(s.modelText);
    setModelStyle(s.modelStyle ?? "");
    setModelImage(s.modelImage);
    setModelEmbedding(s.modelEmbedding);
  };
  useEffect(() => {
    load();
  }, []);

  const refreshModels = async () => {
    setModelsLoading(true);
    setModelsErr(null);
    try {
      const r = await apiGet<{ models: ModelItem[] }>("/api/zenmux/models");
      setModels(r.models);
    } catch (e: any) {
      setModelsErr(e.message);
    } finally {
      setModelsLoading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setSaved(false);
    setErr(null);
    try {
      const payload: Record<string, string> = {
        modelText,
        modelStyle,
        modelImage,
        modelEmbedding,
      };
      if (apiKey.trim()) payload.apiKey = apiKey.trim();
      const fresh = await apiSend<Settings>("/api/settings", "PUT", payload);
      setSettings(fresh);
      setApiKey("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const clearKey = async () => {
    if (!confirm(t("settings.confirmClearKey"))) return;
    setSaving(true);
    try {
      const fresh = await apiSend<Settings>("/api/settings", "PUT", { apiKey: null });
      setSettings(fresh);
    } finally {
      setSaving(false);
    }
  };

  const filteredModels = models;

  const sourceLabel =
    settings?.apiKeySource === "db"
      ? t("settings.sourceDb")
      : settings?.apiKeySource === "env"
        ? t("settings.sourceEnv")
        : t("settings.sourceNone");

  return (
    <AppShell>
      <div className="p-8 max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold mb-1">{t("settings.title")}</h1>
        <p className="text-sm text-wechat-text-secondary mb-6">
          {t("settings.subtitle")}
        </p>

        <section className="bg-white border border-wechat-border rounded-lg p-5 mb-5">
          <h2 className="font-medium mb-1">{t("settings.language")}</h2>
          <p className="text-xs text-wechat-text-secondary mb-3">
            {t("settings.languageHint")}
          </p>
          <div className="flex gap-2">
            {(
              [
                ["zh", "中文"],
                ["en", "English"],
              ] as const
            ).map(([code, label]) => (
              <button
                key={code}
                type="button"
                onClick={() => setLocale(code)}
                className={cn(
                  "px-4 py-2 rounded-md text-sm border transition-colors inline-flex items-center gap-2",
                  locale === code
                    ? "bg-wechat-green text-white border-wechat-green"
                    : "border-wechat-border text-wechat-text hover:bg-wechat-bg"
                )}
              >
                {locale === code && <Check className="w-4 h-4" />}
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className="bg-white border border-wechat-border rounded-lg p-5 mb-5">
          <h2 className="font-medium mb-3">{t("settings.apiKey")}</h2>
          {settings && (
            <div className="text-xs text-wechat-text-secondary mb-3">
              {t("settings.currentEffective")}
              {settings.apiKeyMasked ? (
                <>
                  <code className="bg-wechat-bg px-1.5 py-0.5 rounded ml-1">
                    {settings.apiKeyMasked}
                  </code>
                  <span className="ml-2 text-wechat-text-tertiary">
                    {t("settings.sourcePrefix", { source: sourceLabel })}
                  </span>
                </>
              ) : (
                <span className="text-destructive ml-1">{t("settings.notConfigured")}</span>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={t("settings.apiKeyPlaceholder")}
                className="w-full px-3 py-2 pr-10 border border-wechat-border rounded text-sm focus:outline-none focus:border-wechat-green font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-wechat-text-tertiary hover:text-wechat-text"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {settings?.apiKeySource === "db" && (
              <button
                onClick={clearKey}
                className="px-3 py-2 text-sm text-destructive hover:bg-red-50 rounded border border-wechat-border"
              >
                {t("settings.clearDbKey")}
              </button>
            )}
          </div>
        </section>

        <section className="bg-white border border-wechat-border rounded-lg p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium">{t("settings.modelSelection")}</h2>
            <button
              onClick={refreshModels}
              disabled={modelsLoading}
              className="text-sm text-wechat-link hover:underline disabled:opacity-50 flex items-center gap-1"
            >
              {modelsLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              {models ? t("settings.refetch") : t("settings.fetchModels")}
            </button>
          </div>
          {modelsErr && (
            <div className="text-xs text-destructive bg-red-50 border border-red-200 rounded px-3 py-2 mb-3">
              {modelsErr}
            </div>
          )}

          <div className="space-y-4">
            <ModelPicker
              label={t("settings.modelText")}
              hint={t("settings.modelTextHint")}
              value={modelText}
              onChange={setModelText}
              suggestions={filteredModels}
              defaultModality="text"
            />
            <ModelPicker
              label={t("settings.modelStyle")}
              hint={t("settings.modelStyleHint")}
              value={modelStyle}
              onChange={setModelStyle}
              suggestions={filteredModels}
              defaultModality="text"
            />
            <ModelPicker
              label={t("settings.modelImage")}
              hint={t("settings.modelImageHint")}
              value={modelImage}
              onChange={setModelImage}
              suggestions={filteredModels}
              defaultModality="image"
            />
            <ModelPicker
              label={t("settings.modelEmbedding")}
              hint={t("settings.modelEmbeddingHint")}
              value={modelEmbedding}
              onChange={setModelEmbedding}
              suggestions={filteredModels}
              defaultModality="embedding"
            />
          </div>
        </section>

        {err && (
          <div className="text-sm text-destructive bg-red-50 border border-red-200 rounded px-3 py-2 mb-3">
            {err}
          </div>
        )}
        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="bg-wechat-green text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-wechat-green-dark disabled:opacity-50 inline-flex items-center gap-2"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <Check className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saved ? t("settings.saved") : t("settings.saveSettings")}
          </button>
          <span className="text-xs text-wechat-text-tertiary">
            {t("settings.saveHint")}
          </span>
        </div>
      </div>
    </AppShell>
  );
}

function ModelPicker({
  label,
  hint,
  value,
  onChange,
  suggestions,
  defaultModality,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  suggestions: ModelItem[] | null;
  defaultModality?: Modality;
}) {
  const { t } = useT();
  const [showList, setShowList] = useState(false);
  const [query, setQuery] = useState("");
  const [modalityTab, setModalityTab] = useState<"all" | Modality>(
    defaultModality ?? "all"
  );
  const searchRef = useRef<HTMLInputElement | null>(null);

  // 按 modality 分桶用于 tab 计数
  const counts: Record<"all" | Modality, number> = {
    all: 0,
    text: 0,
    image: 0,
    video: 0,
    audio: 0,
    embedding: 0,
  };
  if (suggestions) {
    counts.all = suggestions.length;
    for (const m of suggestions) {
      counts[classifyModality(m)]++;
    }
  }

  const filtered = (() => {
    if (!suggestions) return [];
    let pool = suggestions;
    if (modalityTab !== "all") {
      pool = pool.filter((m) => classifyModality(m) === modalityTab);
    }
    const q = query.trim().toLowerCase();
    if (!q) return pool;
    return pool.filter(
      (m) =>
        m.id.toLowerCase().includes(q) ||
        (m.owned_by ?? "").toLowerCase().includes(q) ||
        (m.endpoint ?? "").toLowerCase().includes(q) ||
        (m.display_name ?? "").toLowerCase().includes(q)
    );
  })();

  const openList = () => {
    setShowList(true);
    setTimeout(() => searchRef.current?.focus(), 0);
  };

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <label className="text-sm font-medium text-wechat-text">{label}</label>
        <span className="text-xs text-wechat-text-tertiary">{hint}</span>
      </div>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t("settings.modelIdPlaceholder")}
          className="flex-1 px-3 py-2 border border-wechat-border rounded text-sm font-mono focus:outline-none focus:border-wechat-green"
        />
        {suggestions && (
          <button
            type="button"
            onClick={() => (showList ? setShowList(false) : openList())}
            className="px-3 py-2 text-sm text-wechat-link hover:bg-wechat-bg rounded border border-wechat-border whitespace-nowrap"
          >
            {showList
              ? t("settings.collapseList")
              : t("settings.pickFrom", { n: suggestions.length })}
          </button>
        )}
      </div>
      {showList && suggestions && (
        <div className="mt-2 border border-wechat-border rounded bg-white shadow-sm">
          {/* modality tab 行 */}
          <div className="flex gap-1 px-2 pt-2 pb-1 border-b border-wechat-border overflow-x-auto">
            {MODALITY_TABS.map((tab) => {
              const active = modalityTab === tab;
              const count = counts[tab];
              const label =
                tab === "all"
                  ? t("settings.modalityAll")
                  : t(`settings.modality.${tab}`);
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setModalityTab(tab)}
                  className={cn(
                    "px-2.5 py-1 text-xs rounded whitespace-nowrap flex items-center gap-1.5 transition-colors",
                    active
                      ? "bg-wechat-text text-white"
                      : "text-wechat-text-secondary hover:bg-wechat-bg",
                    count === 0 && !active && "opacity-40"
                  )}
                >
                  <span>{label}</span>
                  <span
                    className={cn(
                      "text-[10px]",
                      active ? "text-white/80" : "text-wechat-text-tertiary"
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="relative border-b border-wechat-border">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-wechat-text-tertiary" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && filtered.length === 1) {
                  onChange(filtered[0].id);
                  setShowList(false);
                } else if (e.key === "Escape") {
                  setShowList(false);
                }
              }}
              placeholder={t("settings.searchPlaceholder")}
              className="w-full pl-9 pr-9 py-2 text-xs focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-wechat-text-tertiary hover:text-wechat-text"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="px-3 py-1.5 text-[11px] text-wechat-text-tertiary bg-wechat-bg border-b border-wechat-border">
            {t("settings.matchCount", {
              n: filtered.length,
              total: suggestions.length,
            })}
            {filtered.length === 1 && t("settings.enterToSelect")}
          </div>
          <div className="max-h-56 overflow-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-6 text-sm text-wechat-text-tertiary text-center">
                {query
                  ? t("settings.noMatch", { query })
                  : t("settings.noModelsInTab")}
              </div>
            ) : (
              filtered.map((m) => {
                const selected = m.id === value;
                const modality = classifyModality(m);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      onChange(m.id);
                      setShowList(false);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-1.5 text-sm hover:bg-wechat-bg flex items-center justify-between gap-3",
                      selected && "bg-wechat-green-light"
                    )}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      {selected && <Check className="w-3.5 h-3.5 text-wechat-green flex-shrink-0" />}
                      <code className="font-mono text-xs truncate">
                        {highlight(m.id, query)}
                      </code>
                    </span>
                    <span className="flex items-center gap-2 flex-shrink-0">
                      <ModalityChip modality={modality} />
                      {m.endpoint && <EndpointChip endpoint={m.endpoint} />}
                      {m.owned_by && (
                        <span className="text-[10px] text-wechat-text-tertiary">
                          {m.owned_by}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function highlight(text: string, query: string): React.ReactNode {
  const q = query.trim();
  if (!q) return text;
  const lower = text.toLowerCase();
  const ql = q.toLowerCase();
  const idx = lower.indexOf(ql);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="bg-yellow-200 text-wechat-text">
        {text.slice(idx, idx + q.length)}
      </span>
      {text.slice(idx + q.length)}
    </>
  );
}

function ModalityChip({ modality }: { modality: Modality }) {
  const { t } = useT();
  const cls: Record<Modality, string> = {
    text: "bg-slate-50 text-slate-600 border-slate-200",
    image: "bg-emerald-50 text-emerald-700 border-emerald-200",
    video: "bg-rose-50 text-rose-700 border-rose-200",
    audio: "bg-amber-50 text-amber-700 border-amber-200",
    embedding: "bg-indigo-50 text-indigo-700 border-indigo-200",
  };
  return (
    <span
      className={cn(
        "text-[9px] px-1.5 py-0.5 border rounded font-medium",
        cls[modality]
      )}
    >
      {t(`settings.modality.${modality}`)}
    </span>
  );
}

function EndpointChip({ endpoint }: { endpoint: "openai" | "vertex" | "both" }) {
  // OpenAI 端点（chat / embedding）走 /api/v1
  // Vertex 端点（图像生成）走 /api/vertex-ai
  const { t } = useT();
  const cfg: Record<typeof endpoint, { label: string; cls: string }> = {
    openai: { label: "OpenAI", cls: "bg-blue-50 text-blue-700 border-blue-200" },
    vertex: { label: "Vertex", cls: "bg-orange-50 text-orange-700 border-orange-200" },
    both: { label: "Both", cls: "bg-purple-50 text-purple-700 border-purple-200" },
  };
  const c = cfg[endpoint];
  return (
    <span
      className={cn(
        "text-[9px] px-1.5 py-0.5 border rounded font-medium",
        c.cls
      )}
      title={
        endpoint === "openai"
          ? t("settings.endpoint.openaiTitle")
          : endpoint === "vertex"
            ? t("settings.endpoint.vertexTitle")
            : t("settings.endpoint.bothTitle")
      }
    >
      {c.label}
    </span>
  );
}
