---
name: image
description: >
  Image prompting skill for Seedream 4.5 and Gemini 3 (Nano Banana 2 / Pro) and for
  Magnific Mystic — all generated through the create_image tool (`provider` picks the engine).
  Writes ready-to-use prompts plus the model and sizing arguments to pass with them.
  Use when: "нарисуй", "сгенерируй картинку", "image prompt", "промпт для картинки", hero
  covers, blog covers, slides, posters, product shots, UI mockups, storyboards, character
  sheets, edit/colorize, style transfer, image-to-image, seedream, nano banana, nb2,
  magnific, mystic.
  Do NOT use for: video, 3D models, audio, non-image tasks.
---

# Image Prompting — Seedream 4.5 · Gemini 3

This skill writes image prompts. It does not generate images — `create_image` does.
Your output is: **model + sizing arguments + the prompt text**.

Each model has its own prompt syntax and its own way of being asked for a size. Getting the
size wrong costs real money for zero benefit, so the sizing rules below are not optional.

Every number here is **measured** (`usage.cost` from the API + actual pixels of the returned
file), not read off a price list. Vendor arithmetic lied three times during the audit that
produced this skill — tokenisation differs per vendor. Do not "correct" these numbers from docs.

---

# Step 1 — pick the model

**This table is cost guidance, not a capability map.** Every model here handles any subject
competently — Gemini models are general-purpose, not niche ones. What the rows name
is the one edge where each model beats seedream by enough to justify costing 2.5–3.4x more
per frame. No edge in the frame → no reason to pay the premium. And if the user explicitly
asks for a specific model, that wins — don't argue the table at them.

| When is the premium worth it | Model |
|---|---|
| **It isn't (default)** | **`bytedance-seed/seedream-4.5`** |
| Realistic, lived-in scenes | `bytedance-seed/seedream-4.5` (the default) |
| Close-up skin texture where pores/hairs genuinely carry the shot | `google/gemini-3.1-flash-image` |
| Hardest scenes: many interacting subjects, tricky physics | `google/gemini-3-pro-image` |

**Seedream is the default and usually right.** \$0.04 flat, 7.5 MP, best prompt adherence,
best editing consistency, and by a distance the best price per pixel.

**Magnific Mystic is a separate engine**, not a row in this table. It runs through
`create_image` with `provider: 'magnific'` (direct Magnific API, plan credits — not OpenRouter),
with its own args (nested in the `magnific` object) and its own prompt syntax. Reach for it only when the brief wants the Magnific look specifically
(photographic texture, cinematic light, structure/style references). Everything about it —
sizing, model flavours, engines, sliders, prompting — lives in [mystic.md](references/mystic.md).

**Магнифик есть не у всех.** Провайдер включается только при `MAGNIFIC_API_KEY` в `.env`
сервера. Нет ключа — у `create_image` нет ни параметра `provider`, ни объекта `magnific`:
значит эта установка работает через OpenRouter, и весь раздел Mystic к ней не относится.

**7.5 MP already exceeds any web or screen need**, so resolution is almost never a reason to
leave seedream. The default is the default because it wins, not because it is cheap.

Where each premium model earns its price:
- **Gemini flash** has the best skin fidelity (visible pores, stray hairs). Seedream is
  cleaner but its skin reads slightly "rendered". Only worth \$0.101 when the pores are the
  point of the shot.
- **Gemini pro** costs ~6x seedream per pixel. Use it only when a scene genuinely defeats
  the others — not as a general "better" button.

Deliberately absent: OpenAI image models and `gemini-3.1-flash-lite-image` — both failed
quality testing. Do not suggest them.

---

# Step 2 — set the size correctly

**This is where money gets burned.** Each model needs a different argument, and each has a
trap that costs money while silently giving you less.

| Model | Pass | Never pass | Result at 16:9 | $/frame | $/MP |
|---|---|---|---|---|---|
| `seedream-4.5` | `aspect_ratio` | **`size`** | 3642×2048 (7.5 MP) | **\$0.040** | **\$0.0054** |
| `gemini-3.1-flash-image` | `aspect_ratio` + `resolution:'2K'` | *omitting* `resolution` | 2752×1536 (4.2 MP) | \$0.101 | \$0.024 |
| `gemini-3-pro-image` | `aspect_ratio` + `resolution:'2K'` | `resolution:'1K'` | 2752×1536 (4.2 MP) | \$0.137 | \$0.032 |

