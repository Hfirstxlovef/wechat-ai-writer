"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { apiGet, apiSend } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { Loader2, Plus, Trash2, Save } from "lucide-react";

type Category = { id: string; name: string };
type StyleRef = {
  id: string;
  categoryId: string;
  title: string;
  content: string;
  hasEmbedding?: boolean;
  createdAt: string;
};

export default function StyleLibraryPage() {
  const { t, locale } = useT();
  const [categories, setCategories] = useState<Category[]>([]);
  const [refs, setRefs] = useState<StyleRef[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  const load = async (catId?: string) => {
    setLoading(true);
    try {
      const cs = await apiGet<{ items: Category[] }>("/api/categories");
      setCategories(cs.items);
      const targetCat = catId ?? categoryFilter ?? cs.items[0]?.id ?? "";
      if (targetCat) {
        setCategoryFilter(targetCat);
        const rs = await apiGet<{ items: StyleRef[] }>(
          `/api/style-refs?categoryId=${targetCat}`
        );
        setRefs(rs.items);
      } else {
        setRefs([]);
      }
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
            <h1 className="text-2xl font-semibold">{t("styleLibrary.title")}</h1>
            <p className="text-sm text-wechat-text-secondary mt-1">
              {t("styleLibrary.subtitle")}
            </p>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="bg-wechat-green text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-wechat-green-dark flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {t("styleLibrary.upload")}
          </button>
        </div>

        <div className="mb-4 flex items-center gap-2">
          <label className="text-sm text-wechat-text-secondary">{t("styleLibrary.filterByDomain")}</label>
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              load(e.target.value);
            }}
            className="px-3 py-1.5 border border-wechat-border rounded text-sm"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {showNew && (
          <StyleRefForm
            categories={categories}
            defaultCategoryId={categoryFilter}
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
        ) : refs.length === 0 ? (
          <div className="text-sm text-wechat-text-secondary py-12 text-center border border-dashed border-wechat-border rounded-lg">
            {t("styleLibrary.empty")}
          </div>
        ) : (
          <div className="space-y-3">
            {refs.map((r) => (
              <div key={r.id} className="border border-wechat-border rounded-lg p-4 bg-white">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-wechat-text">{r.title}</div>
                    <div className="text-xs text-wechat-text-secondary mt-1">
                      {new Date(r.createdAt).toLocaleString(locale === "en" ? "en-US" : "zh-CN")}
                      {r.hasEmbedding === false && (
                        <span className="ml-2 text-orange-600">{t("styleLibrary.embeddingMissing")}</span>
                      )}
                    </div>
                    <div className="text-sm text-wechat-text-secondary mt-2 line-clamp-2">
                      {r.content.slice(0, 200)}…
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      if (!confirm(t("styleLibrary.confirmDelete", { title: r.title }))) return;
                      await apiSend(`/api/style-refs/${r.id}`, "DELETE");
                      await load();
                    }}
                    className="p-1.5 text-destructive hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function StyleRefForm({
  categories,
  defaultCategoryId,
  onCancel,
  onSaved,
}: {
  categories: Category[];
  defaultCategoryId: string;
  onCancel: () => void;
  onSaved: () => Promise<void>;
}) {
  const { t } = useT();
  const [categoryId, setCategoryId] = useState(defaultCategoryId);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    if (!categoryId || !title.trim() || !content.trim()) {
      setErr(t("styleLibrary.errAllRequired"));
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      await apiSend("/api/style-refs", "POST", {
        categoryId,
        title: title.trim(),
        content: content.trim(),
      });
      await onSaved();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mb-4 p-5 border border-wechat-green rounded-lg bg-white">
      <h3 className="font-medium mb-3">{t("styleLibrary.upload")}</h3>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-xs text-wechat-text-secondary block mb-1">{t("styleLibrary.domain")}</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full px-3 py-2 border border-wechat-border rounded text-sm"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-wechat-text-secondary block mb-1">{t("styleLibrary.sampleTitle")}</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-wechat-border rounded text-sm"
            placeholder={t("styleLibrary.sampleTitlePlaceholder")}
          />
        </div>
      </div>
      <div className="mb-3">
        <label className="text-xs text-wechat-text-secondary block mb-1">
          {t("styleLibrary.content")}
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full px-3 py-2 border border-wechat-border rounded text-sm h-60 font-mono"
          placeholder={t("styleLibrary.contentPlaceholder")}
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
