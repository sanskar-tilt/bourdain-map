#!/usr/bin/env python3
"""Find code that was imported or exported but never actually wired up.

Two scripted string-replaces silently landed their comments without their
code this session — leaving a function imported and never called, and the
timeline dead while everything still looked fine. This is the cheap check
that would have caught both.

    python3 scripts/audit_wiring.py

Reports:
  - symbols imported into a module and never referenced in its body
  - symbols exported from lib/ or app/components/ with no call site anywhere

Exits non-zero if anything is found.
"""

import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SCAN = ["lib", "app/components"]
USERS = ["app", "lib", "scripts"]

def sources(dirs):
    out = []
    for d in dirs:
        base = ROOT / d
        if not base.exists():
            continue
        for ext in ("*.ts", "*.tsx", "*.mjs"):
            out += [p for p in base.rglob(ext) if ".next" not in str(p)]
    return sorted(set(out))


def strip_comments(s):
    s = re.sub(r"/\*.*?\*/", "", s, flags=re.S)
    s = re.sub(r"^\s*//.*$", "", s, flags=re.M)
    return s


IMPORT = re.compile(r"^import\s+(?:type\s+)?(.+?)\s+from\s+[\"']([^\"']+)[\"'];?", re.M)
EXPORT_FN = re.compile(
    r"^export\s+(?:async\s+)?function\s+(\w+)|"
    r"^export\s+(?:const|let)\s+(\w+)\s*[:=]|"
    r"^export\s+default\s+(?:async\s+)?function\s+(\w+)",
    re.M,
)

def imported_names(clause):
    """Pull identifiers out of an import clause, ignoring the module path."""
    names = []
    braced = re.search(r"\{([^}]*)\}", clause)
    if braced:
        for part in braced.group(1).split(","):
            part = part.strip()
            if not part:
                continue
            part = re.sub(r"^type\s+", "", part)
            names.append(part.split(" as ")[-1].strip())
        clause = clause[: braced.start()] + clause[braced.end():]
    for part in clause.split(","):
        part = part.strip().rstrip(",")
        if part and re.fullmatch(r"\w+", part):
            names.append(part)
    return [n for n in names if n]


unused_imports = []
for path in sources(SCAN):
    text = path.read_text()
    body = strip_comments(text)
    for m in IMPORT.finditer(body):
        clause, module = m.group(1), m.group(2)
        if clause.strip().startswith("*"):
            continue
        rest = body[: m.start()] + body[m.end():]
        for name in imported_names(clause):
            if not re.search(r"\b" + re.escape(name) + r"\b", rest):
                unused_imports.append((path.relative_to(ROOT), name, module))

# --- exports with no call site anywhere ------------------------------------
all_text = {}
for path in sources(USERS):
    all_text[path] = strip_comments(path.read_text())

unused_exports = []
for path in sources(SCAN):
    body = all_text.get(path) or strip_comments(path.read_text())
    for m in EXPORT_FN.finditer(body):
        name = next(g for g in m.groups() if g)
        if name in ("default",):
            continue
        hits = 0
        for other, text in all_text.items():
            if other == path:
                continue
            if re.search(r"\b" + re.escape(name) + r"\b", text):
                hits += 1
        if hits == 0:
            unused_exports.append((path.relative_to(ROOT), name))

print("=" * 68)
print("IMPORTED BUT NEVER REFERENCED")
print("=" * 68)
if unused_imports:
    for f, n, m in unused_imports:
        print(f"  {f}: {n}  (from {m})")
else:
    print("  none")

print()
print("=" * 68)
print("EXPORTED BUT NEVER USED ELSEWHERE")
print("=" * 68)
if unused_exports:
    for f, n in unused_exports:
        print(f"  {f}: {n}")
else:
    print("  none")

total = len(unused_imports) + len(unused_exports)
print(f"\n{total} finding(s)")
sys.exit(1 if total else 0)
