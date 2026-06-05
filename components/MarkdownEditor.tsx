"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef } from "react";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";
import { uploadImage } from "@/lib/api";
import { useT } from "@/lib/i18n";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

export interface MarkdownEditorProps {
  value: string;
  onChange: (val: string) => void;
  height?: number;
  preview?: "edit" | "live" | "preview";
  placeholder?: string;
}

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function extFromFile(file: File): string {
  const fromName = file.name?.split(".").pop()?.toLowerCase();
  if (fromName && fromName.length <= 5) return fromName;
  const fromType = file.type?.split("/").pop()?.toLowerCase();
  return fromType || "png";
}

export function MarkdownEditor({
  value,
  onChange,
  height = 360,
  preview = "edit",
  placeholder,
}: MarkdownEditorProps) {
  const { t } = useT();
  const valueRef = useRef(value);
  valueRef.current = value;

  const insertAtCursor = useCallback(
    (textarea: HTMLTextAreaElement, snippet: string) => {
      const start = textarea.selectionStart ?? valueRef.current.length;
      const end = textarea.selectionEnd ?? start;
      const current = valueRef.current;
      const next = current.slice(0, start) + snippet + current.slice(end);
      onChange(next);
      const cursor = start + snippet.length;
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(cursor, cursor);
      });
    },
    [onChange]
  );

  const replaceToken = useCallback(
    (token: string, replacement: string) => {
      const current = valueRef.current;
      if (!current.includes(token)) return;
      onChange(current.replace(token, replacement));
    },
    [onChange]
  );

  const handleFiles = useCallback(
    async (textarea: HTMLTextAreaElement, files: File[]) => {
      for (const file of files) {
        if (!file.type.startsWith("image/")) continue;
        if (file.size > MAX_IMAGE_BYTES) {
          insertAtCursor(
            textarea,
            `\n<!-- ${t("editorMd.tooLarge", {
              mb: MAX_IMAGE_BYTES / 1024 / 1024,
              name: file.name || "image",
            })} -->\n`
          );
          continue;
        }
        const token = `![${t("editorMd.uploading")}](uploading-${Date.now()}-${Math.random().toString(36).slice(2, 8)})`;
        insertAtCursor(textarea, token);
        const ext = extFromFile(file);
        const renamed = new File([file], file.name || `paste-${Date.now()}.${ext}`, {
          type: file.type || "image/png",
        });
        try {
          const { url } = await uploadImage(renamed);
          replaceToken(token, `![](${url})`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          replaceToken(token, `<!-- ${t("editorMd.uploadFailed", { msg })} -->`);
        }
      }
    },
    [insertAtCursor, replaceToken, t]
  );

  const onPaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const items = Array.from(e.clipboardData?.items ?? []);
      const files = items
        .filter((it) => it.kind === "file" && it.type.startsWith("image/"))
        .map((it) => it.getAsFile())
        .filter((f): f is File => !!f);
      if (files.length === 0) return;
      e.preventDefault();
      void handleFiles(e.currentTarget, files);
    },
    [handleFiles]
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLTextAreaElement>) => {
      const files = Array.from(e.dataTransfer?.files ?? []).filter((f) =>
        f.type.startsWith("image/")
      );
      if (files.length === 0) return;
      e.preventDefault();
      void handleFiles(e.currentTarget, files);
    },
    [handleFiles]
  );

  return (
    <div data-color-mode="light">
      <MDEditor
        value={value}
        onChange={(v) => onChange(v ?? "")}
        height={height}
        preview={preview}
        textareaProps={{ placeholder, onPaste, onDrop }}
        previewOptions={{ rehypePlugins: [] }}
      />
    </div>
  );
}
