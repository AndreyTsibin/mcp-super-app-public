# Magnific Mystic — prompt syntax

**Separate engine.** Mystic runs through `create_image` with `provider: 'magnific'` (direct
Magnific API), **not** the default `provider: 'openrouter'`. Different args — all Mystic settings
go inside the nested `magnific` object, never at the top level — different billing (Magnific plan
credits, not the flat OpenRouter price), async under the hood. The cost tables in SKILL.md do **not** apply here.

Reach for Mystic when the brief wants the Magnific look specifically — photographic realism with
real material/skin texture, cinematic light, or structure/style references in Mystic's own
engine. For everyday work `provider: 'openrouter'` (seedream) is cheaper and faster; don't burn Magnific
credits on a job seedream does for \$0.04.

Source grading, same discipline as the rest of this skill:
*(vendor)* = docs.magnific.com. *(community)* = third-party guides, unverified here — treat as a
lead to test, not fact. *(measured)* = our own runs.

**Measured on a 13-image calibration run (2026-07-23)** across models, engines, sliders, prompt
length and the weight syntax. The *(measured)* tags below come from that run; the rest still leans
vendor + community — keep promoting confirmed bits as you go.

---

## Sizing (not the same as seedream)

Pass these inside `create_image`'s `magnific` object:

- **`aspect_ratio`** — an **enum**, not a `"16:9"` string. Use `widescreen_16_9`, `square_1_1`,
  `social_story_9_16`, `portrait_2_3`, `standard_3_2`, `social_post_4_5`, etc. Default
  `square_1_1`.
- **`resolution`** — `1k` / `2k` / `4k`. Default `2k`. `4k` is print territory; don't use it for
  web (heavy PNG, no screen benefit).

**Exact pixel size is model-dependent, not fixed by `resolution` alone** *(measured)*. At `2k`:
- `square_1_1` → 2048×2048 (realism, zen)
- `portrait_2_3` → 1664×2496 (editorial_portraits)
- `widescreen_16_9` → **2752×1536 on `realism`**, but **2688×1536 on `super_real`/`fluid`** — the
  base model sets the grid, so don't assume a single number for a given aspect_ratio.

**File format follows resolution** *(measured)*: `1k` saves as **.jpg**, `2k`/`4k` save as **.png**.

References (`structure_reference` / `style_reference`) take a local path or http(s) URL — the
tool base64-encodes them for you.

---

## How to prompt Mystic

Magnific's own written guidance is thin. The only vendor rule:

> "Be specific: even simple prompts benefit from context — include subject, action, or mood
> hints." *(vendor)*

Everything more structured below is *(community)* until we confirm it:

**Brief it like an art director, in prose.** Structure the description across these components
*(community)*:
1. **Subject** — who / what
2. **Environment** — where
3. **Composition & camera** — framing, angle, distance (medium shot / close-up matters, see model
   table)
4. **Lighting & mood** — the emotional/visual atmosphere
5. **Style** — photographic / cinematic / illustrative
6. **Exclusions** — what to avoid

This is the same subject → environment → light → style spine seedream uses, so the seedream house
style (dense concrete nouns, explicit light physics, an anti-polish clause, no adjective soup)
is a safe starting point until Mystic-specific testing says otherwise. See
[seedream.md](seedream.md) for that worked pattern.

**Length.** 60–100 words is a safe default, but **~200 words of dense, concrete detail hold up
fine** *(measured)* — a 200-word watchmaker-workshop prompt on `super_real`+`sharpy` rendered
nearly every named element (lamp, loupe on a brass stand, apron, tools in a row, disassembled
watches, shelved clocks, grandfather clock, rain-streaked moonlit window). No ceiling hit at 200;
the detail budget is generous. Longer = more control, not diminishing returns.

**Weight syntax `(golden sky:1.3)` — does NOT work; don't use it** *(measured)*. A clean A/B on
`realism` (`orange mug` vs `(orange:1.8) mug`, everything else identical) produced no change in
saturation or dominance. A second test on a boat scene showed the weighted subject if anything got
*smaller*. The parentheses/number are silently ignored — harmless (they don't break or trip
moderation) but useless. Express emphasis in prose instead (put the hero subject first, describe it
more).

