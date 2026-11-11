import { type IncomingMessage, type ServerResponse, createServer } from "node:http";
import { zoonkDefaultProvider } from "@zoonk/ai/gateway";
import { wrapProvider } from "ai";
import { ZodError } from "zod";
import { PORT, readAsset } from "./assets";
import { readGuardrails } from "./guardrails";
import { knowledgeStatus } from "./knowledge";
import { promptAdditionsMiddleware } from "./prompt-additions";
import { ROUTES } from "./routes";

const MAX_BODY_BYTES = 256_000;
const OK = 200;
const BAD_REQUEST = 400;
const NOT_FOUND = 404;
const TOO_LARGE = 413;
const FAILED = 502;
const NOT_CONFIGURED = 503;

/**
 * Tasks name their model by gateway id, which the AI SDK resolves through this provider. The
 * operator's guardrails and knowledge base are added here, around every task's own prompt.
 */
globalThis.AI_SDK_DEFAULT_PROVIDER = wrapProvider({
  languageModelMiddleware: [promptAdditionsMiddleware],
  provider: zoonkDefaultProvider,
});

function hasCredentials(): boolean {
  return Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN);
}

function send(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of request) {
    const buffer: Buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;

    if (size > MAX_BODY_BYTES) {
      throw new RangeError("Request body too large.");
    }

    chunks.push(buffer);
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

async function serveAsset(response: ServerResponse, name: string): Promise<void> {
  const asset = await readAsset(name);

  if (!asset) {
    send(response, NOT_FOUND, { error: { message: "Not found." } });
    return;
  }

  response.writeHead(OK, {
    "access-control-allow-origin": "*",
    "cache-control": "public, max-age=31536000, immutable",
    "content-type": asset.mediaType,
    "x-content-type-options": "nosniff",
  });

  response.end(asset.data);
}

/** A caller sees which kind of failure it was, never a provider's raw error text. */
function sendFailure(response: ServerResponse, error: unknown): void {
  if (error instanceof ZodError || error instanceof SyntaxError) {
    const details = error instanceof ZodError ? error.issues : undefined;
    send(response, BAD_REQUEST, { error: { details, message: "Invalid request." } });
    return;
  }

  if (error instanceof RangeError) {
    send(response, TOO_LARGE, { error: { message: error.message } });
    return;
  }

  console.error(error);
  send(response, FAILED, { error: { message: "The generation failed. Try again." } });
}

async function handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const { pathname } = new URL(request.url ?? "/", "http://localhost");

  if (request.method === "GET" && pathname === "/v1/health") {
    send(response, OK, {
      guardrails: readGuardrails().length > 0,
      knowledge: knowledgeStatus(),
      ready: hasCredentials(),
    });
    return;
  }

  if (request.method === "GET" && pathname.startsWith("/assets/")) {
    await serveAsset(response, pathname.slice("/assets/".length));
    return;
  }

  const route = request.method === "POST" ? ROUTES[pathname] : undefined;

  if (!route) {
    send(response, NOT_FOUND, { error: { message: "Not found." } });
    return;
  }

  // Drawing a chart from its data needs no model.
  if (!hasCredentials() && pathname !== "/v1/visuals") {
    send(response, NOT_CONFIGURED, {
      error: { message: "Set AI_GATEWAY_API_KEY in apps/assessment-bridge/.env to generate." },
    });
    return;
  }

  try {
    send(response, OK, await route(await readJson(request)));
  } catch (error) {
    sendFailure(response, error);
  }
}

/** Bound to this machine only: the routes spend the gateway key and have no login of their own. */
createServer((request, response) => {
  void handle(request, response);
}).listen(PORT, "127.0.0.1", () => {
  console.info(`assessment-bridge on http://localhost:${PORT} (ready: ${hasCredentials()})`);
});
