# EASTMANS — Rebrand & Animation Refinement Brief

## Role

You are acting as the lead brand engineer and motion designer for **Eastmans
Developments**, a high-end independent property developer in East London. The
site you are working on is investor- and lender-facing. It is the company's
single most important credibility asset. The bar is: *nothing on this page may
look accidental.* Every letterform, every frame of animation, every fade window
is deliberate. No stone unturned.

The existing site (`index.html`) was built for the previous identity, **Seven
Six Developments** ("76"). Your job is a complete, forensic rebrand to
**EASTMANS**, plus a precision pass on the scroll animations — most critically
the closing sequence where the terrace elevation breaks apart and reassembles
into the brand mark. The design language, layout, palette, typography, pacing
and section structure are **unchanged**. Only the words, the marks, and the
animation fidelity change.

---

## 1. Design invariants — do not touch

- Palette: `#050505` ground, `#F2F1ED` ink, `#A7ABB1` secondary, existing
  rgba tints. No new colors.
- Typography: Instrument Sans (display/body) + IBM Plex Mono (annotations),
  embedded woff2 subsets as-is.
- Layout, section order (01 Identity → 07 Contact), section heights, sticky
  runways, mobile runway overrides in `measure()`.
- The drafting-table visual grammar: monoline stroked letterforms
  (stroke-width 3, no fills), faint construction grids, coordinate/annotation
  labels, canvas wireframe scenes, grain, custom cursor.
- The bundler runtime and the `sc-`/DCLogic component framework. Edits are
  made to the decoded template and re-encoded; the runtime JS and font
  manifest entries are byte-identical after repack.

---

## 2. Brand system

**Name:** Eastmans (no apostrophe). Legal/display: **Eastmans Developments**.

**Wordmark:** `EASTMANS` set in the drawn monoline letterform style of the
current hero lockup — *not* set in a font. Same grammar as the existing
glyphs: cap height spanning y=40→140 in the 220-unit-tall viewBox, stroke
width 3, skeletal single-stroke construction, `#F2F1ED` primary strokes with
sparing `#A7ABB1` accent strokes to keep the existing two-tone rhythm.
Sub-line `DEVELOPMENTS` remains beneath, tracked wide, `#A7ABB1`, recentred
under the new wordmark.

Letterform vocabulary — reuse what exists, draw the rest in the same hand:
- `E` exists (top bar → spine → bottom bar + mid bar: see current
  `M202 40 L150 40 L150 140 L202 140 M150 90 L190 90`).
- `S` exists (double cubic curve). `N` exists (vertical–diagonal–vertical).
- `A`, `T`, `M` must be drawn new: monoline, same proportions (~52-unit letter
  width, ~100-unit cap height), same optical stroke corrections as the
  existing glyphs. `A` = two diagonals + crossbar; `M` = two verticals + two
  diagonals meeting mid-height; `T` = top bar + stem.
- Accent placement: keep the current lockup's asymmetry — exactly one or two
  strokes in `#A7ABB1` (the current lockup greys one X diagonal and the 7's
  echo lines). Recommended: the second diagonal of the final `A` or the inner
  diagonals of `M`, plus the monogram echo lines. Judge optically.

**Monogram:** a drafted **"E" mark** replaces the "76" mark everywhere. Same
canvas: viewBox `0 0 210 160`, stroke-width 3, no fill. Construction:
- Primary `E` strokes in `#F2F1ED`, drawn large and confident within the
  frame.
- Two offset "echo" strokes in `#A7ABB1` repeating the E's arm geometry —
  the same motif as the current 7's speed lines.
- Retain the compass-circle counterpoint (`#F2F1ED` circle) that anchors the
  current mark — it is the most distinctive element of the identity and
  survives the rebrand as a drafting-instrument motif. Compose it against the
  E so the mark balances (circle overlapping the E's lower-right quadrant is
  the natural home; refine optically).

The monogram must be authored **once** and reused in all four places (favicon,
loader thumbnail, contact-section SVG, finale morph target) so they can never
drift apart.

**Tone of voice:** unchanged — spare, assured, architectural. Sentences stay
short. No superlatives added.

---

## 3. Complete rebrand inventory