**`fixed_generation` does not sync seed across different prompts** *(measured)*: two prompts that
differ by even one token gave different compositions despite `fixed_generation: true`. Use it to
re-run the *same* prompt reproducibly, not to hold composition while you edit wording.

**Exclusions.** No documented `negative_prompt` field on the Mystic endpoint. Prefer positive
description; if you must exclude, name it inline in the prose.

**Cyrillic / Russian text on signs — use `super_real` + `magnific_sharpy`** *(measured)*.
Counter-intuitively it beats `fluid` here, even though `fluid` wins on Latin-text adherence:
- One-model A/B on the sign "Сервис Плюс": `super_real` rendered it perfectly; `fluid` got the
  letters right but dropped the last two ("Плюс" → "ПЛЮ"); `realism` produced garbage
  pseudo-Cyrillic with invented diacritics ("Лерніск Илěс"). Don't use `realism`/`zen` for Cyrillic.
- `super_real` then held **two full lines cleanly** — "Сервис Плюс" + "ремонт бытовой техники" —
  across 3/3 attempts. It reliably handles short Russian brand text.
- Recipe: name each text line separately in the prompt (big sign line + smaller subline), keep
  words short, and **generate 2–3 attempts** — on-image text is a lottery on any diffusion model,
  Cyrillic doubly so, so batch and pick the clean one.
- Anchor the *scene*, not just the sign: naming concrete props (shelving with washing
  machine / fridge / microwave, numbered repair tags, a tool pegboard, a technician in a branded
  polo) is what turned a generic "lobby" into a readable appliance-repair reception.

---

## Choosing the base `model` *(vendor)*

The single strongest lever. Pick by subject:

| `model` | What it is | Use for |
|---|---|---|
| `realism` | Realistic palette, "reality boost", reduced AI look | **Default.** Photos and illustrations |
| `super_real` | Maximum realism; strong on **medium shots**, weaker on close-up portraits | Products, scenes, environments |
| `editorial_portraits` | SOTA hyperreal **close/medium portraits**; anatomy issues in wide/distant shots; wants longer prompts | People, faces, portraits |
| `flexible` | Strong adherence, more saturated / HDR-leaning; great with illustration & fantastical | Stylised, illustrative, concept |
| `fluid` | **Strongest** prompt adherence, consistent quality; Imagen-3 based, has content moderation that may flag words | When adherence matters most / tricky compositions |
| `zen` | Smoother, cleaner, fewer objects, less detail | Simple, soft, minimal compositions |

Rule of thumb: photo scene → `realism`/`super_real`; a person's face → `editorial_portraits`;
art/illustration → `flexible`; hardest adherence → `fluid`; clean & simple → `zen`.

**Confirmed on the calibration run** *(measured)*:
- `editorial_portraits` — genuinely SOTA on a close portrait: real pores, per-hair grey stubble,
  woven-sweater texture, no waxy AI skin. The go-to for faces.
- `fluid` — nails literal instructions: "exactly five fruits, order apple-pear-apple-pear-apple"
  rendered exactly, evenly spaced, correct count and order. Reach for it when the brief has counts,
  positions, or a strict layout.
- `super_real` + `magnific_sharpy` — carries dense, multi-object scenes without losing elements
  (see the 200-word test above).
- `zen` — delivers the promised minimalism: single subject, generous negative space, calm light.
- `flexible` + `magnific_illusio` — clean saturated fantasy illustration, coherent complex scene.

## Choosing the `engine` *(vendor)*

The detailing pass. Start `automatic`; override when you know the medium:

| `engine` | Character | Use for |
|---|---|---|
| `automatic` | Picks for you | Default |
| `magnific_illusio` | Softer, smoother | Illustrations, landscapes, nature |
| `magnific_sharpy` | Sharpest, most detail, slight **grain** | Realistic photos |
| `magnific_sparkle` | Middle ground illusio↔sharpy | Realistic, less aggressive than sharpy |

## Tuning the sliders *(vendor semantics, practical advice ours)*

All 0–100. Move ONE at a time — they interact.

