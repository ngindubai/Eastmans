#!/usr/bin/env python3
"""Build the production index.html from src/.

Sources
  src/head.html      document head content: metadata, font faces, base CSS
  src/template.html  the <x-dc> page markup plus its component logic script
  src/dc-runtime.js  the DC runtime (readable, unminified source of truth)
  assets/js/react.production.min.js       React 18.3.1 UMD, SRI-verified
  assets/js/react-dom.production.min.js   ReactDOM 18.3.1 UMD, SRI-verified

Output
  assets/js/dc-runtime.<hash>.min.js  minified, content-hashed runtime
  index.html                          the deployable document

The page is a real HTML document: the head is static (no helmet compilation),
fonts are ordinary files, React and the runtime are local scripts. Nothing is
fetched from a CDN and nothing executes from a Blob URL. The runtime mounts
React over the <x-dc> template on DOMContentLoaded exactly as before.

Usage: python3 tools/build.py
Requires esbuild for minification (npm install); falls back to shipping the
runtime unminified if esbuild is unavailable.
"""
import glob
import hashlib
import os
import re
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def read(p):
    return open(os.path.join(ROOT, p), encoding="utf-8").read()


def sha8(p):
    return hashlib.sha256(open(os.path.join(ROOT, p), "rb").read()).hexdigest()[:8]


def find_esbuild():
    for c in (os.path.join(ROOT, "node_modules", ".bin", "esbuild"),
              shutil.which("esbuild")):
        if c and os.path.exists(c):
            return c
    return None


def build_runtime():
    """Minify src/dc-runtime.js into a content-hashed assets/js file."""
    for old in glob.glob(os.path.join(ROOT, "assets", "js", "dc-runtime.*.min.js")):
        os.remove(old)
    src = os.path.join(ROOT, "src", "dc-runtime.js")
    tmp = os.path.join(ROOT, "assets", "js", "dc-runtime.tmp.js")
    os.makedirs(os.path.dirname(tmp), exist_ok=True)
    esbuild = find_esbuild()
    if esbuild:
        subprocess.run([esbuild, src, "--minify", "--target=es2019",
                        f"--outfile={tmp}"], check=True, cwd=ROOT)
    else:
        print("warning: esbuild not found; shipping runtime unminified", file=sys.stderr)
        shutil.copyfile(src, tmp)
    h = hashlib.sha256(open(tmp, "rb").read()).hexdigest()[:8]
    out = f"assets/js/dc-runtime.{h}.min.js"
    os.replace(tmp, os.path.join(ROOT, out))
    return out


def main():
    runtime = build_runtime()

    head = read("src/head.html")
    # Version the font URLs: the host serves assets as immutable for a year,
    # so the URL must change whenever the bytes do.
    def ver(m):
        return f'url("{m.group(1)}?v={sha8(m.group(1)[1:])}")'
    head = re.sub(r'url\("(/assets/fonts/[^"?]+)"\)', ver, head)

    template = read("src/template.html")
    react = "assets/js/react.production.min.js"
    react_dom = "assets/js/react-dom.production.min.js"
    for req in (react, react_dom):
        if not os.path.exists(os.path.join(ROOT, req)):
            sys.exit(f"error: missing {req}")

    html = f"""<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
{head.strip()}
<style>
/* The raw template must never flash before React mounts; the page stays on
   its black ground until the engine takes over. */
x-dc{{display:none!important}}
</style>
</head>
<body>
{template.strip()}
<noscript>
<div style="position:fixed;inset:0;background:#050505;color:#F2F1ED;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;font-family:'Instrument Sans','Helvetica Neue',Helvetica,Arial,sans-serif">
  <div>
    <p style="margin:0 0 10px;font-size:22px;font-weight:500">&#274;astmans Developments</p>
    <p style="margin:0;color:#A7ABB1;font-size:15px;line-height:1.6">London property development. Planning-led conversions, extensions and mixed-use projects.<br>This site&rsquo;s full experience requires JavaScript.</p>
  </div>
</div>
</noscript>
<script>window.__resources={{}}</script>
<script defer src="/{react}?v={sha8(react)}"></script>
<script defer src="/{react_dom}?v={sha8(react_dom)}"></script>
<script defer src="/{runtime}"></script>
</body>
</html>
"""
    out = os.path.join(ROOT, "index.html")
    open(out, "w", encoding="utf-8").write(html)
    print(f"built index.html ({len(html)} bytes), runtime {runtime}")


if __name__ == "__main__":
    main()
