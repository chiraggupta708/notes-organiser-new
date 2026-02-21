# Personal Revision Knowledge Base

A local, single-user Markdown-first revision web app with fixed top-level sections:

- Coding
- HLD
- LLD

## Features

- Sidebar navigation with fixed sections and dynamic sub-sections.
- Create and edit sub-sections with title + Markdown.
- Paste Markdown or upload a `.md` file (content read in browser only).
- GitHub-flavored Markdown rendering with code blocks, tables, and lists.
- Live preview while editing.
- Persistent local-disk storage in `data/revision-kb.json` via a local HTTP API.

## Run

```bash
npm start
```

Then visit `http://localhost:4173`.
