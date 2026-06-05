"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { apiGet, apiSend } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { Loader2, Plus, Trash2, Save, Pencil } from "lucide-react";

type Category = {
  id: string;
  name: string;
  slug: string;
  systemPrompt: string | null;
  toneNotes: string | null;
  _count: { articles: number; styleRefs: number };
};

export default function CategoriesPage() {
  const { t } = useT();
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await apiGet<{ items: Category[] }>("/api/categories");
      setItems(r.items);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  return (
    <AppShell>
      <div className="p-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">{t("categories.title")}</h1>
            <p className="text-sm text-wechat-text-secondary mt-1">
              {t("categories.subtitle")}
            </p>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="bg-wechat-green text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-wechat-green-dark flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {t("categories.new")}
          </button>
        </div>

        {showNew && (
          <CategoryForm
            onCancel={() => setShowNew(false)}
            onSaved={async () => {
              setShowNew(false);
              await load();
            }}
          />
        )}

        {loading ? (
          <div className="text-sm text-wechat-text-secondary py-12 text-center">
            <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> {t("common.loading")}
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((c) =>
              editing === c.id ? (
                <CategoryForm
                  key={c.id}
                  initial={c}
                  onCancel={() => setEditing(null)}
                  onSaved={async () => {
                    setEditing(null);
                    await load();
                  }}
                />
              ) : (
                <div key={c.id} className="border border-wechat-border rounded-lg p-4 bg-white">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-wechat-text">{c.name}</span>
                        <span className="text-xs text-wechat-text-tertiary">/{c.slug}</span>
                      </div>
                      <div className="text-xs text-wechat-text-secondary mb-2">
                        {t("categories.stats", {
                          articles: c._count.articles,
                          refs: c._count.styleRefs,
                        })}
                      </div>
                      {c.systemPrompt && (
                        <div className="text-sm text-wechat-text mt-2 line-clamp-2">
                          <span className="text-wechat-text-tertiary text-xs">{t("categories.promptInline")}</span>
                          {c.systemPrompt}
                        </div>
                      )}
                      {c.toneNotes && (
                        <div className="text-sm text-wechat-text-secondary mt-1 line-clamp-1">
                          <span className="text-wechat-text-tertiary text-xs">{t("categories.toneInline")}</span>
                          {c.toneNotes}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEditing(c.id)}
                        className="p-1.5 text-wechat-text-secondary hover:text-wechat-text rounded"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm(t("categories.confirmDelete", { name: c.name }))) return;
                          await apiSend(`/api/categories/${c.id}`, "DELETE");
                          await load();
                        }}
                        className="p-1.5 text-destructive hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function CategoryForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial?: Category;
  onCancel: () => void;
  onSaved: () => Promise<void>;
}) {
  const { t } = useT();
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [systemPrompt, setSystemPrompt] = useState(initial?.systemPrompt ?? "");
  const [toneNotes, setToneNotes] = useState(initial?.toneNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    if (!name.trim() || !slug.trim()) {
      setErr(t("categories.errNameSlug"));
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      if (initial) {
        await apiSend(`/api/categories/${initial.id}`, "PUT", {
          name,
          slug,
          systemPrompt: systemPrompt || null,
          toneNotes: toneNotes || null,
        });
      } else {
        await apiSend(`/api/categories`, "POST", {
          name,
          slug,
          systemPrompt: systemPrompt || null,
          toneNotes: toneNotes || null,
        });
      }
      await onSaved();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mb-3 p-5 border border-wechat-green rounded-lg bg-white">
      <h3 className="font-medium mb-3">{initial ? t("categories.edit") : t("categories.new")}</h3>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-xs text-wechat-text-secondary block mb-1">{t("categories.name")}</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-wechat-border rounded text-sm"
            placeholder={t("categories.namePlaceholder")}
          />
        </div>
        <div>
          <label className="text-xs text-wechat-text-secondary block mb-1">{t("categories.slug")}</label>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="w-full px-3 py-2 border border-wechat-border rounded text-sm"
            placeholder={t("categories.slugPlaceholder")}
          />
        </div>
      </div>
      <div className="mb-3">
        <label className="text-xs text-wechat-text-secondary block mb-1">{t("categories.systemPrompt")}</label>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          className="w-full px-3 py-2 border border-wechat-border rounded text-sm h-20"
          placeholder={t("categories.systemPromptPlaceholder")}
        />
      </div>
      <div className="mb-3">
        <label className="text-xs text-wechat-text-secondary block mb-1">{t("categories.toneNotes")}</label>
        <textarea
          value={toneNotes}
          onChange={(e) => setToneNotes(e.target.value)}
          className="w-full px-3 py-2 border border-wechat-border rounded text-sm h-16"
          placeholder={t("categories.toneNotesPlaceholder")}
        />
      </div>
      {err && <div className="text-xs text-destructive mb-2">{err}</div>}
      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="bg-wechat-green text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-wechat-green-dark disabled:opacity-50 inline-flex items-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {t("common.save")}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-wechat-text-secondary hover:text-wechat-text"
        >
          {t("common.cancel")}
        </button>
      </div>
    </div>
  );
}
