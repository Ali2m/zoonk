import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_PORT = 4310;

export const PORT = Number(process.env.BRIDGE_PORT ?? DEFAULT_PORT);

const dataDir = path.resolve(process.env.BRIDGE_DATA_DIR ?? ".data", "assets");
const publicUrl = process.env.BRIDGE_PUBLIC_URL ?? `http://localhost:${PORT}`;

const EXTENSIONS: Readonly<Record<string, string>> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/svg+xml": "svg",
  "image/webp": "webp",
};

const MEDIA_TYPES = Object.fromEntries(
  Object.entries(EXTENSIONS).map(([mediaType, extension]) => [extension, mediaType]),
);

/** Names are generated here and checked on the way out, so a request can't reach another file. */
const ASSET_NAME = /^[\da-f-]{36}\.(?:jpg|png|svg|webp)$/u;

/**
 * Pictures are kept on this machine's disk and served from `/assets`. A deployment puts an object
 * store behind this one function.
 */
export async function saveAsset({
  data,
  mediaType,
}: {
  data: Uint8Array;
  mediaType: string;
}): Promise<string> {
  const extension = EXTENSIONS[mediaType];

  if (!extension) {
    throw new Error(`Can't store a ${mediaType} file.`);
  }

  const name = `${randomUUID()}.${extension}`;

  await mkdir(dataDir, { recursive: true });
  await writeFile(path.join(dataDir, name), data);

  return `${publicUrl}/assets/${name}`;
}

export async function readAsset(
  name: string,
): Promise<{ data: Uint8Array; mediaType: string } | null> {
  const extension = name.split(".").at(-1);
  const mediaType = extension ? MEDIA_TYPES[extension] : undefined;

  if (!ASSET_NAME.test(name) || !mediaType) {
    return null;
  }

  try {
    return { data: await readFile(path.join(dataDir, name)), mediaType };
  } catch {
    return null;
  }
}
