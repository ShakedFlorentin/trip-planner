#!/usr/bin/env python3
"""Rebuild the Toogo AI wiki graph: code + .claude/books pages -> codegrapher_out/graph.json.
Pages list code symbols by plain name in `explains`; this resolves each name to its graph node
(e.g. outboxFetch -> function:src.outbox.outboxFetch) so page->code links work, and lists the
names it could not find. Needs the prytan framework at ~/prytan (or PRYTAN_HOME). Offline."""
import json, os, sys
from collections import Counter, defaultdict
from pathlib import Path
sys.path.insert(0, os.environ.get("PRYTAN_HOME", os.path.expanduser("~/prytan")))
from core.knowledge.codegrapher.graph import build_graph

g = build_graph(".", books_dir=".claude/books")
ids = {n["id"] for n in g["nodes"]}
by_name = defaultdict(list)
for n in g["nodes"]:
    if n["kind"] not in ("book", "chapter", "page"):
        by_name[n["id"].rsplit(".", 1)[-1]].append(n["id"])
        by_name[n.get("name", "")].append(n["id"])
edges, missing = [], defaultdict(list)
for e in g["edges"]:
    if e["kind"] == "explains" and e["dst"] not in ids:
        hits = sorted(set(by_name.get(e["dst"], [])))
        if not hits:
            missing[e["src"]].append(e["dst"])
        for h in hits:
            edges.append({**e, "dst": h})
    else:
        edges.append(e)
g["edges"] = edges
out = Path("codegrapher_out/graph.json"); out.parent.mkdir(exist_ok=True)
out.write_text(json.dumps(g, indent=2))
kinds = Counter(n["kind"] for n in g["nodes"])
links = sum(1 for e in edges if e["kind"] == "explains")
print(f"{len(g['nodes'])} nodes, {len(edges)} edges; books {kinds.get('book',0)}, pages {kinds.get('page',0)}, page->code links {links}")
for page, names in sorted(missing.items()):
    print(f"  not found in {page}: {', '.join(names)}")
