/**
 * The question formats an assessment blueprint may ask for. The first group is written by the item
 * tasks (`tasks/items`); the second by `writeInteractiveItems`, for the interactions a question
 * bank offers beyond those.
 */
export const ITEM_TASK_FORMATS = [
  "multipleChoice",
  "multipleSelect",
  "trueFalse",
  "numeric",
  "typed",
  "essay",
  "matchPairs",
  "order",
] as const;

export const INTERACTIVE_FORMATS = [
  "imageChoice",
  "fillBlanks",
  "wordBank",
  "dropdown",
  "classify",
  "crossword",
  "shading",
  "barChart",
  "plotPoint",
] as const;

export const ASSESSMENT_FORMATS = [...ITEM_TASK_FORMATS, ...INTERACTIVE_FORMATS] as const;

export type InteractiveFormat = (typeof INTERACTIVE_FORMATS)[number];
export type AssessmentFormat = (typeof ASSESSMENT_FORMATS)[number];
