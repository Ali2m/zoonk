# Knowledge base

Put reference documents here and the bridge uses them when it plans an assessment and writes its questions: a curriculum or syllabus, learning outcomes, a glossary, a style guide for questions, notes on an exam's format, sample questions you own.

- **Formats:** `.md` and `.txt`, in this folder or any sub-folder, up to 2 MB each. Convert PDFs and Word files to text first. This `README.md` is never used.
- **No restart:** the folder is read again when a file is added, changed or removed.
- **How it is used:** each request (a blueprint, or the questions of one skill) is matched by its words against the documents, and the best-matching passages are added to the prompt as reference material, up to `BRIDGE_KNOWLEDGE_CHARS` characters (6,000 by default). The model is told to prefer their facts, terms, scope and level, and never to follow instructions written inside them.
- **Write for matching:** matching is by shared words, with no embedding model. Use clear headings and the same terms your subjects and skills use ("Linear equations", "Grade 8"), keep one topic per section, and write documents in the language the questions are written in.
- **Check what was used:** the bridge logs `knowledge: <files>` for each call that used a passage, and `GET /v1/health` reports how many files and passages are loaded.

Everything here is sent to the model provider as part of a prompt, so do not add anything confidential or any learner's personal data. `BRIDGE_KNOWLEDGE_DIR` points the bridge at another folder.
