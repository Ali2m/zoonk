import { planAssessment } from "@zoonk/ai/tasks/assessments/plan";
import { understandGoal } from "@zoonk/ai/tasks/goals/understand-goal";
import { generateLessonImage } from "@zoonk/ai/tasks/images/generate";
import { generateImageScene } from "@zoonk/ai/tasks/images/scene";
import { getImagePalette } from "@zoonk/ai/tasks/images/style";
import { generateItems } from "@zoonk/ai/tasks/items/generate";
import { writeItemSet } from "@zoonk/ai/tasks/items/write-set";
import { lessonVisualSchema } from "@zoonk/ai/tasks/visuals/schema";
import { z } from "zod";
import { saveAsset } from "./assets";
import { drawVisual } from "./draw-visual";

const MAX_GOAL_LENGTH = 2000;
const MAX_ANSWER_LENGTH = 1000;
const MAX_TEXT_LENGTH = 4000;
const DAILY_MINUTES_LIMITS = { max: 240, min: 5 };

/** Unset in production; a local setup with one provider's models can name the one to use. */
const textModel = process.env.BRIDGE_TEXT_MODEL
  ? { model: process.env.BRIDGE_TEXT_MODEL, useFallback: false }
  : {};

const imageModel = process.env.BRIDGE_IMAGE_MODEL
  ? { model: process.env.BRIDGE_IMAGE_MODEL, useFallback: false }
  : {};

function today(): string {
  return new Date().toISOString().slice(0, "YYYY-MM-DD".length);
}

const language = z.string().min(2).max(12).default("en");
const level = z.enum(["overview", "beginner", "intermediate", "advanced"]);

const examFormat = z
  .object({
    name: z.string().max(200).nullable(),
    optionCount: z.number().int().min(2).max(8).nullish(),
    style: z.string().max(MAX_TEXT_LENGTH),
  })
  .nullish();

const skill = z.object({
  description: z.string().max(MAX_TEXT_LENGTH),
  name: z.string().min(1).max(300),
});

const goalAnalysisInput = z.object({ goal: z.string().min(1).max(MAX_GOAL_LENGTH), language });

const assessmentPlanInput = z.object({
  answers: z
    .array(
      z.object({
        answer: z.string().max(MAX_ANSWER_LENGTH),
        question: z.string().max(MAX_ANSWER_LENGTH),
      }),
    )
    .max(12)
    .default([]),
  goal: z.string().min(1).max(MAX_GOAL_LENGTH),
  language,
  maxQuestions: z.number().int().min(3).max(60).optional(),
  totalMinutes: z.number().int().min(5).max(300).optional(),
});

const itemsInput = z.object({
  count: z.number().int().min(1).max(10),
  examFormat,
  format: z.enum(["multipleChoice", "trueFalse", "numeric", "typed", "matchPairs", "order"]),
  language,
  level,
  skill,
});

const itemSetInput = z.object({
  examFormat,
  format: z.enum(["multipleChoice", "trueFalse"]),
  language,
  questionCount: z.number().int().min(2).max(5),
  skills: z.array(skill.extend({ level })).min(1).max(4),
  usedTitles: z.array(z.string().max(300)).max(20).optional(),
});

const imageInput = z.object({
  alt: z.string().max(MAX_ANSWER_LENGTH).nullish(),
  canvas: z.enum(["landscape", "square"]).default("landscape"),
  category: z.string().max(60).nullish(),
  context: z.string().max(MAX_TEXT_LENGTH).nullish(),
  language,
  prompt: z.string().min(1).max(MAX_TEXT_LENGTH),
});

const visualInput = z.object({ visual: lessonVisualSchema });

/** What the learner meant, and up to two things worth asking before planning. */
async function analyzeGoal(body: unknown) {
  const input = goalAnalysisInput.parse(body);

  const { data } = await understandGoal({
    ...textModel,
    dailyMinutesLimits: DAILY_MINUTES_LIMITS,
    goal: input.goal,
    language: input.language,
    today: today(),
  });

  return data;
}

async function planFromGoal(body: unknown) {
  const input = assessmentPlanInput.parse(body);
  const { data } = await planAssessment({ ...textModel, ...input, today: today() });

  return data;
}

async function writeItems(body: unknown) {
  const input = itemsInput.parse(body);
  const { data } = await generateItems({ ...textModel, ...input });

  return data;
}

async function writeSet(body: unknown) {
  const input = itemSetInput.parse(body);
  const { data } = await writeItemSet({ ...textModel, ...input });

  return data;
}

/** The scene is planned first, so the picture follows the same style rules as a lesson's. */
async function drawImage(body: unknown) {
  const input = imageInput.parse(body);

  const scene = await generateImageScene({
    ...textModel,
    alt: input.alt,
    context: input.context,
    language: input.language,
    request: input.prompt,
    textAllowed: true,
  });

  const { data } = await generateLessonImage({
    ...imageModel,
    canvas: input.canvas,
    language: input.language,
    palette: getImagePalette(input.category),
    scene: scene.data,
  });

  const url = await saveAsset({ data: data.image.uint8Array, mediaType: data.image.mediaType });

  return { alt: input.alt ?? null, ratio: input.canvas === "square" ? "1/1" : "3/2", url };
}

/** Charts and timelines are drawn from their data, so the numbers always match the question. */
async function drawVisualAsset(body: unknown) {
  const { visual } = visualInput.parse(body);
  const drawing = drawVisual(visual);

  const url = await saveAsset({
    data: new TextEncoder().encode(drawing.svg),
    mediaType: "image/svg+xml",
  });

  return { alt: visual.title, ratio: drawing.ratio, url };
}

export const ROUTES: Readonly<Record<string, (body: unknown) => Promise<unknown>>> = {
  "/v1/assessment-plans": planFromGoal,
  "/v1/goal-analyses": analyzeGoal,
  "/v1/images": drawImage,
  "/v1/item-sets": writeSet,
  "/v1/items": writeItems,
  "/v1/visuals": drawVisualAsset,
};
