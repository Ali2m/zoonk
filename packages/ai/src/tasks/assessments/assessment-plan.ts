import "server-only";
import { Output, generateText } from "ai";
import { z } from "zod";
import { formatUntrustedInput } from "../../evaluate/untrusted-input";
import { type AiGenerationContext } from "../../provenance/ai-generation-event";
import { runTaskGeneration } from "../../provenance/run-task-generation";
import { type Reasoning, type ServiceTier, buildProviderOptions } from "../../provider-options";
import { getPromptLanguageName } from "../_utils/prompt-language";
import systemPrompt from "./assessment-plan.prompt.md";

/**
 * The item writers' models, since the blueprint decides what they write. Not yet chosen by an
 * eval of its own: this task has no eval cases.
 */
const defaultModel = "openai/gpt-6.1-terra";
const fallbackModels = ["anthropic/claude-opus-5.5"] as const;

const DEFAULT_TOTAL_MINUTES = 45;
const DEFAULT_MAX_QUESTIONS = 24;
const MAX_GROUP_COUNT = 6;
const MIN_PASS_PERCENT = 40;
const MAX_PASS_PERCENT = 90;

/** The item formats a blueprint may ask for: the ones a question bank can grade on its own. */
export const ASSESSMENT_FORMATS = [
  "multipleChoice",
  "trueFalse",
  "numeric",
  "typed",
  "matchPairs",
  "order",
] as const;

export type AssessmentFormat = (typeof ASSESSMENT_FORMATS)[number];

/* oxlint-disable eslint/sort-keys -- Structured output follows schema property order: what a group tests comes before how it tests it. */
const groupSchema = z.object({
  skill: z.string(),
  skillDescription: z.string(),
  format: z.enum(ASSESSMENT_FORMATS),
  count: z.number().int().min(1).max(MAX_GROUP_COUNT),
  level: z.enum(["beginner", "intermediate", "advanced"]),
  difficulty: z.enum(["easy", "medium", "hard"]),
  pictures: z.boolean(),
  sharedStimulus: z.boolean(),
  optionCount: z.number().int().nullable(),
});

const sectionSchema = z.object({
  title: z.string(),
  shuffle: z.boolean(),
  minutes: z.number().nullable(),
  groups: z.array(groupSchema).min(1),
});

const partSchema = z.object({
  title: z.string(),
  purpose: z.string(),
  navigation: z.enum(["linear", "nonlinear"]),
  screening: z.boolean(),
  minutes: z.number(),
  sections: z.array(sectionSchema).min(1),
});

const schema = z.object({
  title: z.string(),
  description: z.string(),
  subject: z.string(),
  examName: z.string().nullable(),
  examStyle: z.string(),
  parts: z.array(partSchema).min(1),
  passPercent: z.number().min(MIN_PASS_PERCENT).max(MAX_PASS_PERCENT),
  bands: z.array(z.object({ label: z.string(), minPercent: z.number(), message: z.string() })),
});
/* oxlint-enable eslint/sort-keys */

export type AssessmentPlan = z.infer<typeof schema>;
export type AssessmentPlanGroup = z.infer<typeof groupSchema>;

export type AssessmentPlanInput = {
  goal: string;
  /** The follow-up questions the learner answered, in the order asked. */
  answers?: readonly { question: string; answer: string }[];
  language: string;
  maxQuestions?: number;
  /** For relative dates. */
  today: string;
  totalMinutes?: number;
};

export type AssessmentPlanParams = AssessmentPlanInput & {
  analytics?: AiGenerationContext;
  model?: string;
  reasoning?: Reasoning;
  serviceTier?: ServiceTier;
  useFallback?: boolean;
};

function formatAnswers(answers: AssessmentPlanInput["answers"]): string {
  if (!answers?.length) {
    return "none";
  }

  return answers.map(({ answer, question }) => `Q: ${question}\nA: ${answer}`).join("\n\n");
}

function buildUserPrompt(input: AssessmentPlanInput): string {
  return `
    LANGUAGE: ${getPromptLanguageName({ language: input.language })}
    TODAY: ${input.today}
    TOTAL_MINUTES: ${input.totalMinutes ?? DEFAULT_TOTAL_MINUTES}
    MAX_QUESTIONS: ${input.maxQuestions ?? DEFAULT_MAX_QUESTIONS}

${formatUntrustedInput({ ANSWERS: formatAnswers(input.answers), GOAL: input.goal })}
  `;
}

/**
 * The blueprint of one assessment (parts, sections and groups of questions) for a learner's goal.
 * The prompt holds the learner's own words, so it is never Library input.
 */
export async function planAssessment(params: AssessmentPlanParams) {
  const { analytics, model = defaultModel, reasoning, serviceTier, useFallback = true } = params;
  const userPrompt = buildUserPrompt(params);
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
    systemPrompt,
    task: "assessment-plan",
  });

  const data: AssessmentPlan = result.output;

  return { data, provenance, systemPrompt, usage: result.usage, userPrompt };
}
