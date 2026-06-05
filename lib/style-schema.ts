import { z } from "zod";

const colorString = z.string().regex(/^#[0-9a-fA-F]{3,8}$/);

export const H1_VARIANTS = ["title-classic", "title-ornamental"] as const;
export const H2_VARIANTS = [
  "section-decorated",
  "section-number-badge",
  "section-banner",
] as const;
export const H3_VARIANTS = ["title-classic", "h3-number-badge"] as const;
export const BLOCKQUOTE_VARIANTS = [
  "quote-card-classic",
  "quote-card-stamp",
  "quote-card-tinted",
] as const;
export const DIVIDER_VARIANTS = [
  "hr-line",
  "hr-ornamental",
  "hr-dashed-dots",
] as const;
export const IMG_VARIANTS = ["img-framed", "img-spotlight"] as const;

export const ARTICLE_WRAPPER_VARIANTS = ["plain", "bordered"] as const;

export const OVERRIDE_TYPES = ["opening-card", "ending-card", "callout-box"] as const;
export const HERO_PLACEMENTS = ["before-opening", "as-cover"] as const;

const themeSchema = z
  .object({
    primary: colorString.optional().catch(undefined),
    secondary: colorString.optional().catch(undefined),
    background: colorString.optional().catch(undefined),
    text: colorString.optional().catch(undefined),
    secondaryText: colorString.optional().catch(undefined),
    quoteBg: colorString.optional().catch(undefined),
    codeBg: colorString.optional().catch(undefined),
    codeText: colorString.optional().catch(undefined),
    accentDecorative: colorString.optional().catch(undefined),
  })
  .catch({});

const componentsSchema = z
  .object({
    h1: z.enum(H1_VARIANTS).optional().catch(undefined),
    h2: z.enum(H2_VARIANTS).optional().catch(undefined),
    h3: z.enum(H3_VARIANTS).optional().catch(undefined),
    blockquote: z.enum(BLOCKQUOTE_VARIANTS).optional().catch(undefined),
    divider: z.enum(DIVIDER_VARIANTS).optional().catch(undefined),
    img: z.enum(IMG_VARIANTS).optional().catch(undefined),
    articleWrapper: z.enum(ARTICLE_WRAPPER_VARIANTS).optional().catch(undefined),
  })
  .catch({});

const anchorSchema = z.union([
  z.literal("first"),
  z.literal("last"),
  z.object({ headingMatch: z.string() }),
]);

const overrideSchema = z
  .object({
    anchor: anchorSchema,
    type: z.enum(OVERRIDE_TYPES),
    props: z.record(z.any()).optional().catch({}),
  })
  .catch(null as any);

const heroSchema = z
  .object({
    prompt: z.string().optional().catch(undefined),
    url: z.string().nullable().optional().catch(null),
    placement: z.enum(HERO_PLACEMENTS).optional().catch("before-opening"),
  })
  .catch({});

const metaSchema = z
  .object({
    modelUsed: z.string().optional().catch(undefined),
    generatedAt: z.string().optional().catch(undefined),
    _warnings: z.array(z.string()).optional().catch([]),
  })
  .catch({});

export const styleJsonSchema = z
  .object({
    theme: themeSchema.optional().catch({}),
    components: componentsSchema.optional().catch({}),
    overrides: z
      .array(overrideSchema)
      .optional()
      .catch([])
      .transform((arr) =>
        arr === undefined
          ? undefined
          : arr.filter((x): x is NonNullable<typeof x> => !!x)
      ),
    hero: heroSchema.optional().catch({}),
    meta: metaSchema.optional().catch({}),
  })
  .catch({} as any);

export type StyleJson = z.infer<typeof styleJsonSchema>;
export type StyleTheme = NonNullable<StyleJson["theme"]>;
export type StyleComponents = NonNullable<StyleJson["components"]>;
export type StyleOverride = NonNullable<NonNullable<StyleJson["overrides"]>[number]>;
export type StyleHero = NonNullable<StyleJson["hero"]>;

export const DEFAULT_THEME: Required<StyleTheme> = {
  primary: "#07C160",
  secondary: "#03894E",
  background: "#FFFFFF",
  text: "#1F1F1F",
  secondaryText: "#555555",
  quoteBg: "#F7F7F7",
  codeBg: "#F4F4F4",
  codeText: "#C7254E",
  accentDecorative: "#07C160",
};

export const DEFAULT_COMPONENTS: Required<StyleComponents> = {
  h1: "title-classic",
  h2: "section-decorated",
  h3: "title-classic",
  blockquote: "quote-card-classic",
  divider: "hr-line",
  img: "img-framed",
  articleWrapper: "plain",
};

export const DEFAULT_STYLE_JSON: StyleJson = {
  theme: DEFAULT_THEME,
  components: DEFAULT_COMPONENTS,
  overrides: [],
  hero: { url: null, placement: "before-opening" },
  meta: {},
};

/**
 * 合并 input styleJson 与默认值。任何字段缺失/不合法都回到默认。
 * - input 通常已经过 zod parse；但为安全起见此处也容忍任意输入。
 */
export function resolveStyleJson(input: unknown): {
  theme: Required<StyleTheme>;
  components: Required<StyleComponents>;
  overrides: StyleOverride[];
  hero: { prompt?: string; url: string | null; placement: "before-opening" | "as-cover" };
  meta: NonNullable<StyleJson["meta"]>;
} {
  const parsed = styleJsonSchema.safeParse(input);
  const sj: StyleJson = parsed.success ? parsed.data : {};
  return {
    theme: { ...DEFAULT_THEME, ...(sj.theme ?? {}) },
    components: { ...DEFAULT_COMPONENTS, ...(sj.components ?? {}) },
    overrides: (sj.overrides ?? []) as StyleOverride[],
    hero: {
      prompt: sj.hero?.prompt,
      url: sj.hero?.url ?? null,
      placement: (sj.hero?.placement ?? "before-opening") as "before-opening" | "as-cover",
    },
    meta: sj.meta ?? {},
  };
}
