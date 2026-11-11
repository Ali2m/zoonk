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

| Route | Task | Returns |
| --- | --- | --- |
| `GET /v1/health` | | `{ ready }`: whether a gateway key is set |
| `POST /v1/goal-analyses` | `understandGoal` | What the learner meant, and up to 2 follow-up questions |
| `POST /v1/assessment-plans` | `planAssessment` | The blueprint: parts, sections, groups, result bands |
| `POST /v1/items` | `generateItems` | Questions for one skill in one format |
| `POST /v1/item-sets` | `writeItemSet` | A shared passage, case or chart with its questions |
| `POST /v1/images` | `generateImageScene`, `generateLessonImage` | `{ url, ratio, alt }` of a stored picture |
| `POST /v1/visuals` | (no model) | `{ url, ratio, alt }` of a chart or timeline drawn as SVG from its data |
| `GET /assets/{name}` | | A stored picture |

Request shapes are the zod schemas at the top of `src/routes.ts`.

Pictures are written to `BRIDGE_DATA_DIR` (default `.data`) and served from `/assets`. A deployment replaces `saveAsset` in `src/assets.ts` with an object store.

## What is not here

`planAssessment` (`packages/ai/src/tasks/assessments`) has no eval cases yet, so its model was not chosen by an eval. The item checks and repairs in `@zoonk/core` (`library/items`) are not run on what `/v1/items` returns, since they need the database package: a caller should review questions before learners see them.
