#!/usr/bin/env python3
"""Round-trip tool for the bundled single-file site (index.html).

The site ships as one file: an outer loader shell plus three inline
script blocks — a resource manifest (gzipped/base64 fonts + runtime JS),
an external-resource list, and the page template as a JSON-encoded
string. All content edits happen on the *decoded* template; this tool
extracts it to a plain HTML file and repacks it byte-safely, leaving the
manifest and runtime untouched.

Usage:
  python3 tools/bundle.py extract <index.html> <template-out.html>
  python3 tools/bundle.py repack  <index.html> <template-in.html>
"""
import json
import re
import sys

BLOCK = re.compile(
    r'(<script type="__bundler/template">\s*)(".*?")(\s*</script>)', re.S
)


def extract(index_path, out_path):
    src = open(index_path, encoding="utf-8").read()
    m = BLOCK.search(src)
    if not m:
        sys.exit("error: no __bundler/template block found")
    template = json.loads(m.group(2))
    open(out_path, "w", encoding="utf-8").write(template)
    print(f"extracted {len(template)} chars -> {out_path}")


def repack(index_path, template_path):
    src = open(index_path, encoding="utf-8").read()
    template = open(template_path, encoding="utf-8").read()
    encoded = json.dumps(template, ensure_ascii=False)
    # Keep the encoded string safe inside a <script> element: a literal
    # "</" sequence would terminate the block early. "\/" is a valid JSON
    # escape, so this is lossless.
    encoded = encoded.replace("</", "<\\/")
    new_src, n = BLOCK.subn(lambda m: m.group(1) + encoded + m.group(3), src)
    if n != 1:
        sys.exit(f"error: expected 1 template block, found {n}")
    # Round-trip sanity: the block must decode back to the exact input.
    check = json.loads(BLOCK.search(new_src).group(2))
    if check != template:
        sys.exit("error: repack round-trip mismatch")
    open(index_path, "w", encoding="utf-8").write(new_src)
    print(f"repacked {len(template)} chars -> {index_path}")


if __name__ == "__main__":
    if len(sys.argv) != 4 or sys.argv[1] not in ("extract", "repack"):
        sys.exit(__doc__)
    (extract if sys.argv[1] == "extract" else repack)(sys.argv[2], sys.argv[3])