Every occurrence below must change. After the edit, `grep -i` for `seven`,
`sevensix`, `seven six`, and `76` must return zero brand references (internal
element IDs may remain only if renaming is impossible; see §3.9).

### 3.1 Outer bundle shell (the pre-unpack loader)
- `<title>`: `Eastmans Developments — Independent Property Development, East London`
- Loader thumbnail SVG (the fixed full-screen SVG shown while unpacking):
  replace the 76 line-drawing with the **E monogram**, same faint two-tone
  stroke treatment, so the loader → hero transition stays on-brand from the
  first painted frame.

### 3.2 Head / metadata (inside template `<helmet>`)
- `<title>`: `Eastmans Developments — Independent Property Development, East London`
- `meta description`: `Eastmans Developments is an independent property
  development company focused on the evolving urban fabric of East London.
  Architecture-led, context-first.`
- `og:title`: `Eastmans Developments` ; `og:description` unchanged pattern.
- Favicon SVG data-URI: redraw as the **E monogram** at 32×32 (simplified
  strokes, `#050505` ground, `#F2F1ED`/`#A7ABB1` strokes).
- JSON-LD: `"name": "Eastmans Developments"` (description/areaServed keep).

### 3.3 Accessibility strings
- sr-only `<h1>`: `Eastmans Developments — independent property development in East London`
- Header home button `aria-label`: `Eastmans Developments — back to top`
- Hero SVG `aria-label`: `Eastmans Developments`
- Contact monogram `aria-label`: `Eastmans monogram`

### 3.4 Header wordmark
- Line 1: `EASTMANS` (keep 13px / 600 / letter-spacing 0.42em — verify the
  8-character measure still balances against the nav; adjust tracking ±0.02em
  optically if needed, nothing else).
- Line 2: `DEVELOPMENTS` unchanged.

### 3.5 Hero lockup (`#sx-lockv`, viewBox 0 0 1180 220) — full redraw
- Replace the `SEVEN SIX` letterform paths (`data-st` paths, `data-o` 1–15)
  with `EASTMANS` letterforms + thin divider stroke + **E monogram** at right,
  preserving the composition: wordmark left/centre mass, grey vertical
  divider, monogram as the right-hand terminal.
- Re-sequence `data-o` draw order left→right; retune the per-stroke stagger in
  `prepLogo()` (`s: 0.02 + o * 0.018`) so the full draw still completes at the
  same `heroP` regardless of the new stroke count.
- Redraw the construction grid `#sx-gg` to the new geometry: horizontal cap
  (y=40), mid (y=90), base (y=140) lines stay; vertical grid lines land on the
  new letter-group boundaries; the faint diagonal + faint circle construction
  lines re-anchor to the new monogram position.
- `#sx-devs` (`DEVELOPMENTS`) recentred under the new wordmark: update its
  `x` from 434 to the new wordmark's optical centre. Its tracking-tighten
  animation stays.
- **`sceneHeroCanvas()` must be updated in lock-step:** the extended
  grid-line fractions (`[40, 242, 598, 884, 1140]` over 1180, and cap/mid/base
  at 40/90/140 over 220) are the hero's canvas echo of the SVG grid. Replace
  them with the new letter-boundary fractions so canvas extensions and SVG
  grid remain a single continuous drawing.

### 3.6 Copy
- Section 02 body: `Eastmans approaches development through architecture,
  context and long-term thinking. Our focus is the evolving urban fabric of
  East London.`
- Submit button: `CONTACT EASTMANS`
- Contact email placeholder (both the contact block and the INDEX overlay
  footer): `hello@eastmansdevelopments.co.uk` — keep the `PLACEHOLDER`
  annotations exactly as they are.
- Footer: `© 2026 EASTMANS DEVELOPMENTS`
- All other copy (headlines, principles, annotations, coordinates, form
  labels, demo-interface note) is unchanged.

### 3.7 Contact monogram (`#sx-c76v`)
- Replace the 7+6 paths with the **E monogram** paths (single source of truth,
  §2). Keep container sizing (`min(150px,30vw)`), stroke widths, colors.

