import { AsyncLocalStorage } from "node:async_hooks";
import { type LanguageModelMiddleware } from "ai";
import { formatGuardrails, readGuardrails } from "./guardrails";
import { findKnowledge, formatKnowledge } from "./knowledge";

type TransformParams = NonNullable<LanguageModelMiddleware["transformParams"]>;
type CallPrompt = Parameters<TransformParams>[0]["params"]["prompt"];

/** What a request wants looked up in the knowledge base; unset for calls that take none. */
const knowledgeQuery = new AsyncLocalStorage<string>();

/** Every model call made inside `run` gets the knowledge-base passages that match `query`. */
export function withKnowledge<Result>(query: string, run: () => Promise<Result>): Promise<Result> {
  return knowledgeQuery.run(query, run);
}

function addGuardrails(prompt: CallPrompt, rules: string): CallPrompt {
  const leading = prompt.findIndex((message) => message.role !== "system");
  const lastSystem = (leading === -1 ? prompt.length : leading) - 1;

  if (lastSystem < 0) {
    return [{ content: formatGuardrails(rules).trim(), role: "system" }, ...prompt];
  }

  return prompt.map((message, index) =>
    index === lastSystem && message.role === "system"
      ? { ...message, content: message.content + formatGuardrails(rules) }
      : message,
  );
}

/** After the task's own input, since the passages change per call and the system prompt is cached. */
function addKnowledge(prompt: CallPrompt, text: string): CallPrompt {
  const lastUser = prompt.findLastIndex((message) => message.role === "user");

  return prompt.map((message, index) =>
    index === lastUser && message.role === "user"
      ? { ...message, content: [...message.content, { text, type: "text" as const }] }
      : message,
  );
}

/**
 * The operator's two files reach every task without the tasks knowing about them: the guardrails
 * go on every call, the knowledge-base passages on the calls a route asked them for.
 */
export const promptAdditionsMiddleware: LanguageModelMiddleware = {
  transformParams: async ({ params }) => {
    const rules = readGuardrails();
    const query = knowledgeQuery.getStore();
    const passages = query ? findKnowledge(query) : [];
    let { prompt } = params;

    if (rules) {
      prompt = addGuardrails(prompt, rules);
    }

    if (passages.length > 0) {
      console.info(
        `knowledge: ${[...new Set(passages.map((passage) => passage.source))].join(", ")}`,
      );
      prompt = addKnowledge(prompt, formatKnowledge(passages));
    }

    return { ...params, prompt };
  },
};
