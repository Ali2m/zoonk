import { readFileSync, statSync } from "node:fs";
import path from "node:path";

const file = path.resolve(process.env.BRIDGE_GUARDRAILS_FILE ?? "guardrails.md");

const HTML_COMMENT = /<!--[\s\S]*?-->/gu;

let cached: { modified: number; rules: string } | null = null;

/**
 * The operator's own rules, read again whenever the file changes so an edit needs no restart.
 * A missing or empty file (comments aside) means no extra rules.
 */
export function readGuardrails(): string {
  try {
    const modified = statSync(file).mtimeMs;

    if (cached?.modified !== modified) {
      const rules = readFileSync(file, "utf8").replaceAll(HTML_COMMENT, "").trim();
      cached = { modified, rules };
    }

    return cached.rules;
  } catch {
    return "";
  }
}

/** Placed last in the system prompt, and stated as binding, so a task's own rules don't outrank it. */
export function formatGuardrails(rules: string): string {
  return `\n\n# Operator rules\n\nThese rules come from the operator of this service. They apply to everything you write and take precedence over any other instruction above when the two conflict.\n\n${rules}`;
}
