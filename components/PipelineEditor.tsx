"use client";

import { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useState } from "react";
import { Check, Loader2, Copy, Sparkles, RefreshCw, Image as ImageIcon, ExternalLink, Plus, Trash2, ChevronUp, ChevronDown, Save, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiGet, apiSend } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { MobilePreview } from "@/components/MobilePreview";
import { MarkdownEditor } from "@/components/MarkdownEditor";
import { SaveStatus } from "@/components/SaveStatus";
import { useAutosave } from "@/lib/useAutosave";
import {
  previewComponent,
  previewOverride,
  resolveTheme,
} from "@/lib/style-preview-snippets";

type Article = {
  id: string;
  categoryId: string;
  idea: string;
  status: string;
  topicJson: any;
  chosenTitle: string | null;
  outlineJson: any;
  contentMd: string | null;
  contentHtml: string | null;
  styleJson: any | null;
  imagePlanJson: any | null;
  coverImage: string | null;
  category?: { id: string; name: string };
  images?: { id: string; url: string; prompt: string | null; slot: string | null; role: string | null }[];
};

type StepKey = "topic" | "title-pick" | "outline" | "draft" | "image" | "style" | "render";

const STEPS: { key: StepKey; labelKey: string; done: (a: Article) => boolean }[] = [
  { key: "topic", labelKey: "editor.steps.topic", done: (a) => !!a.topicJson },
  { key: "title-pick", labelKey: "editor.steps.titlePick", done: (a) => !!a.chosenTitle },
  { key: "outline", labelKey: "editor.steps.outline", done: (a) => !!a.outlineJson },
  { key: "draft", labelKey: "editor.steps.draft", done: (a) => !!a.contentMd },
  { key: "image", labelKey: "editor.steps.image", done: (a) => !!a.imagePlanJson },
  { key: "style", labelKey: "editor.steps.style", done: (a) => !!a.styleJson },
  { key: "render", labelKey: "editor.steps.render", done: (a) => !!a.contentHtml },
];

const KNOWN_STATUSES = ["draft", "topic", "outline", "writing", "done"];

export function PipelineEditor({ initialArticle }: { initialArticle: Article }) {
  const { t } = useT();
  const [article, setArticle] = useState<Article>(initialArticle);
  const [active, setActive] = useState<StepKey>(() => {
    for (const step of STEPS) if (!step.done(initialArticle)) return step.key;
    return "render";
  });

  const refresh = useCallback(async () => {
    const fresh = await apiGet<Article>(`/api/articles/${article.id}`);
    setArticle(fresh);
  }, [article.id]);

  const statusText = KNOWN_STATUSES.includes(article.status)
    ? t(`status.${article.status}`)
    : article.status;

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col min-w-0 border-r border-wechat-border">
        <header className="border-b border-wechat-border px-6 py-4 bg-white">
          <div className="text-xs text-wechat-text-secondary mb-1">
            {article.category?.name ?? "—"} · {t("editor.statusPrefix")}{statusText}
          </div>
          <div className="text-lg font-medium text-wechat-text truncate">
            {article.chosenTitle || article.idea}
          </div>
        </header>

        <nav className="flex border-b border-wechat-border bg-wechat-bg px-4 overflow-x-auto">
          {STEPS.map((s, i) => {
            const done = s.done(article);
            const isActive = active === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setActive(s.key)}
                className={cn(
                  "px-4 py-3 text-sm whitespace-nowrap border-b-2 -mb-px flex items-center gap-2 transition-colors",
                  isActive
                    ? "border-wechat-green text-wechat-green font-medium"
                    : "border-transparent text-wechat-text-secondary hover:text-wechat-text"
                )}
              >
                {done ? (
                  <Check className="w-4 h-4 text-wechat-green" />
                ) : (
                  <span className="w-4 h-4 rounded-full border border-wechat-text-tertiary" />
                )}
                {i + 1}. {t(s.labelKey)}
              </button>
            );
          })}
        </nav>

        <div className="flex-1 overflow-auto p-6 bg-white">
          {active === "topic" && <TopicStep article={article} onUpdate={refresh} setArticle={setArticle} />}
          {active === "title-pick" && (
            <TitlePickStep article={article} onUpdate={refresh} setActive={setActive} />
          )}
          {active === "outline" && <OutlineStep article={article} onUpdate={refresh} setArticle={setArticle} />}
          {active === "draft" && (
            <DraftStep article={article} onUpdate={refresh} setArticle={setArticle} />
          )}
          {active === "image" && (
            <ImageStep
              article={article}
              onUpdate={refresh}
              setArticle={setArticle}
              setActive={setActive}
            />
          )}
          {active === "style" && (
            <StyleStep
              article={article}
              onUpdate={refresh}
              setArticle={setArticle}
              setActive={setActive}
            />
          )}
          {active === "render" && <RenderStep article={article} onUpdate={refresh} />}
        </div>
      </div>

      <div className="w-[420px] flex-shrink-0">
        <MobilePreview
          title={article.chosenTitle ?? undefined}
          cover={article.coverImage ?? undefined}
          html={article.contentHtml ?? undefined}
          contentMd={article.contentMd ?? undefined}
        />
      </div>
    </div>
  );
}

