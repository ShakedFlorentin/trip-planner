# Toogo AI wiki (`.claude/books/`)

One book per agent: a short, current wiki of the part of Toogo that agent works on. Codegrapher indexes every page as `book → chapter → page` and links each page to the code it explains (`page —explains→ code`), so an agent can find "which page explains `outboxFetch`" or "what code does the offline chapter cover".

## Layout

```
.claude/books/<agent>/00-toc.md      table of contents: read this first
.claude/books/<agent>/<page>.md      one topic per page
```

## Page format

```markdown
---
title: Offline queue
chapter: data
explains:
  - outboxFetch        # exact code symbol names from the graph (function/const/type/module)
  - startOutbox
---
What it is, where it lives (file:line), how it works in 5-15 lines, the rules and gotchas, how to test it, links to related pages.
```

- Pages are short (aim 20-60 lines), plain English, phone-readable. They summarise; the code and `docs/` stay the source of truth.
- `explains` must use real symbol names (check with the query below), so the page links into the graph.
- Never copy secrets, keys, real trip data or personal data into a page.

## Using it

```bash
# rebuild the graph with code + books (run after code or book changes)
python3 scripts/wiki-scan.py
# find code and pages about a term
PYTHONPATH=~/prytan python3 -m core.knowledge.codegrapher query outbox
```

Agents: open your book's `00-toc.md` first, then only the pages you need (far cheaper than reading source). If a page is wrong or stale, fix it in the same change as the code.