### 3.8 Finale morph target (`segs76()` in the component script)
- Replaced entirely — see §4. The hardcoded chord list dies; targets are
  sampled from the real monogram SVG at runtime.

### 3.9 Internal identifiers
- Rename `sx-c76` → `sx-mono`, `sx-c76v` → `sx-monov`, `segs76` → `segsMono`,
  and the `c76R` cache key — consistently across markup and script (all
  references: `prepLogo`, `measure`, `sceneFinale`, preload warm list). No
  orphaned references; verify by grep after rename.

---

## 4. The finale — pixel-perfect specification

**The moment:** scrolling into 07 — Contact, the miniature terrace elevation
from section 06 breaks into individual line segments that fly across the page
and reassemble as the Eastmans monogram, which then becomes the live SVG
sitting above the contact form. An investor watching this must never see the
seam. This is the signature frame of the site; it must land *exactly*.

Current defects to eliminate (all in `sceneFinale` / `segs76`):

1. **Geometry mismatch.** The old target list approximated the mark's curve
   with 3 straight chords and the circle with 12 — visibly polygonal, and not
   coincident with the SVG strokes at handoff.
   **Fix:** generate morph targets by sampling the *actual* rendered monogram
   SVG paths (`getTotalLength()` / `getPointAtLength()` against
   `#sx-monov path/circle`, mapped through its live `getBoundingClientRect()`).
   Chord length must keep maximum deviation from the true curve **under 0.5
   device px** at rendered size (adaptive: more samples on curves/circle,
   single segments on straight strokes). Cache per layout size; invalidate in
   `measure()`.

2. **Stroke-weight pop.** Canvas lines are 1px; the SVG renders its
   stroke-width 3 at `r.width / 210` scale (~2.1px at desktop size). At
   crossfade the mark visibly thickens.
   **Fix:** during the morph, interpolate canvas `lineWidth` from 1 →
   `3 × (r.width / 210) ×` (device-pixel correction) so landed lines have
   identical weight to the SVG strokes before the crossfade begins.

3. **Color mismatch.** Landed canvas lines sit at a mid-grey lerp
   (`w01 = m × .5`); the SVG strokes are `#F2F1ED` (primary) and `#A7ABB1`
   (echo lines). **Fix:** carry the target stroke's true color per segment —
   primary strokes land at `#F2F1ED`, echo strokes at `#A7ABB1` — reached
   exactly as `m → 1`.

4. **Crossfade discipline.** Today the SVG fades in over p `0.70–0.85` while
   canvas fades out over `0.74–0.92`, with the morph completing at `0.72` —
   overlapping partial opacities of two not-quite-identical drawings.
   **Fix:** sequence deliberately — (a) morph completes and *holds* fully
   landed for a beat; (b) crossfade runs with opacities summing ≈ 1 at every
   frame (no brightness dip or double-exposure); (c) canvas is fully clear
   before the fade window ends. Because geometry, weight and color now match
   exactly, the crossfade must be **invisible** — verify by frame capture.

5. **Segment allocation.** Source lines (48 structural segments from the
   section-06 elevation via `elevSegs()`, filtered by length) map onto the new
   target count. Rebalance so every monogram target segment receives a source
   line, surplus source lines dissolve smoothly in flight (current behaviour,
   kept), and no target pops in from nothing. Flight paths should keep the
   current feel — straight interpolation with the existing `eio` easing, no
   added theatrics.

6. **Viewport truth.** `p7` is driven by
   `(y + vh − s7.top) / (vh × 1.4)`; verify on short viewports (mobile 100svh,
   landscape phones) that the monogram is on screen when the morph completes —
   adjust the driver window if the mark can land off-screen. Verify behaviour
   when arriving via the INDEX jump (`jump()` targets `s7.top − vh × .1`) and
   when scrolling back upward through the sequence (morph must reverse
   cleanly; the SVG opacity ramp must not strand a half-visible mark).

7. **Reduced motion.** With `prefers-reduced-motion`, the monogram SVG must
   simply be present at full opacity (current RM branch behaviour) — confirm
   no canvas finale runs and no opacity is stranded at 0.

---

## 5. General animation tidy pass

