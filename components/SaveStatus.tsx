"use client";

import { AlertTriangle, Check, Loader2 } from "lucide-react";
import type { AutosaveStatus } from "@/lib/useAutosave";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

function formatTime(d: Date): string {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export interface SaveStatusProps {
  status: AutosaveStatus;
  lastSavedAt: Date | null;
  error: string | null;
  onRetry?: () => void;
  className?: string;
}

export function SaveStatus({ status, lastSavedAt, error, onRetry, className }: SaveStatusProps) {
  const { t } = useT();
  if (status === "saving") {
    return (
      <span className={cn("text-xs text-wechat-text-tertiary inline-flex items-center gap-1", className)}>
        <Loader2 className="w-3 h-3 animate-spin" />
        {t("saveStatus.saving")}
      </span>
    );
  }
  if (status === "saved" && lastSavedAt) {
    return (
      <span className={cn("text-xs text-wechat-text-tertiary inline-flex items-center gap-1", className)}>
        <Check className="w-3 h-3 text-wechat-green" />
        {t("saveStatus.savedAt", { time: formatTime(lastSavedAt) })}
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className={cn("text-xs text-destructive inline-flex items-center gap-1", className)}>
        <AlertTriangle className="w-3 h-3" />
        <span className="max-w-[180px] truncate" title={error ?? ""}>
          {error ? t("saveStatus.failedWith", { error }) : t("saveStatus.failed")}
        </span>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="ml-1 underline hover:no-underline"
          >
            {t("saveStatus.retry")}
          </button>
        )}
      </span>
    );
  }
  return null;
}