### The traps, explicitly

1. **Seedream: never pass `size`.** It costs \$0.04 either way. Passing `size` only *lowers*
   what you get (`'2560x1440'` = 3.7 MP vs 7.5 MP with `aspect_ratio` alone). `aspect_ratio`
   alone returns the model's maximum. This also matches the vendor's own recommended method.

2. **Gemini: always pass `resolution:'2K'`.** Omitting it silently defaults to `1K` — 1376×768
   (1.1 MP) for \$0.069 on flash, the worst price per pixel of any option here.

3. **Gemini pro: `1K` and `2K` cost the same** (\$0.135 vs \$0.137, both 1120 image tokens).
   Asking pro for `1K` is pure loss — four times fewer pixels for the same money. Never `1K`.

**On `4K`:** both Gemini models do it — 5504×3072 = 16.9 MP, \$0.153 on flash and \$0.242 on pro
*(measured)*. There is no 1.1 MP ceiling; the older belief was an artifact of never passing the
argument. But 16.9 MP is print territory: **do not use `4K` for web work.** It costs 50–75%
more for pixels a screen will never show. Mentioned here only so the number is on record.

**On seedream only**, pixel count scales with the ratio: 7.5 MP at 16:9 but 4.2 MP at 1:1
(2048×2048), same \$0.04 — a wider ratio buys pixels for free.

### Which ratio?

Only 16:9 has measured numbers; the rest are the same price. Pick by destination:

| Destination | Ratio |
|---|---|
| Website hero / wide cover | `16:9` — and on seedream it is also the pixel maximum |
| Blog / social card | `16:9` or `4:5` |
| Portrait shot, phone-first | `9:16` or `4:5` |
| Product on a background, square slot | `1:1` |
| Banner strip | `4:1` / `8:1` — **`gemini-3.1-flash-image` only**, no other model takes these |

