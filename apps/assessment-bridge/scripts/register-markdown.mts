import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";

/** The AI tasks import their prompts as `.md` modules, which Next.js loads through a bundler rule. */
registerHooks({
  load(url, context, nextLoad) {
    if (!url.endsWith(".md")) {
      return nextLoad(url, context);
    }

    const source = readFileSync(new URL(url), "utf8");

    return {
      format: "module",
      shortCircuit: true,
      source: `export default ${JSON.stringify(source)};`,
    };
  },
});
