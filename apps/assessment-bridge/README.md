# Assessment bridge

A small HTTP server that puts the AI tasks in `@zoonk/ai` behind JSON routes, so a tool outside this monorepo can turn a learner's goal ("get ready for the SAT in December") into an assessment: a blueprint of parts, sections and question groups, then the questions and their pictures.

It has no database and no login. It listens on `127.0.0.1` only, because every route spends the gateway key.

## Run it

```sh
cp .env.example .env   # set AI_GATEWAY_API_KEY
pnpm --filter assessment-bridge start
```

It runs the TypeScript sources directly with `tsx`, as `apps/evals` does: `--conditions=react-server` satisfies the tasks' `server-only` import, and `scripts/register-markdown.mts` loads their `.prompt.md` files.

## Routes

All `POST` routes take and return JSON. Errors are `{ "error": { "message" } }`.

| Route                        | Task                                        | Returns                                                                                                        |
| ---------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `GET /v1/health`             |                                             | `{ ready }`: whether a gateway key is set                                                                      |
| `POST /v1/goal-analyses`     | `understandGoal`                            | What the learner meant, and up to 2 follow-up questions                                                        |
| `POST /v1/assessment-plans`  | `planAssessment`                            | The blueprint: parts, sections, groups, result bands                                                           |
| `POST /v1/items`             | `generateItems`                             | Questions for one skill in one format                                                                          |
| `POST /v1/interactive-items` | `writeInteractiveItems`                     | Picture choice, blanks, word bank, dropdown, classification, crossword, grid shading, bar chart, plotted point |
| `POST /v1/item-sets`         | `writeItemSet`                              | A shared passage, case or chart with its questions                                                             |
| `POST /v1/images`            | `generateImageScene`, `generateLessonImage` | `{ url, ratio, alt }` of a stored picture                                                                      |
| `POST /v1/visuals`           | (no model)                                  | `{ url, ratio, alt }` of a chart or timeline drawn as SVG from its data                                        |
| `GET /assets/{name}`         |                                             | A stored picture                                                                                               |

Request shapes are the zod schemas at the top of `src/routes.ts`.

The blueprint's sections may hold sub-sections and carry a `role`: with `adaptive` on (the default), `support` and `extension` sections are ones a caller routes a learner past or leaves out. The formats a blueprint can ask for are listed in `packages/ai/src/tasks/assessments/assessment-formats.ts`.

Questions come back with math in LaTeX between `\(` and `\)` (the item tasks' `latexMath` option), for callers that typeset it. A numeric question is a template: its text names values as `{name}`, and `math.variables` holds the values it was written with.

Pictures are written to `BRIDGE_DATA_DIR` (default `.data`) and served from `/assets`. A deployment replaces `saveAsset` in `src/assets.ts` with an object store.

## What is not here

`planAssessment` and `writeInteractiveItems` (`packages/ai/src/tasks/assessments`) have no eval cases yet, so their models were not chosen by an eval. The item checks and repairs in `@zoonk/core` (`library/items`) are not run on what `/v1/items` returns, since they need the database package: a caller should review questions before learners see them.
