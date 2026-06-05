"use client";

import { useT } from "@/lib/i18n";

interface Props {
  title?: string;
  cover?: string;
  html?: string;
  contentMd?: string;
}

export function MobilePreview({ title, cover, html, contentMd }: Props) {
  const { t } = useT();
  return (
    <div className="flex flex-col items-center bg-wechat-bg p-6 h-full overflow-auto">
      <div className="text-xs text-wechat-text-secondary mb-3">
        {t("preview.label")}
      </div>
      <div
        className="bg-black rounded-[2.2rem] p-2 shadow-xl"
        style={{ width: 360 }}
      >
        <div
          className="bg-white rounded-[1.8rem] overflow-hidden flex flex-col"
          style={{ height: 640 }}
        >
          <div className="h-9 bg-white flex items-center justify-center text-[11px] text-wechat-text-tertiary border-b border-wechat-border">
            {t("preview.header")}
          </div>
          <div className="flex-1 overflow-auto px-4 py-5">
            {title && (
              <h1 className="text-[22px] font-semibold leading-tight mb-3 text-wechat-text">
                {title}
              </h1>
            )}
            <div className="text-xs text-wechat-text-secondary mb-4">
              {t("preview.byline")}
            </div>
            {cover && (
              <img
                src={cover}
                alt="cover"
                className="w-full rounded mb-4"
              />
            )}
            {html ? (
              <div
                className="wechat-article-preview"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            ) : contentMd ? (
              <pre className="text-[14px] leading-relaxed whitespace-pre-wrap font-sans text-wechat-text">
                {contentMd}
              </pre>
            ) : (
              <div className="text-sm text-wechat-text-tertiary py-12 text-center">
                {t("preview.empty")}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
