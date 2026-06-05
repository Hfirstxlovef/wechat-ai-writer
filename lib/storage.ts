import { promises as fs } from "fs";
import path from "path";
import { nanoid } from "nanoid";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

function todayDir(): string {
  return new Date().toISOString().slice(0, 10);
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

export function publicUrl(key: string): string {
  return `/uploads/${key}`;
}

export async function uploadBuffer(opts: {
  buffer: Buffer;
  key?: string;
  ext?: string;
  mimeType?: string;
}): Promise<{ key: string; url: string }> {
  const ext = (opts.ext || "png").replace(/^\./, "");
  const key = opts.key || `${todayDir()}/${nanoid(16)}.${ext}`;
  const fullPath = path.join(UPLOAD_ROOT, key);
  await ensureDir(path.dirname(fullPath));
  await fs.writeFile(fullPath, opts.buffer);
  return { key, url: publicUrl(key) };
}

export async function uploadFromUrl(opts: {
  remoteUrl: string;
  key?: string;
}): Promise<{ key: string; url: string }> {
  const res = await fetch(opts.remoteUrl);
  if (!res.ok) throw new Error(`fetch remote image failed: ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const contentType = res.headers.get("content-type") || "image/png";
  const ext = contentType.split("/")[1]?.split(";")[0] || "png";
  return uploadBuffer({ buffer, key: opts.key, ext, mimeType: contentType });
}

export async function uploadBase64(opts: {
  b64: string;
  ext?: string;
  mimeType?: string;
  key?: string;
}): Promise<{ key: string; url: string }> {
  const buffer = Buffer.from(opts.b64, "base64");
  return uploadBuffer({
    buffer,
    key: opts.key,
    ext: opts.ext,
    mimeType: opts.mimeType,
  });
}

export function localPathFromUrl(url: string): string | null {
  if (!url.startsWith("/uploads/")) return null;
  const rel = url.replace(/^\/uploads\//, "");
  return path.join(UPLOAD_ROOT, rel);
}