Leave a deliberate empty zone where text will be overlaid — say so in the prompt ("the left
third is an empty wall"), or the headline lands on a face.

---

# Step 3 — read the model's prompt file

**Do not write a prompt without this.** The models do not share a syntax — seedream treats
comma-separated tags as an anti-pattern, while a prompt tuned for one reads as mush to another.

- **Seedream 4.5** → [seedream.md](references/seedream.md)
  The vendor publishes a real prompt guide; this file follows it. Coherent prose, quoted text,
  explicit fixed elements when editing, visual cue markers. It also carries the **anti-polish
  worked example** — the house pattern for lived-in realism, useful far beyond seedream.
- **Gemini 3 (flash / pro)** → [gemini.md](references/gemini.md)
  Google's official templates, positive-framing rule, camera control, step-by-step for
  complex scenes.
- **Magnific Mystic** (via `create_image` with `provider: 'magnific'`) → [mystic.md](references/mystic.md).
  Its own sizing enums, base-model flavours, engines and sliders. Magnific's written prompt
  guidance is thin, so mystic.md borrows the seedream prose pattern as its base.

---

# Step 4 — task-shaped reading (load only what applies)

- Editing an existing image, style transfer, image-to-image → [editing.md](references/editing.md)
- Need production vocabulary for light, camera, colour grade, materials → [creative-direction.md](references/creative-direction.md)
- Task matches a vertical → load the one pattern file that fits:
  - Stylised / mood-driven portraits → [patterns/portrait-cinema.md](references/patterns/portrait-cinema.md)
  - Product shots on a background → [patterns/ecommerce.md](references/patterns/ecommerce.md)
  - Food & drink → [patterns/food-beverage.md](references/patterns/food-beverage.md)
  - Posters, illustration → [patterns/poster-illustration.md](references/patterns/poster-illustration.md)
  - UI mockups, social formats → [patterns/ui-social.md](references/patterns/ui-social.md)
  - Fashion / beauty editorial → [patterns/fashion-editorial.md](references/patterns/fashion-editorial.md)
  - Character turnarounds, expression sheets, outfit grids → [patterns/character-design.md](references/patterns/character-design.md)

**No pattern covers an ordinary person doing real work in a real interior** — the most common
brief here. For that, use the anti-polish worked example in
[seedream.md](references/seedream.md) as the model, not a pattern file.

---

# What both vendors agree on (and our tests confirm)

Seedream's guide and Google's guide were written independently and land in the same place.
This is the closest thing to a universal rule set here:

- **Dense description beats short description. Ornate vocabulary stacking beats nothing.**
  Describe the scene thoroughly; do not pile up adjectives or "masterpiece, 8k, stunning".
  ByteDance: *"using concise and precise prompts is usually better than repeatedly stacking
  ornate and complex vocabulary"* — while their own worked examples run 60–100 words of
  concrete scene detail. Google says the same in two places.
- **Describe what you want, not what you don't.** Google: instead of "no cars", write
  "an empty, deserted street". Neither model has a `negative_prompt` parameter.
  Caveat from our own testing: seedream *does* honour inline negations in prose
  ("NOT bright cyan" worked, and ByteDance's own examples use "Do not include any text").
  So: prefer positive framing, but an inline negation is a legitimate tool on seedream.
- **State the purpose.** "Design a logo for a gaming company…" outperforms an abstract
  description of the same picture. Both vendors say this explicitly.
- **Quote text that must appear in the image.** Mandatory on seedream, recommended on Gemini.
- **No lens numbers.** "50mm, f/2.8" is less reliable than "shallow depth of field".

**Do not mix models inside one series.** Verified end-to-end: a seedream hero used as the
reference for a seedream follow-up carried identity astonishingly well — same face, same
clothes, right down to the same forearm tattoo — and held the light direction and colour
grade *(measured)*. Pick one model per series and stay on it.

Things we established by testing that no vendor documents:
- Explicit lighting instructions land hard ("70% of the frame in black", "no fill light",
  "hard falloff"). Vague mood words do not.
- An explicit anti-polish clause is needed almost every time, or you get a catalogue shot:
  "candid documentary, not a staged studio shot", "no gloss", "NOT a clean styled set".
- Hands are a lottery on every model here. No model is systematically worse. Do not judge
  a model by one frame with bad hands — re-roll.

---

# Output format

```
Model: <bytedance-seed/seedream-4.5 | google/gemini-3.1-flash-image | google/gemini-3-pro-image>
Args: aspect_ratio: '<16:9|1:1|…>'[, resolution: '2K'][, reference_images: ['<path>']]
Cost: ~$<measured $/frame>

Prompt:
<the prompt text, ready to copy>

Notes:
- <anything you inferred because the user did not specify>
```

`resolution` only for Gemini — seedream takes `aspect_ratio` alone.
`reference_images` takes local absolute paths or http(s) URLs.

State the model choice and why in one line when it is not the default.

**When a source image is involved, first decide which of the two branches you are in** — they
have different contracts, and picking the wrong one is the most common mistake here:

**Editing** — modify the given image, keep it otherwise intact. One change per iteration.
Add the contract:

```
Change: <one concrete thing>
Preserve: <face, pose, lighting, framing, geometry, …>
```

**Reference-based generation** — extract something from the reference (character, style,
product) and draw a **new scene** with it. Many things change by definition, and the
one-change rule does not apply. Instead name the two halves the vendor asks for:

```
Reference target: <what to carry over — identity, style, light treatment>
New scene: <what to draw>
```

A landing-page series ("same person, next service") is almost always this second branch, not
an edit. See [editing.md](references/editing.md).

---

# Final response style

Prefer: ready-to-copy prompts, hex colours, concrete materials, named compositions, explicit
lighting, per-model syntax (prose for seedream, Google's templates for Gemini).

Avoid: tag soup ("cool, modern, 4k"), vague praise ("stunning, epic, masterpiece"), negative
framing where a positive description works, external comparisons ("like an Apple ad" — describe
the visual properties instead), lens numbers, and recommending a model without stating the
sizing arguments alongside it.
