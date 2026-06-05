"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { apiGet, apiSend } from "@/lib/api";
import { Loader2, Plus, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

type Article = {
  id: string;
  idea: string;
  status: string;
  chosenTitle: string | null;
  coverImage: string | null;
  createdAt: string;
  updatedAt: string;
  category: { id: string; name: string };
};
type Category = { id: string; name: string; slug: string };

export default function HomePage() {
  const router = useRouter();
  const { t, locale } = useT();
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [idea, setIdea] = useState("");
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [a, c] = await Promise.all([
        apiGet<{ items: Article[] }>("/api/articles"),
        apiGet<{ items: Category[] }>("/api/categories"),
      ]);
      setArticles(a.items);
      setCategories(c.items);
      if (c.items[0] && !categoryId) setCategoryId(c.items[0].id);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!idea.trim() || !categoryId) return;
    setCreating(true);
    setErr(null);
    try {
      const a = await apiSend<Article>("/api/articles", "POST", {
        categoryId,
        idea: idea.trim(),
      });
      router.push(`/editor/${a.id}`);
    } catch (e: any) {
      setErr(e.message);
      setCreating(false);
    }
  };

  return (
    <AppShell>
      <div className="p-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-wechat-text">{t("articles.title")}</h1>
            <p className="text-sm text-wechat-text-secondary mt-1">
              {t("articles.subtitle")}
            </p>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="bg-wechat-green text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-wechat-green-dark flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {t("articles.new")}
          </button>
        </div>

        {showNew && (
          <div className="mb-6 p-5 border border-wechat-border rounded-lg bg-white">
            <h3 className="font-medium mb-3">{t("articles.new")}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-wechat-text-secondary block mb-1">{t("articles.domain")}</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 border border-wechat-border rounded text-sm"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {categories.length === 0 && (
                  <p className="text-xs text-destructive mt-1">
                    {t("articles.noDomains")}
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs text-wechat-text-secondary block mb-1">{t("articles.idea")}</label>
                <textarea
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  placeholder={t("articles.ideaPlaceholder")}
                  className="w-full px-3 py-2 border border-wechat-border rounded text-sm h-24 focus:outline-none focus:border-wechat-green"
                />
              </div>
              {err && <div className="text-xs text-destructive">{err}</div>}
              <div className="flex gap-2">
                <button
                  onClick={create}
                  disabled={creating || !idea.trim() || !categoryId}
                  className="bg-wechat-green text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-wechat-green-dark disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                  {t("articles.createEnter")}
                </button>
                <button
                  onClick={() => setShowNew(false)}
                  className="px-4 py-2 text-sm text-wechat-text-secondary hover:text-wechat-text"
                >
                  {t("common.cancel")}
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-sm text-wechat-text-secondary py-12 text-center">
            <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> {t("common.loading")}
          </div>
        ) : articles.length === 0 ? (
          <div className="text-sm text-wechat-text-secondary py-12 text-center border border-dashed border-wechat-border rounded-lg">
            {t("articles.empty")}
          </div>
        ) : (
          <div className="space-y-2">
            {articles.map((a) => (
              <Link
                key={a.id}
                href={`/editor/${a.id}`}
                className="block p-4 border border-wechat-border rounded-lg hover:border-wechat-green bg-white transition-colors"
              >
                <div className="flex items-start gap-3">
                  {a.coverImage ? (
                    <img src={a.coverImage} alt="" className="w-16 h-16 rounded object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded bg-wechat-bg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6 text-wechat-text-tertiary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-wechat-text truncate">
                      {a.chosenTitle || a.idea}
                    </div>
                    <div className="text-xs text-wechat-text-secondary mt-1 flex items-center gap-3">
                      <span>{a.category.name}</span>
                      <StatusBadge status={a.status} />
                      <span>{new Date(a.updatedAt).toLocaleString(locale === "en" ? "en-US" : "zh-CN")}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useT();
  const cls: Record<string, string> = {
    draft: "bg-gray-100 text-gray-600",
    topic: "bg-blue-100 text-blue-600",
    outline: "bg-purple-100 text-purple-600",
    writing: "bg-orange-100 text-orange-600",
    done: "bg-wechat-green-light text-wechat-green",
  };
  const label = status in cls ? t(`status.${status}`) : status;
  const c = cls[status] ?? "bg-gray-100 text-gray-600";
  return (
    <span className={cn("px-1.5 py-0.5 rounded text-[10px]", c)}>{label}</span>
  );
}