Sweep every scene boundary for the same class of defect — this is a polish
pass, not a redesign. Preserve all current choreography and pacing.

- **01 → 02 handoff:** `sceneHeroCanvas` is redrawn during early section 02
  (`p2 < .3`) while `sceneContext` fades in — confirm no double-draw flash at
  the `act` boundary and that the terrace wireframe's fade-out is monotonic.
- **02 Context:** map draw-in/out windows (`ramp(p,0,.12)` / `(.88,1)`) —
  confirm annotations (`data-fd`) never outlive the map lines they label.
- **03 Transformation:** roof lift + new-volume drop-in — confirm fill ramp
  (`.72–.94`) doesn't pop against edge alpha; datum lines during lift fade
  fully.
- **04 Principles:** white-flash ramp `w2` and line extensions `ext` —
  confirm extension ghost lines never persist into section 05.
- **05 East London:** the map→elevation morph reuses source segs modulo
  target count (`dup` fading) — confirm no orphaned duplicate lines at
  `morph = 1`, and `EAST LONDON` outline text opacity syncs with its frame
  lines.
- **06 → 07:** `sceneQuiet`'s mini elevation is the finale's source drawing —
  its fade window (`.75–1`) must hand off seamlessly into `sceneFinale`'s
  fade-in (`.04–.2`): the drawing should read as *one continuous object* that
  then breaks apart. Verify no frame where it's absent between the two scenes
  at any scroll speed.
- **Idle gating:** the `idle < 5` frame gate — confirm a stale frame can't
  persist after font-load reflow, resize, or DPR change (all paths call
  `measure()` → `idle = 0`).
- Run the whole page at 0.25× scroll speed and at fling speed; both must be
  clean.

---

## 6. Technical workflow

The deliverable is the same single-file `index.html` (bundler format intact):

1. Extract: decode the `__bundler/template` JSON string and the manifest
   (fonts stay untouched).
2. Edit the decoded template (markup + component script) per this brief.
3. Repack: re-encode the template into the JSON string; regenerate the outer
   shell edits (§3.1); byte-identical manifest and runtime.
4. Commit a small round-trip tool (`tools/bundle.py` — `extract` / `repack`
   subcommands) so every future edit uses the same safe path.
5. Preview locally with a real browser (Playwright + bundled Chromium) — the
   file must be exercised through the actual unpack path, not just the
   extracted template.

---

## 7. Acceptance criteria

The work is done only when **all** of the following pass:

1. **Zero brand remnants:** `grep -iE 'seven ?six|sevensix'` over the shipped
   file → 0 hits; no `76`-branded ids, labels, or comments remain.
2. **Finale handoff proof:** frame captures at the crossfade midpoint with
   (a) canvas layer only and (b) SVG layer only overlay-diff to ≤ 1 device px
   and no perceivable weight/color difference — verified at 1440×900 and
   390×844, DPR 1 and 2.
3. **Full-journey screenshot suite** via the `window.__sxSet(y)` dev hook at
   every section's key beats (draw-in, mid, handoff) × {390, 768, 1440, 1920}
   widths — reviewed frame by frame; every text reveal, fade window and
   annotation lands as specified; no clipped or orphaned elements.
4. **Reduced-motion pass:** all content readable and present, no dead
   opacity-0 elements, no canvas dependency.
5. **Interaction pass:** INDEX overlay (labels unchanged), section jumps,
   form validation + submitted state, Escape-to-close, focus return, custom
   cursor suppression over inputs — all behave exactly as before.
6. **Console clean:** zero errors/warnings through a full scroll on the
   packed file, both load path (preloader) and `__sxSet` skip path.
7. **Copy audit:** every string in §3 matches this brief character-for-
   character; everything not listed is untouched.
8. **Performance parity:** no additional per-frame allocations in hot paths
   (target sampling cached per layout), file size within a few KB of current.

## 8. Explicitly out of scope

- Contact details remain `PLACEHOLDER` (email domain updates per §3.6, but
  stays flagged as placeholder). Phone, office address, social links, og:image,
  production URL: unchanged, still awaiting client content.
- Form backend (demo notice stays). No copy rewrites beyond §3. No new
  sections, no palette or typography changes.
