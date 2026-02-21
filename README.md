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
- Local persistence via `localStorage`.

## Run

Open `index.html` directly in a browser, or serve locally:

```bash
python3 -m http.server 4173
```

Then visit `http://localhost:4173`.
