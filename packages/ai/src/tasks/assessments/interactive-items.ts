import "server-only";
import { Output, generateText } from "ai";
import { z } from "zod";
import { type AiGenerationContext } from "../../provenance/ai-generation-event";
import { runTaskGeneration } from "../../provenance/run-task-generation";
import { type Reasoning, type ServiceTier, buildProviderOptions } from "../../provider-options";
import { getPromptLanguageName } from "../_utils/prompt-language";
import { selectPromptVariants } from "../_utils/prompt-variants";
import { INTERACTIVE_FORMATS, type InteractiveFormat } from "./assessment-formats";
import promptTemplate from "./interactive-items.prompt.md";

/** The item writers' models (`tasks/items`). Not yet chosen by an eval of its own. */
const defaultModel = "openai/gpt-6.1-terra";
const fallbackModels = ["anthropic/claude-opus-5.5"] as const;

const DEFAULT_COUNT = 2;
const MAX_COUNT = 6;
const DEFAULT_OPTION_COUNT = 4;
const MAX_BLANKS = 5;
const MAX_GRID_SIDE = 6;
const MAX_BARS = 6;

const difficulty = z.enum(["easy", "medium", "hard"]);

/* oxlint-disable eslint/sort-keys -- Structured output follows schema property order: the question comes before its key and the reason for it. */
const imageChoiceItem = z.object({
  format: z.literal("imageChoice"),
  difficulty,
  question: z.string(),
  options: z
    .array(
      z.object({
        picture: z.object({ prompt: z.string(), alt: z.string() }),
        label: z.string(),
        isCorrect: z.boolean(),
      }),
    )
    .min(2)
    .max(4),
  reason: z.string(),
});

const fillBlanksItem = z.object({
  format: z.literal("fillBlanks"),
  difficulty,
  instruction: z.string(),
  text: z.string(),
  blanks: z
    .array(z.object({ acceptedAnswers: z.array(z.string()).min(1) }))
    .min(1)
    .max(MAX_BLANKS),
  reason: z.string(),
});

const wordBankItem = z.object({
  format: z.literal("wordBank"),
  difficulty,
  instruction: z.string(),
  text: z.string(),
  blanks: z
    .array(z.object({ answer: z.string() }))
    .min(1)
    .max(MAX_BLANKS),
  distractors: z.array(z.string()),
  reason: z.string(),
});

const dropdownItem = z.object({
  format: z.literal("dropdown"),
  difficulty,
  instruction: z.string(),
  text: z.string(),
  blanks: z
    .array(z.object({ options: z.array(z.string()).min(2), correct: z.number().int().min(0) }))
    .min(1)
    .max(MAX_BLANKS),
  reason: z.string(),
});

const classifyItem = z.object({
  format: z.literal("classify"),
  difficulty,
  question: z.string(),
  categories: z
    .array(z.object({ name: z.string(), items: z.array(z.string()).min(1) }))
    .min(2)
    .max(4),
  reason: z.string(),
});
const crosswordItem = z.object({
  format: z.literal("crossword"),
  difficulty,
  instruction: z.string(),
  words: z
    .array(z.object({ answer: z.string(), clue: z.string() }))
    .min(3)
    .max(8),
  reason: z.string(),
});

const shadingItem = z.object({
  format: z.literal("shading"),
  difficulty,
  question: z.string(),
  rows: z.number().int().min(1).max(MAX_GRID_SIDE),
  columns: z.number().int().min(1).max(MAX_GRID_SIDE),
  shaded: z.number().int().min(1),
  reason: z.string(),
});

const barChartItem = z.object({
  format: z.literal("barChart"),
  difficulty,
  question: z.string(),
  categoryLabel: z.string(),
  valueLabel: z.string(),
  bars: z
    .array(z.object({ label: z.string(), value: z.number().int().min(0) }))
    .min(2)
    .max(MAX_BARS),
  interval: z.number().int().min(1),
  reason: z.string(),
});

const plotPointItem = z.object({
  format: z.literal("plotPoint"),
  difficulty,
  question: z.string(),
  x: z.number().int(),
  y: z.number().int(),
  reason: z.string(),
});
/* oxlint-enable eslint/sort-keys */

/** One output schema per format keeps each call's structured output small and exact. */
export const INTERACTIVE_ITEM_SCHEMAS = {
  barChart: barChartItem,
  classify: classifyItem,
  crossword: crosswordItem,
  dropdown: dropdownItem,
  fillBlanks: fillBlanksItem,
  imageChoice: imageChoiceItem,
  plotPoint: plotPointItem,
  shading: shadingItem,
  wordBank: wordBankItem,
} as const satisfies Record<InteractiveFormat, z.ZodType>;

export type InteractiveItem = z.infer<(typeof INTERACTIVE_ITEM_SCHEMAS)[InteractiveFormat]>;

export type InteractiveItemsParams = {
  skill: { name: string; description: string };
  format: InteractiveFormat;
  level: "beginner" | "intermediate" | "advanced";
  language: string;
  count?: number;
  examStyle?: string | null;
  optionCount?: number | null;
  analytics?: AiGenerationContext;
  model?: string;
  reasoning?: Reasoning;
  serviceTier?: ServiceTier;
  useFallback?: boolean;
};

function buildUserPrompt(params: InteractiveItemsParams): string {
  const optionCount =
    params.format === "imageChoice"
      ? `\n    OPTION_COUNT: ${Math.min(params.optionCount ?? DEFAULT_OPTION_COUNT, DEFAULT_OPTION_COUNT)}`
      : "";

  return `
    FORMAT: ${params.format}
    COUNT: ${Math.min(params.count ?? DEFAULT_COUNT, MAX_COUNT)}${optionCount}
    LEVEL: ${params.level}
    LANGUAGE: ${getPromptLanguageName({ language: params.language })}
    SKILL: ${params.skill.name}
    SKILL_DESCRIPTION: ${params.skill.description}
    EXAM_STYLE: ${params.examStyle ?? "a clear classroom test"}
  `;
}

/**
 * Questions in the interactions a question bank offers beyond the item tasks' formats. Library
 * content: the prompt holds a skill and an exam's style, never a learner's words.
 */
export async function writeInteractiveItems(params: InteractiveItemsParams) {
  const {
    analytics,
    format,
    model = defaultModel,
    reasoning,
    serviceTier,
    useFallback = true,
  } = params;

  const systemPrompt = selectPromptVariants({
    template: promptTemplate,
    variants: Object.fromEntries(INTERACTIVE_FORMATS.map((name) => [name, name === format])),
  });

  const userPrompt = buildUserPrompt(params);
  const schema = z.object({ items: z.array(INTERACTIVE_ITEM_SCHEMAS[format]) });
  const providerOptions = buildProviderOptions({ fallbackModels, model, serviceTier, useFallback });

  const { provenance, result } = await runTaskGeneration({
    analytics,
    generate: () =>
      generateText({
        instructions: systemPrompt,
        model,
        output: Output.object({ schema }),
        prompt: userPrompt,
        providerOptions,
        reasoning,
      }),
    libraryInput: true,
    systemPrompt,
    task: "interactive-items",
  });

  const items: InteractiveItem[] = result.output.items;

  return { data: { items }, provenance, systemPrompt, usage: result.usage, userPrompt };
}
