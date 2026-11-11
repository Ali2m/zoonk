Write questions for an assessment in one interactive `FORMAT`, each testing `SKILL` at `LEVEL` for a learner of a learning app.

Write `COUNT` questions. No two test the same thing in the same way, and each has exactly one defensible answer key. Match `EXAM_STYLE` in length, tone and difficulty; never copy a real exam question.

## Text

- Write everything the learner reads in `LANGUAGE`.
- Write plain sentences without Markdown, except **bold** or _italics_ on a word that needs it. Use no em dashes.
- Write every mathematical expression, equation, variable and number with a unit of a formula in LaTeX between `\(` and `\)`, such as `\(\frac{x-2}{3} + 1 = 5\)`. Plain numbers in running text ("3 apples") stay plain.
- `difficulty` is `easy`, `medium` or `hard`, as the question really is.
- `reason` explains in 1 or 2 sentences why the key is right, for a learner who got it wrong. It never appears before the learner answers.
- Names of people vary across questions and suit `LANGUAGE`.

{{#imageChoice}}
## imageChoice

The learner picks the one right picture.

- `question`: what to pick, in one sentence. It never describes the pictures.
- `options`: `OPTION_COUNT` pictures. Each has a `picture` with a `prompt` (what to draw, in English, about 200 characters: one clear object or diagram on a plain background, with no text unless the question is about that text) and an `alt` (what it shows, in `LANGUAGE`, without giving the answer away), a short `label` in `LANGUAGE` naming the picture neutrally ("Picture A" is not allowed; name what is drawn only when that does not reveal the answer, otherwise describe a visible feature), and `isCorrect`.
- Exactly one option is correct. The wrong pictures differ from the right one in the feature the skill is about, and are otherwise alike.
{{/imageChoice}}
{{#fillBlanks}}
## fillBlanks

The learner types into blanks inside a text.

- `instruction`: what to do, in one sentence.
- `text`: a sentence or short text with 1 to 4 blanks, written `[[1]]`, `[[2]]` and so on in order. A blank replaces a single word, number or short phrase that the rest of the text determines.
- `blanks`: one entry per blank, in order. `acceptedAnswers` lists every answer to accept, the best one first: spelling variants, a number and its word, an equivalent form. Never accept an answer the text does not determine.
{{/fillBlanks}}
{{#wordBank}}
## wordBank

The learner fills blanks by choosing from one shared bank of words.

- `instruction`: what to do, in one sentence.
- `text`: a short text with 2 to 5 blanks, written `[[1]]`, `[[2]]` and so on in order.
- `blanks`: one entry per blank, in order, with its `answer`: a single word or short phrase. No two blanks share an answer, and no answer fits another blank.
- `distractors`: 2 to 4 more words for the bank that fit no blank but are of the same kind as the answers.
{{/wordBank}}
{{#dropdown}}
## dropdown

The learner picks each blank's answer from that blank's own list.

- `instruction`: what to do, in one sentence.
- `text`: a sentence or short text with 1 to 4 blanks, written `[[1]]`, `[[2]]` and so on in order.
- `blanks`: one entry per blank, in order, with 3 or 4 `options` of the same kind and length and `correct`, the position of the right one counting from 0. Vary the position of the right option across blanks.
{{/dropdown}}
{{#classify}}
## classify

The learner sorts items into categories.

- `question`: what to sort and by what, in one sentence.
- `categories`: 2 to 4 categories. Each has a short `name` and the `items` that belong to it.
- Use 4 to 8 items in all, each a word or short phrase that belongs to exactly one category. No category is empty, and the items are not sorted by category in an obvious pattern of length or wording.
{{/classify}}
{{#crossword}}
## crossword

The learner solves a small crossword. Each question is one whole crossword.

- `instruction`: what the crossword is about, in one sentence.
- `words`: 4 to 7 entries. Each has an `answer` (one word of 3 to 10 letters of `LANGUAGE`'s alphabet, with no spaces, hyphens, digits or accents that a keyboard cannot type) and a `clue` that defines it without using the word or a form of it.
- Choose words that share letters, so they can cross. No word appears twice.
{{/crossword}}
{{#shading}}
## shading

The learner shades cells of a grid to show a fraction or a count.

- `question`: what to shade, in one sentence, such as "Shade \(\frac{3}{8}\) of the rectangle." It gives the fraction or amount, never the number of cells when the skill is finding that number.
- `rows` and `columns`: the grid, from 1 to 6 each, with 2 to 24 cells in all. Choose a grid in which the answer is a whole number of cells.
- `shaded`: how many cells a correct answer shades.
{{/shading}}
{{#barChart}}
## barChart

The learner builds a bar chart by dragging each bar to its value.

- `question`: the data to chart, stated in full in one or two sentences or a short list, since the learner reads every value from it. Never refer to a table or picture.
- `categoryLabel` and `valueLabel`: the axis titles.
- `bars`: 3 to 6 bars in the order the data gives them, each with a short `label` and its whole-number `value`.
- `interval`: the step between axis marks (1, 2, 5, 10, 20, 50 or 100). Every value is a multiple of it, and the largest value is at most 10 steps.
{{/barChart}}
{{#plotPoint}}
## plotPoint

The learner plots one point on a coordinate plane.

- `question`: what to plot, in one sentence. Either name the point directly or describe it so that it must be worked out (the vertex of a parabola, the solution of a system, an image under a transformation), as `LEVEL` requires.
- `x` and `y`: the whole-number coordinates of the one correct point, each from -9 to 9.
{{/plotPoint}}

## Final check

Before answering, make sure every blank marker in a `text` has its entry in `blanks`, every key is right, nothing in the question gives its answer away, and all learner-facing text is in `LANGUAGE`.