- **`adherence`** (def 50) — prompt fidelity vs. style-reference transfer. Raise when a
  `style_reference` is dragging the image off-brief; lower for more creative freedom.
- **`hdr`** (def 50) — detail vs. naturalism. Higher = more detail. The "AI look" ceiling is
  **subject-dependent, not a hard rule** *(measured)*: `hdr 90` on a `sharpy` landscape did **not**
  over-cook — sharper tree/rock micro-detail, but sky and haze stayed believable. `hdr 15` on the
  same scene read softer and hazier. So nature/textured scenes tolerate high hdr; keep it ≤50 for
  faces, skin and clean product where the plastic look shows first. Push up when you want
  hyper-detailed pop and the subject can carry it.
- **`creative_detailing`** (def 33) — how much micro-detail the model invents at high res. Vendor
  warning: extreme values "may generate unintended elements" and add an artificial HDR look. The
  low default is deliberate — nudge up cautiously.
- **`structure_strength`** (def 50) — only with `structure_reference`; how hard to lock the
  reference's shape/composition. High = faithful geometry, low = loose interpretation.

**`fixed_generation: true`** — locks the seed so the same inputs reproduce. Use it to tune one
slider at a time without the picture changing underneath you *(community: standard Mystic
iteration workflow)*.

---

## Recipe: documentary scenes with people and/or text *(measured, 4-run sweep 2026-07-23)*

For a believable everyday scene — real people, a real environment, a readable sign (incl.
Cyrillic) — that reads as an actual photo, not a cinematic render:

```
Model: super_real
Args: adherence: 85–95, hdr: ≤15, creative_detailing: ≤5, engine: magnific_sharpy
```

Why each knob, from a same-prompt A/B/C/D sweep (service-centre scene with a «ТехноРемонт» sign):
- **`model` is the master lever.** `super_real` → documentary light + readable Cyrillic + the
  briefed uniform. `realism` → a cinematic "AI look" **and** garbage pseudo-Cyrillic **every time**,
  even with the sliders pulled down. Never use `realism`/`zen` for this.
- **`adherence` 85–95** is what makes the sign legible and the briefed details (uniform, badge)
  actually appear. At 50–70 Mystic drops them.
- **`hdr` ≤15 + `creative_detailing` ≤5 + `engine: magnific_sharpy`** kill the glossy,
  over-lit cinema look — the thing that reads as "that never happens in real life".

**Anti-pattern (the tool's old defaults):** `realism` + `adherence 50` + `hdr 50` +
`creative_detailing 33` + `engine automatic` — worst possible set for this brief: cinematic
gloss and unreadable text. The tool default is now `super_real`; still set the sliders above.

**For production/web shots, demand cleanliness explicitly** *(measured)*. On `super_real` the
documentary bias skews *grimy* by default: words like "modest", "everyday clutter", "a little
clutter" produced a run-down, dirty interior (peeling tiles, stains). Removing them and adding
"clean, modern, freshly renovated, spotless, well-kept" flipped the same scene to a bright
site-ready interior — model and sliders unchanged. If it's going on a website, say "clean /
modern / renovated" outright; realism does NOT imply tidy here.

---

## Worked starting point (adapt, then measure)

```
Model: super_real
Args: aspect_ratio: 'widescreen_16_9', resolution: '2k'  (engine: magnific_sharpy, hdr ≤ 15, adherence 85+)

Prompt:
A photorealistic wide shot of <subject> in <environment>. <Camera/framing>. <Light source,
direction, falloff — be physical>. <Concrete materials and surfaces>. Candid documentary
photography, natural colour, no gloss, not a staged studio shot.
```

Then iterate, moving one slider per run — but expect the composition to shift, since changing a
slider changes the inputs and `fixed_generation` only reproduces an *identical* prompt+args, not a
prompt with one slider nudged *(measured)*. Judge the slider's effect on quality/detail, not on a
frozen frame. Once a combination reliably works for a subject type, write it down here as
*(measured)*.

---

## Production (web)

Mystic returns heavy full-res PNGs (measured: 4.5 MB at 2k). For any web use, run
`optimize_images` on `save_dir` afterwards (resize + webp) — same last step as the seedream flow.