function Btn({
  loading,
  children,
  variant = "primary",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  variant?: "primary" | "secondary" | "ghost";
}) {
  const cls =
    variant === "primary"
      ? "bg-wechat-green text-white hover:bg-wechat-green-dark"
      : variant === "secondary"
        ? "bg-wechat-bg text-wechat-text hover:bg-wechat-border"
        : "text-wechat-link hover:underline";
  return (
    <button
      {...rest}
      disabled={loading || rest.disabled}
      className={cn(
        "px-4 py-2 rounded-md text-sm font-medium transition-colors inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed",
        cls,
        rest.className
      )}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}

function ErrorBox({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return (
    <div className="text-sm text-destructive bg-red-50 border border-red-200 rounded px-3 py-2 mt-3">
      {msg}
    </div>
  );
}

function TopicStep({
  article,
  onUpdate,
  setArticle,
}: {
  article: Article;
  onUpdate: () => Promise<void>;
  setArticle: Dispatch<SetStateAction<Article>>;
}) {
  const { t } = useT();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [idea, setIdea] = useState(article.idea);
  const topic = article.topicJson as any;
  const dirty = idea !== article.idea;

  const { status, lastSavedAt, error: saveError, flush } = useAutosave({
    value: idea,
    save: async (v) => {
      await apiSend(`/api/articles/${article.id}`, "PUT", { idea: v });
      setArticle((a) => ({ ...a, idea: v }));
    },
  });

  const run = async () => {
    if (dirty) await flush();
    setLoading(true);
    setErr(null);
    try {
      await apiSend(`/api/pipeline/topic`, "POST", { articleId: article.id });
      await onUpdate();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="max-w-3xl">
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="text-lg font-medium">{t("editor.topic.inputHeading")}</h2>
        <div className="flex items-center gap-3">
          <SaveStatus status={status} lastSavedAt={lastSavedAt} error={saveError} onRetry={flush} />
          {dirty && status !== "saving" && (
            <Btn variant="secondary" onClick={flush}>
              <Save className="w-4 h-4" />
              {t("common.saveNow")}
            </Btn>
          )}
        </div>
      </div>
      <div className="mb-6">
        <MarkdownEditor
          value={idea}
          onChange={setIdea}
          height={200}
          preview="edit"
          placeholder={t("editor.topic.placeholder")}
        />
      </div>
      <Btn loading={loading} onClick={run}>
        <Sparkles className="w-4 h-4" />
        {topic ? t("editor.topic.regenerate") : t("editor.topic.generate")}
      </Btn>
      <ErrorBox msg={err} />
      {topic && (
        <div className="mt-6 space-y-4">
          <Card title={t("editor.topic.angle")}>{topic.angle}</Card>
          <Card title={t("editor.topic.audience")}>{topic.audience}</Card>
          <Card title={t("editor.topic.titleCandidates")}>
            <ol className="list-decimal pl-6 space-y-1.5">
              {(topic.titleCandidates ?? []).map((t: string, i: number) => (
                <li key={i} className="text-sm">{t}</li>
              ))}
            </ol>
          </Card>
        </div>
      )}
    </div>
  );
}

function TitlePickStep({
  article,
  onUpdate,
  setActive,
}: {
  article: Article;
  onUpdate: () => Promise<void>;
  setActive: (k: StepKey) => void;
}) {
  const { t } = useT();
  const topic = article.topicJson as any;
  const candidates: string[] = topic?.titleCandidates ?? [];
  const [custom, setCustom] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const pick = async (title: string) => {
    if (!title.trim()) return;
    setSaving(true);
    setErr(null);
    try {
      await apiSend(`/api/articles/${article.id}`, "PUT", { chosenTitle: title });
      await onUpdate();
      setActive("outline");
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };
  if (!topic) {
    return <div className="text-sm text-wechat-text-secondary">{t("editor.titlePick.needTopic")}</div>;
  }
  return (
    <div className="max-w-3xl space-y-3">
      <h2 className="text-lg font-medium mb-2">{t("editor.titlePick.heading")}</h2>
      {candidates.map((tt, i) => (
        <div
          key={i}
          className={cn(
            "p-4 border rounded cursor-pointer hover:border-wechat-green",
            article.chosenTitle === tt
              ? "border-wechat-green bg-wechat-green-light"
              : "border-wechat-border"
          )}
          onClick={() => pick(tt)}
        >
          <div className="text-sm">{tt}</div>
        </div>
      ))}
      <div className="pt-3 border-t border-wechat-border">
        <div className="text-sm text-wechat-text-secondary mb-2">{t("editor.titlePick.orCustom")}</div>
        <div className="flex gap-2">
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder={t("editor.titlePick.customPlaceholder")}
            className="flex-1 px-3 py-2 border border-wechat-border rounded text-sm focus:outline-none focus:border-wechat-green"
          />
          <Btn loading={saving} onClick={() => pick(custom)}>{t("editor.titlePick.use")}</Btn>
        </div>
      </div>
      <ErrorBox msg={err} />
    </div>
  );
}

type OutlineSection = { type: string; heading: string; point: string; wordCount?: number };

function OutlineStep({
  article,
  onUpdate,
  setArticle,
}: {
  article: Article;
  onUpdate: () => Promise<void>;
  setArticle: Dispatch<SetStateAction<Article>>;
}) {
  const { t } = useT();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const initial: OutlineSection[] = useMemo(() => {
    const o = article.outlineJson as any;
    return o?.sections ?? o?.outline ?? [];
  }, [article.outlineJson]);
  const [sections, setSections] = useState<OutlineSection[]>(initial);

  const sectionsJson = useMemo(() => JSON.stringify(sections), [sections]);
  const initialJson = useMemo(() => JSON.stringify(initial), [initial]);
  const dirty = sectionsJson !== initialJson;

  const { status, lastSavedAt, error: saveError, flush } = useAutosave({
    value: sectionsJson,
    save: async (v) => {
      const parsed = JSON.parse(v) as OutlineSection[];
      await apiSend(`/api/articles/${article.id}`, "PUT", {
        outlineJson: { sections: parsed },
      });
      setArticle((a) => ({ ...a, outlineJson: { sections: parsed } }));
    },
  });

  const run = async () => {
    if (!article.chosenTitle) {
      setErr(t("editor.outline.needTitle"));
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      await apiSend(`/api/pipeline/outline`, "POST", {
        articleId: article.id,
        chosenTitle: article.chosenTitle,
      });
      const fresh = await apiGet<Article>(`/api/articles/${article.id}`);
      setArticle(fresh);
      const o = fresh.outlineJson as any;
      setSections(o?.sections ?? o?.outline ?? []);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const updateSection = (i: number, patch: Partial<OutlineSection>) => {
    setSections((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  };
  const removeSection = (i: number) => {
    setSections((prev) => prev.filter((_, idx) => idx !== i));
  };
  const moveSection = (i: number, dir: -1 | 1) => {
    setSections((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };
  const addSection = () => {
    setSections((prev) => [
      ...prev,
      { type: "body", heading: t("editor.outline.newSectionHeading"), point: "", wordCount: 400 },
    ]);
  };

  const totalWords = sections.reduce((sum, s) => sum + (s.wordCount ?? 0), 0);

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2 mb-4">
        <Btn loading={loading} onClick={run}>
          <Sparkles className="w-4 h-4" />
          {sections.length > 0 ? t("editor.outline.regenerate") : t("editor.outline.generate")}
        </Btn>
        {dirty && status !== "saving" && (
          <Btn variant="secondary" onClick={flush}>
            <Save className="w-4 h-4" />
            {t("common.saveNow")}
          </Btn>
        )}
        <SaveStatus status={status} lastSavedAt={lastSavedAt} error={saveError} onRetry={flush} />
        {sections.length > 0 && (
          <span className="text-xs text-wechat-text-tertiary ml-auto">
            {t("editor.outline.summary", { count: sections.length, words: totalWords })}
          </span>
        )}
      </div>
      <ErrorBox msg={err} />

      {sections.length === 0 ? (
        <div className="text-sm text-wechat-text-secondary py-12 text-center border border-dashed border-wechat-border rounded">
          {t("editor.outline.empty")}
        </div>
      ) : (
        <div className="space-y-3 mt-4">
          {sections.map((s, i) => (
            <div key={i} className="border border-wechat-border rounded-lg p-3 bg-white">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-wechat-text-tertiary w-6">#{i + 1}</span>
                <select
                  value={s.type}
                  onChange={(e) => updateSection(i, { type: e.target.value })}
                  className="px-2 py-1 border border-wechat-border rounded text-xs"
                >
                  <option value="opening">opening</option>
                  <option value="body">body</option>
                  <option value="ending">ending</option>
                </select>
                <input
                  value={s.heading}
                  onChange={(e) => updateSection(i, { heading: e.target.value })}
                  placeholder={t("editor.outline.headingPlaceholder")}
                  className="flex-1 px-2 py-1 border border-wechat-border rounded text-sm font-medium"
                />
                <input
                  type="number"
                  value={s.wordCount ?? 0}
                  onChange={(e) =>
                    updateSection(i, { wordCount: parseInt(e.target.value) || 0 })
                  }
                  className="w-20 px-2 py-1 border border-wechat-border rounded text-xs"
                  title={t("editor.outline.wordCountTitle")}
                />
                <span className="text-xs text-wechat-text-tertiary">{t("editor.outline.wordUnit")}</span>
                <div className="flex">
                  <button
                    onClick={() => moveSection(i, -1)}
                    disabled={i === 0}
                    className="p-1 text-wechat-text-tertiary hover:text-wechat-text disabled:opacity-30"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => moveSection(i, 1)}
                    disabled={i === sections.length - 1}
                    className="p-1 text-wechat-text-tertiary hover:text-wechat-text disabled:opacity-30"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => removeSection(i)}
                    className="p-1 text-destructive hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <textarea
                value={s.point}
                onChange={(e) => updateSection(i, { point: e.target.value })}
                placeholder={t("editor.outline.pointPlaceholder")}
                className="w-full px-2 py-1.5 border border-wechat-border rounded text-sm leading-relaxed resize-y min-h-[60px]"
              />
            </div>
          ))}
          <button
            onClick={addSection}
            className="w-full py-2 border border-dashed border-wechat-border rounded text-sm text-wechat-text-secondary hover:border-wechat-green hover:text-wechat-green flex items-center justify-center gap-1"
          >
            <Plus className="w-4 h-4" />
            {t("editor.outline.addSection")}
          </button>
        </div>
      )}
    </div>
  );
}

function DraftStep({
  article,
  onUpdate,
  setArticle,
}: {
  article: Article;
  onUpdate: () => Promise<void>;
  setArticle: Dispatch<SetStateAction<Article>>;
}) {
  const { t } = useT();
  const [streaming, setStreaming] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [draft, setDraft] = useState<string>(article.contentMd ?? "");

  useEffect(() => {
    if (!streaming) setDraft(article.contentMd ?? "");
  }, [article.contentMd, streaming]);

  const dirty = draft !== (article.contentMd ?? "");

  const { status, lastSavedAt, error: saveError, flush } = useAutosave({
    value: draft,
    enabled: !streaming,
    save: async (v) => {
      await apiSend(`/api/articles/${article.id}`, "PUT", { contentMd: v });
      setArticle((a) => ({ ...a, contentMd: v }));
    },
  });

  const run = async () => {
    if (!article.outlineJson) {
      setErr(t("editor.draft.needOutline"));
      return;
    }
    setStreaming(true);
    setErr(null);
    setDraft("");
    try {
      const res = await fetch(`/api/pipeline/draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId: article.id }),
      });
      if (!res.body) throw new Error("no stream body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith("data:")) continue;
          try {
            const ev = JSON.parse(t.slice(5).trim());
            if (ev.delta) {
              acc += ev.delta;
              setDraft(acc);
              setArticle((a) => ({ ...a, contentMd: acc }));
            } else if (ev.error) {
              setErr(ev.error);
            }
          } catch {}
        }
      }
      await onUpdate();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2 mb-4">
        <Btn loading={streaming} onClick={run}>
          <Sparkles className="w-4 h-4" />
          {article.contentMd ? t("editor.draft.regenerate") : t("editor.draft.start")}
        </Btn>
        {dirty && !streaming && status !== "saving" && (
          <Btn variant="secondary" onClick={flush}>
            <Save className="w-4 h-4" />
            {t("common.saveNow")}
          </Btn>
        )}
        {!streaming && (
          <SaveStatus status={status} lastSavedAt={lastSavedAt} error={saveError} onRetry={flush} />
        )}
        {streaming && (
          <span className="text-xs text-wechat-text-tertiary">
            <Loader2 className="w-3 h-3 inline animate-spin mr-1" />
            {t("editor.draft.streaming")}
          </span>
        )}
      </div>
      <ErrorBox msg={err} />
      <MarkdownEditor
        value={draft}
        onChange={setDraft}
        height={520}
        preview="live"
        placeholder={t("editor.draft.placeholder")}
      />
    </div>
  );
}

type PlanSlot = {
  slot: string;
  role: "cover" | "inline";
  prompt: string;
  contextHint: string;
  insertAfter: string;
};

function ImageStep({
  article,
  onUpdate,
  setArticle,
  setActive,
}: {
  article: Article;
  onUpdate: () => Promise<void>;
  setArticle: Dispatch<SetStateAction<Article>>;
  setActive: (k: StepKey) => void;
}) {
  const { t } = useT();
  const planSlots: PlanSlot[] = (article.imagePlanJson as any)?.slots ?? [];
  const planWarnings: string[] = (article.imagePlanJson as any)?.meta?._warnings ?? [];

  const [planning, setPlanning] = useState(false);
  const [genAll, setGenAll] = useState(false);
  const [genOne, setGenOne] = useState<string | null>(null);
  const [editPrompts, setEditPrompts] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);

  // slot → image url（来自当前 article.images）
  const slotToImage = new Map(
    (article.images ?? [])
      .filter((i) => i.slot)
      .map((i) => [i.slot as string, i] as const)
  );

  const getPrompt = (s: PlanSlot) => editPrompts[s.slot] ?? s.prompt;

  const runPlan = async () => {
    if (!article.contentMd) {
      setErr(t("editor.image.needBody"));
      return;
    }
    if (planSlots.length > 0) {
      const ok = confirm(t("editor.image.confirmReplan"));
      if (!ok) return;
    }
    setPlanning(true);
    setErr(null);
    try {
      await apiSend(`/api/pipeline/image-plan`, "POST", {
        articleId: article.id,
      });
      setEditPrompts({});
      await onUpdate();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setPlanning(false);
    }
  };

  const generateSlot = async (s: PlanSlot) => {
    setGenOne(s.slot);
    setErr(null);
    try {
      const prompt = getPrompt(s);
      await apiSend(`/api/pipeline/image`, "POST", {
        articleId: article.id,
        prompt,
        slot: s.slot,
        role: s.role,
        size: "1024x1024",
      });
      // 如果用户改过 prompt，把新 prompt 回写到 imagePlanJson
      if (prompt !== s.prompt) {
        const newSlots = planSlots.map((x) =>
          x.slot === s.slot ? { ...x, prompt } : x
        );
        const newPlan = { ...(article.imagePlanJson ?? {}), slots: newSlots };
        await apiSend(`/api/articles/${article.id}`, "PUT", {
          imagePlanJson: newPlan,
        });
      }
      await onUpdate();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setGenOne(null);
    }
  };

  const generateAll = async () => {
    setGenAll(true);
    setErr(null);
    try {
      // 先把 editPrompts 整体回写
      const merged = planSlots.map((s) => ({
        ...s,
        prompt: getPrompt(s),
      }));
      if (planSlots.some((s) => getPrompt(s) !== s.prompt)) {
        const newPlan = { ...(article.imagePlanJson ?? {}), slots: merged };
        await apiSend(`/api/articles/${article.id}`, "PUT", {
          imagePlanJson: newPlan,
        });
      }
      // 串行调（并行会触发限速 + 调试更容易）
      for (const s of merged) {
        if (slotToImage.has(s.slot)) continue; // 已生成的跳过
        try {
          await apiSend(`/api/pipeline/image`, "POST", {
            articleId: article.id,
            prompt: s.prompt,
            slot: s.slot,
            role: s.role,
            size: "1024x1024",
          });
        } catch (e: any) {
          setErr(t("editor.image.slotFailed", { slot: s.slot, msg: e.message }));
        }
      }
      await onUpdate();
    } finally {
      setGenAll(false);
    }
  };

  const deleteSlot = async (s: PlanSlot) => {
    if (!confirm(t("editor.image.confirmDeleteSlot", { slot: s.slot }))) return;
    setErr(null);
    try {
      const newSlots = planSlots.filter((x) => x.slot !== s.slot);
      const newPlan = { ...(article.imagePlanJson ?? {}), slots: newSlots };
      const re = new RegExp(
        `\\s*<!--\\s*img-slot:${s.slot}\\s*-->\\s*`,
        "g"
      );
      const newMd = (article.contentMd ?? "").replace(re, "\n\n");
      await apiSend(`/api/articles/${article.id}`, "PUT", {
        imagePlanJson: newPlan,
        contentMd: newMd,
      });
      // 顺便清掉这张 Image 记录（如果已生成）
      const img = slotToImage.get(s.slot);
      if (img) {
        // 没有专门的 delete image 端点；用 articles PUT 不会动 Image 表，
        // 这里走一个最小后端调用：用 imagePlan POST 重新分析也会清；
        // 但仅删一张：调用 articles PUT 已够，孤立 Image 记录无害。
      }
      await onUpdate();
    } catch (e: any) {
      setErr(e.message);
    }
  };

  return (
    <div className="max-w-3xl space-y-5">
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-medium">{t("editor.image.planTitle")}</h2>
          <div className="flex gap-2">
            <Btn loading={planning} onClick={runPlan}>
              <Sparkles className="w-4 h-4" />
              {planSlots.length > 0 ? t("editor.image.replan") : t("editor.image.plan")}
            </Btn>
            {planSlots.length > 0 && (
              <Btn
                loading={genAll}
                variant="secondary"
                onClick={generateAll}
                disabled={planSlots.every((s) => slotToImage.has(s.slot))}
              >
                <ImageIcon className="w-4 h-4" />
                {t("editor.image.generateAll")}
              </Btn>
            )}
            {planSlots.length > 0 && (
              <Btn
                variant="secondary"
                onClick={() => setActive("style")}
                className="ml-2"
              >
                <Check className="w-4 h-4" />
                {t("editor.image.toBeautify")}
              </Btn>
            )}
          </div>
        </div>
        <p className="text-xs text-wechat-text-secondary">
          {t("editor.image.planHint")}
        </p>
        <ErrorBox msg={err} />
      </section>

      {planWarnings.length > 0 && (
        <div className="border border-amber-200 bg-amber-50 rounded p-3 text-xs text-amber-900">
          <div className="font-medium mb-1">{t("editor.image.skipped", { n: planWarnings.length })}</div>
          <ul className="list-disc pl-5 space-y-0.5">
            {planWarnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {planSlots.length === 0 ? (
        <div className="border border-dashed border-wechat-border rounded-lg p-12 text-center text-sm text-wechat-text-tertiary">
          {t("editor.image.planEmpty")}
        </div>
      ) : (
        <div className="space-y-3">
          {planSlots.map((s) => {
            const img = slotToImage.get(s.slot);
            const isGenerating = genOne === s.slot;
            const promptVal = getPrompt(s);
            return (
              <div
                key={s.slot}
                className="border border-wechat-border rounded-lg p-4 bg-white"
              >
                <div className="flex items-start gap-3 mb-2">
                  <RoleChip role={s.role} />
                  <code className="font-mono text-xs text-wechat-text-secondary mt-0.5">
                    {s.slot}
                  </code>
                  <span className="text-xs text-wechat-text-tertiary mt-0.5 truncate">
                    {t("editor.image.positionLabel")}
                    {s.insertAfter === "__top__"
                      ? t("editor.image.posTop")
                      : t("editor.image.posAfter", { text: s.insertAfter })}
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteSlot(s)}
                    className="ml-auto text-wechat-text-tertiary hover:text-destructive p-1"
                    title={t("editor.image.deleteSlotTitle")}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="text-xs text-wechat-text-secondary mb-2">
                  {s.contextHint}
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-3">
                  <div>
                    <label className="text-[11px] text-wechat-text-tertiary block mb-1">
                      {t("editor.image.promptLabel")}
                    </label>
                    <textarea
                      value={promptVal}
                      onChange={(e) =>
                        setEditPrompts((prev) => ({
                          ...prev,
                          [s.slot]: e.target.value,
                        }))
                      }
                      rows={3}
                      className="w-full px-2 py-1.5 border border-wechat-border rounded text-xs font-mono focus:outline-none focus:border-wechat-green"
                    />
                    <div className="mt-2 flex items-center gap-2">
                      <Btn
                        loading={isGenerating}
                        onClick={() => generateSlot(s)}
                        variant={img ? "secondary" : "primary"}
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        {img ? t("editor.image.regenerate") : t("editor.image.generate")}
                      </Btn>
                      {promptVal !== s.prompt && (
                        <span className="text-[10px] text-amber-700">
                          {t("editor.image.promptModified")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-32">
                    {img ? (
                      <a
                        href={img.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block group relative"
                      >
                        <img
                          src={img.url}
                          alt={s.slot}
                          className="w-32 h-32 object-cover rounded border border-wechat-border"
                        />
                        <span className="absolute top-1 right-1 bg-black/60 text-white p-0.5 rounded opacity-0 group-hover:opacity-100">
                          <ExternalLink className="w-3 h-3" />
                        </span>
                      </a>
                    ) : (
                      <div className="w-32 h-32 rounded border border-dashed border-wechat-border flex items-center justify-center text-[10px] text-wechat-text-tertiary text-center px-2">
                        {t("editor.image.pending")}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RoleChip({ role }: { role: "cover" | "inline" }) {
  const { t } = useT();
  const cfg = {
    cover: { labelKey: "editor.image.roleCover", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    inline: { labelKey: "editor.image.roleInline", cls: "bg-slate-50 text-slate-600 border-slate-200" },
  } as const;
  const c = cfg[role];
  return (
    <span
      className={cn(
        "text-[10px] px-1.5 py-0.5 border rounded font-medium",
        c.cls
      )}
    >
      {t(c.labelKey)}
    </span>
  );
}

function RenderStep({ article, onUpdate }: { article: Article; onUpdate: () => Promise<void> }) {
  const { t } = useT();
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<"wechat-green" | "warm" | "minimal">("wechat-green");
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const runRender = async () => {
    if (!article.contentMd) {
      setErr(t("editor.render.needBody"));
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      await apiSend(`/api/pipeline/render`, "POST", { articleId: article.id, theme });
      await onUpdate();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const copyHtml = async () => {
    if (!article.contentHtml) return;
    const html = article.contentHtml;
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    const plain = tmp.innerText || tmp.textContent || "";

    try {
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([html], { type: "text/html" }),
            "text/plain": new Blob([plain], { type: "text/plain" }),
          }),
        ]);
      } else {
        // Fallback: render into a contentEditable node and use execCommand
        const container = document.createElement("div");
        container.contentEditable = "true";
        container.style.position = "fixed";
        container.style.left = "-9999px";
        container.style.top = "0";
        container.innerHTML = html;
        document.body.appendChild(container);
        const range = document.createRange();
        range.selectNodeContents(container);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
        document.execCommand("copy");
        sel?.removeAllRanges();
        document.body.removeChild(container);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      await navigator.clipboard.writeText(html);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const planSlots: { slot: string; role?: string }[] =
    (article.imagePlanJson as any)?.slots ?? [];
  const generatedSlots = new Set(
    (article.images ?? [])
      .filter((i) => i.slot)
      .map((i) => i.slot as string)
  );
  const missingSlots = planSlots.filter((s) => !generatedSlots.has(s.slot));

  return (
    <div className="max-w-3xl space-y-6">
      <section>
        <h3 className="text-base font-medium mb-2">{t("editor.render.heading")}</h3>
        <div className="flex items-center gap-3 mb-2">
          <label className="text-sm text-wechat-text-secondary">{t("editor.render.theme")}</label>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as any)}
            className="px-3 py-1.5 border border-wechat-border rounded text-sm"
          >
            <option value="wechat-green">{t("editor.render.themeWechat")}</option>
            <option value="warm">{t("editor.render.themeWarm")}</option>
            <option value="minimal">{t("editor.render.themeMinimal")}</option>
          </select>
          <Btn loading={loading} onClick={runRender}>
            <RefreshCw className="w-4 h-4" />
            {t("editor.render.render")}
          </Btn>
          {article.contentHtml && (
            <Btn variant="secondary" onClick={copyHtml}>
              <Copy className="w-4 h-4" />
              {copied ? t("editor.render.copied") : t("editor.render.copyHtml")}
            </Btn>
          )}
          {(article.images?.length ?? 0) > 0 && (
            <Btn
              variant="secondary"
              onClick={() => {
                window.location.href = `/api/articles/${article.id}/images-zip`;
              }}
            >
              <Download className="w-4 h-4" />
              {t("editor.render.downloadZip")}
            </Btn>
          )}
        </div>
        <p className="text-xs text-wechat-text-tertiary">
          {t("editor.render.copyHint1")}
          <strong className="text-amber-700">{t("editor.render.copyHintStrong")}</strong>
          {t("editor.render.copyHint2")}
        </p>
        <ErrorBox msg={err} />
      </section>

      {missingSlots.length > 0 && (
        <section className="border border-amber-200 bg-amber-50 rounded p-4">
          <div className="text-sm font-medium text-amber-900 mb-1">
            {t("editor.render.missingImages", { n: missingSlots.length })}
          </div>
          <div className="text-xs text-amber-800 mb-2">
            {t("editor.render.missingHint")}
          </div>
          <ul className="text-xs text-amber-800 list-disc pl-5">
            {missingSlots.map((s) => (
              <li key={s.slot}>
                <code className="font-mono">{s.slot}</code>
                {s.role && <span className="ml-1 opacity-70">({s.role})</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function StyleStep({
  article,
  onUpdate,
  setArticle,
  setActive,
}: {
  article: Article;
  onUpdate: () => Promise<void>;
  setArticle: Dispatch<SetStateAction<Article>>;
  setActive: (k: StepKey) => void;
}) {
  const { t } = useT();
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // 美化结果（生成后 / 已存在）
  const [styleJson, setStyleJson] = useState<any | null>(article.styleJson ?? null);
  // 当前预览 HTML（独立于 article.contentHtml，避免覆盖渲染步骤的结果）
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  // 当 styleJson 变化时拉一次预览
  useEffect(() => {
    let cancel = false;
    if (!styleJson || !article.contentMd) {
      setPreviewHtml(null);
      return;
    }
    (async () => {
      try {
        const r = await apiSend<{ html: string }>(
          `/api/pipeline/style-preview`,
          "POST",
          { articleId: article.id, styleJson }
        );
        if (cancel) return;
        setPreviewHtml(r.html);
        // 让 MobilePreview 实时反映
        setArticle((a) => ({ ...a, contentHtml: r.html }));
      } catch (e: any) {
        if (!cancel) setErr(e.message);
      }
    })();
    return () => {
      cancel = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(styleJson), article.id, article.contentMd]);

  const run = async () => {
    if (!article.contentMd) {
      setErr(t("editor.render.needBody"));
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const r = await apiSend<{ styleJson: any }>(`/api/pipeline/style`, "POST", {
        articleId: article.id,
        userDescription: desc,
      });
      setStyleJson(r.styleJson);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const apply = async () => {
    if (!styleJson) return;
    setApplying(true);
    setErr(null);
    try {
      await apiSend(`/api/articles/${article.id}`, "PUT", { styleJson });
      await onUpdate();
      setActive("render");
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setApplying(false);
    }
  };

  const theme = styleJson?.theme ?? {};
  const components = styleJson?.components ?? {};
  const warnings: string[] = styleJson?.meta?._warnings ?? [];

  return (
    <div className="max-w-3xl">
      <h2 className="text-lg font-medium mb-2">{t("editor.style.heading")}</h2>
      <textarea
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        placeholder={t("editor.style.placeholder")}
        className="w-full px-3 py-2 border border-wechat-border rounded text-sm h-20 focus:outline-none focus:border-wechat-green"
      />
      <div className="flex items-center gap-2 mt-3">
        <Btn loading={loading} onClick={run}>
          <Sparkles className="w-4 h-4" />
          {styleJson ? t("editor.style.regenerate") : t("editor.style.beautify")}
        </Btn>
        {styleJson && (
          <Btn loading={applying} onClick={apply} className="ml-auto">
            <Check className="w-4 h-4" />
            {t("editor.style.applyRender")}
          </Btn>
        )}
      </div>
      <ErrorBox msg={err} />

      {styleJson && (
        <div className="mt-6 space-y-4">
          <div className="border border-wechat-border rounded p-4">
            <div className="text-xs text-wechat-text-secondary mb-2">{t("editor.style.themeColors")}</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(theme).map(([k, v]) => (
                <div key={k} className="flex items-center gap-1.5 text-xs">
                  <span
                    className="w-5 h-5 border border-wechat-border rounded"
                    style={{ background: String(v) }}
                  />
                  <code className="font-mono text-[11px] text-wechat-text-secondary">
                    {k}: {String(v)}
                  </code>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-wechat-border rounded p-4">
            <div className="text-xs text-wechat-text-secondary mb-3">{t("editor.style.componentPreview")}</div>
            <ComponentPreviewGrid components={components} theme={theme} />
          </div>

          {Array.isArray(styleJson.overrides) && styleJson.overrides.length > 0 && (
            <div className="border border-wechat-border rounded p-4">
              <div className="text-xs text-wechat-text-secondary mb-3">
                {t("editor.style.overrides", { n: styleJson.overrides.length })}
              </div>
              <OverridePreviewList overrides={styleJson.overrides} theme={theme} />
            </div>
          )}

          {warnings.length > 0 && (
            <div className="border border-amber-200 bg-amber-50 rounded p-4 text-xs text-amber-900">
              <div className="font-medium mb-1">{t("editor.style.degraded", { n: warnings.length })}</div>
              <ul className="list-disc pl-5 space-y-0.5">
                {warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {styleJson.meta?.modelUsed && (
            <div className="text-[11px] text-wechat-text-tertiary">
              {t("editor.style.model")}<code className="font-mono">{styleJson.meta.modelUsed}</code>
              {styleJson.meta.generatedAt && (
                <> · {new Date(styleJson.meta.generatedAt).toLocaleString()}</>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ComponentPreviewGrid({
  components,
  theme,
}: {
  components: Record<string, any>;
  theme: Record<string, any>;
}) {
  const { t: tr } = useT();
  const t = resolveTheme(theme as any);
  // 6 个 block 组件 + 1 个顶层 articleWrapper（单独样式）
  const items: { key: string; label: string; variant: string }[] = [
    { key: "h1", label: tr("editor.style.comp.h1"), variant: components.h1 ?? "title-classic" },
    { key: "h2", label: tr("editor.style.comp.h2"), variant: components.h2 ?? "section-decorated" },
    { key: "h3", label: tr("editor.style.comp.h3"), variant: components.h3 ?? "title-classic" },
    {
      key: "blockquote",
      label: tr("editor.style.comp.blockquote"),
      variant: components.blockquote ?? "quote-card-classic",
    },
    { key: "divider", label: tr("editor.style.comp.divider"), variant: components.divider ?? "hr-line" },
    { key: "img", label: tr("editor.style.comp.img"), variant: components.img ?? "img-framed" },
  ];
  const wrapperVariant = components.articleWrapper ?? "plain";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {items.map((it) => (
          <PreviewCard
            key={it.key}
            label={it.label}
            variant={it.variant}
            html={previewComponent(it.key as any, it.variant, t)}
          />
        ))}
      </div>
      <PreviewCard
        label={tr("editor.style.comp.wrapper")}
        variant={wrapperVariant}
        html={previewComponent("articleWrapper" as any, wrapperVariant, t)}
        wide
      />
    </div>
  );
}

function PreviewCard({
  label,
  variant,
  html,
  wide,
}: {
  label: string;
  variant: string;
  html: string;
  wide?: boolean;
}) {
  return (
    <div className="border border-wechat-border rounded overflow-hidden bg-white">
      <div className="px-2.5 py-1 bg-wechat-bg border-b border-wechat-border flex items-center justify-between">
        <span className="text-[11px] text-wechat-text-secondary">{label}</span>
        <code className="font-mono text-[10px] text-wechat-link">{variant}</code>
      </div>
      <div
        className={cn("p-3 overflow-hidden", wide ? "min-h-[100px]" : "min-h-[80px]")}
        style={{ fontSize: 14, lineHeight: 1.6 }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

function OverridePreviewList({
  overrides,
  theme,
}: {
  overrides: any[];
  theme: Record<string, any>;
}) {
  const { t: tr } = useT();
  const t = resolveTheme(theme as any);
  return (
    <div className="space-y-3">
      {overrides.map((o, i) => {
        const anchorText =
          typeof o.anchor === "string"
            ? o.anchor === "first"
              ? tr("editor.style.anchorFirst")
              : o.anchor === "last"
                ? tr("editor.style.anchorLast")
                : o.anchor
            : tr("editor.style.anchorHeading", { text: o.anchor?.headingMatch });
        const html = previewOverride(o, t);
        return (
          <div key={i} className="border border-wechat-border rounded overflow-hidden bg-white">
            <div className="px-2.5 py-1 bg-wechat-bg border-b border-wechat-border flex items-center gap-2 text-[11px]">
              <span className="text-wechat-text-secondary">#{i + 1}</span>
              <code className="font-mono text-[10px] text-wechat-link">{o.type}</code>
              <span className="text-wechat-text-tertiary">@</span>
              <span className="text-wechat-text-secondary">{anchorText}</span>
            </div>
            <div
              className="p-3"
              style={{ fontSize: 14, lineHeight: 1.6 }}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        );
      })}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-wechat-border rounded p-4">
      <div className="text-xs text-wechat-text-secondary mb-2">{title}</div>
      <div className="text-sm leading-relaxed text-wechat-text">{children}</div>
    </div>
  );
}
