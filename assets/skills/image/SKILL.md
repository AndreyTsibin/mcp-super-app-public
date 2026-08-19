---
name: image
description: >
  Image prompting skill for GPT-5.4 Image 2, Seedream 5.0 Lite and Gemini 3 (Nano Banana 2 / Pro)
  and for Magnific Mystic — all generated through the create_image tool (`provider` picks the engine).
  Writes ready-to-use prompts plus the model and sizing arguments to pass with them.
  Use when: "нарисуй", "сгенерируй картинку", "image prompt", "промпт для картинки", hero
  covers, blog covers, slides, posters, product shots, UI mockups, storyboards, character
  sheets, edit/colorize, style transfer, image-to-image, gpt-image, seedream, nano banana, nb2,
  magnific, mystic.
  Do NOT use for: video, 3D models, audio, non-image tasks.
---

# Image Prompting — GPT-5.4 Image 2 · Seedream 5.0 Lite · Gemini 3

This skill writes image prompts. It does not generate images — `create_image` does.
Your output is: **model + sizing arguments + the prompt text**.

Each model has its own prompt syntax and its own way of being asked for a size. Getting the
size wrong costs real money for zero benefit, so the sizing rules below are not optional.

Every number here is **measured** (`usage.cost` from the API + actual pixels of the returned
file), not read off a price list. Vendor arithmetic lied three times during the audit that
produced this skill — tokenisation differs per vendor. Do not "correct" these numbers from docs.

---

# Step 1 — pick the model

**Ask one question first: is this frame going into production?** Production means a landing
page, a client site, a deck, anything a real audience will see. Everything else — a reference
to look at, a mood test, a throwaway idea, "just draw me something" — is a draft. That answer
picks the model; the rest is detail. And if the user explicitly names a model, that wins.

| Situation | Model | \$/frame |
|---|---|---|
| **Production: landing, client site, anything shipped** | **`google/gemini-3.1-flash-image`** + `resolution:'2K'` | \$0.101 |
| **Drafts, references, experiments, one-off fun (default)** | **`openai/gpt-5.4-image-2`** | **\$0.035** |
| The user disliked a draft frame, **or** editing / a series is planned | `bytedance-seed/seedream-5-0-lite` | \$0.035 |
| Hardest scenes: many interacting subjects, tricky physics | `google/gemini-3-pro-image` + `resolution:'2K'` | \$0.137 |

**Production goes to `gemini-3.1-flash-image`, and cost is not an argument against it.**
It gives the best skin and material fidelity of the set (visible pores, stray hairs, worn
fabric), 4.2 MP, and the only banner-strip ratios. A whole landing page is 3–5 frames —
\$0.30–0.51 for the entire site. There is nothing to save here, and a cheap frame on a first
screen is visible to everyone. Keep the **whole** series on it: hero first, then the rest with
the hero as `reference_images`. Mixing models inside one series breaks the shared style.

**Everything not shipped goes to the default, `gpt-5.4-image-2`.** Cheapest frame we measure
and the most believable one-shot realism of the cheap tier — lived-in interiors, working
hands, plausible clutter, no obvious anatomy failures *(measured on a technician-in-a-bathroom
scene, 6-model comparison, 2026-08-19)*. Its cost is **not** flat: it scales with pixels
(16:9 = 1536×864 for \$0.035, 1:1 = 1024×1024 for \$0.024). No resolution tiers, `size`
ignored, hard ceiling 1.3 MP — which is the other reason production does not live here.

**Its one hard limit is pixels: 1.3 MP.** Fine for a draft, a reference, a card in a chat.
Not enough for a hero slot or anything that has to hold up on a retina screen.

**`seedream-5-0-lite` is the fallback and the editor.** It wins on pixels (7.5 MP flat
\$0.035, ~\$0.0047/MP — unbeatable) and it is the strongest **editor** of the set. But in
one-shot generation its people and hardware go wrong more often: in the comparison run it put
a hand through the glass of a washing-machine door and a control board where the tank sits
*(measured)*. Switch to it when the user rejects a draft frame, or when the job is
edit-heavy from the start. For production work the answer is flash, not seedream.

**Editing is priced separately — read this before planning a job.** An edit on
`gpt-5.4-image-2` (`reference_images` + an instruction) costs **~\$0.140** *(measured)* —
4x a fresh frame on the same model, and 4x the same edit on seedream — because the source
image is billed as input tokens. The edit quality is genuinely excellent (Cyrillic lettering
placed on clothing came out clean, face/pose/interior untouched), so it is worth paying as a
one-off rescue. **But if the brief already implies generate-then-edit, or a series built off
one reference image, run the whole job on seedream from the first frame.** The default is a
single-shot model; seedream is the workhorse for iteration.

**Magnific Mystic is a separate engine**, not a row in this table. It runs through
`create_image` with `provider: 'magnific'` (direct Magnific API, plan credits — not OpenRouter),
with its own args (nested in the `magnific` object) and its own prompt syntax. Reach for it only
when the brief wants the Magnific look specifically (photographic texture, cinematic light,
structure/style references). Everything about it — sizing, model flavours, engines, sliders,
prompting — lives in [mystic.md](references/mystic.md).

**Магнифик есть не у всех.** Провайдер включается только при `MAGNIFIC_API_KEY` в `.env`
сервера. Нет ключа — у `create_image` нет ни параметра `provider`, ни объекта `magnific`:
значит эта установка работает через OpenRouter, и весь раздел Mystic к ней не относится.

Deliberately absent: `x-ai/grok-imagine-image-2.0` (1280×720 = 0.9 MP for \$0.060 — the worst
price per pixel measured, and it silently ignores `size`) and `gemini-3.1-flash-lite-image`
(failed quality testing). `openai/gpt-image-2` is the default's older sibling: same size, same
price, weaker frame — use it only if 5.4 is unavailable. Do not suggest any of these otherwise.

---

# Step 2 — set the size correctly

**This is where money gets burned.** Each model needs a different argument, and each has a
trap that costs money while silently giving you less.

| Model | Pass | Never pass | Result at 16:9 | $/frame | $/MP |
|---|---|---|---|---|---|
| `gpt-5.4-image-2` | `aspect_ratio` | `resolution`, `size` (both ignored) | 1536×864 (1.3 MP) | **\$0.035** | \$0.026 |
| `seedream-5-0-lite` | `aspect_ratio` | `size` (web work) | 3642×2048 (7.5 MP) | \$0.035 | **\$0.0047** |
| `gemini-3.1-flash-image` | `aspect_ratio` + `resolution:'2K'` | *omitting* `resolution` | 2752×1536 (4.2 MP) | \$0.101 | \$0.024 |
| `gemini-3-pro-image` | `aspect_ratio` + `resolution:'2K'` | `resolution:'1K'` | 2752×1536 (4.2 MP) | \$0.137 | \$0.032 |

### The traps, explicitly

0. **The default model has no size knobs.** `gpt-5.4-image-2` takes `aspect_ratio` and nothing
   else — `resolution` and `size` are ignored silently. The ratio *is* the price lever, because
   cost scales with pixels: 16:9 → 1536×864 for \$0.035, 1:1 → 1024×1024 for \$0.024
   *(measured)*. Two consequences: a square frame is genuinely cheaper here, and 1.3 MP is the
   ceiling — need more pixels, change the model, not the argument.

1. **Seedream: for web work, pass `aspect_ratio` and leave `size` alone.** The price is flat
   \$0.035 whatever you ask for, and `aspect_ratio` alone already returns 7.5 MP at 16:9 —
   more than any screen needs. A `size` below that just *lowers* what you get
   (`'2560x1440'` = 3.7 MP for the same money). The one reason to pass `size` is **print**:
   the ceiling is 16,777,216 px (`'5456x3072'` = 16.8 MP at 16:9), still \$0.035 *(measured)*.
   Accepted range is 3,686,400–16,777,216 px; outside it the model returns an error.

2. **Gemini: always pass `resolution:'2K'`.** Omitting it silently defaults to `1K` — 1376×768
   (1.1 MP) for \$0.069 on flash, the worst price per pixel of any option here.

3. **Gemini pro: `1K` and `2K` cost the same** (\$0.135 vs \$0.137, both 1120 image tokens).
   Asking pro for `1K` is pure loss — four times fewer pixels for the same money. Never `1K`.

**On `4K`:** both Gemini models do it — 5504×3072 = 16.9 MP, \$0.153 on flash and \$0.242 on pro
*(measured)*. There is no 1.1 MP ceiling; the older belief was an artifact of never passing the
argument. But 16.9 MP is print territory: **do not use `4K` for web work.** It costs 50–75%
more for pixels a screen will never show. Mentioned here only so the number is on record.

**Ratio moves pixels on two models, but in opposite money directions.** On seedream a wider
ratio buys pixels **for free**: 7.5 MP at 16:9 vs 4.2 MP at 1:1 (2048×2048), \$0.035 either
way — and its 16.8 MP print maximum costs nothing extra, so there it is a file-size decision,
not a money one. On the default GPT model the same move **costs**: 1.3 MP at 16:9 for \$0.035
vs 1.0 MP at 1:1 for \$0.024. On Gemini the ratio does not move the price; the `resolution`
tier does.

### Which ratio?

Pick by destination. Price note: on Gemini and seedream the ratio does not change what you
pay; on the default GPT model it does (see trap 0 above).

| Destination | Ratio |
|---|---|
| Website hero / wide cover | `16:9` — always on `gemini-3.1-flash-image` + `resolution:'2K'`; on seedream 16:9 is also the pixel maximum |
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

- **GPT-5.4 Image 2** (the default) → [gpt.md](references/gpt.md)
  What it is good at, the 1.3 MP ceiling, the \$0.140 edit price, and why it reuses the
  seedream prose pattern unchanged. Short file — read it, then write the prompt the
  seedream way.
- **Seedream 5.0 Lite** → [seedream.md](references/seedream.md)
  The vendor publishes a real prompt guide; this file follows it. Coherent prose, quoted text,
  explicit fixed elements when editing, visual cue markers. It also carries the **anti-polish
  worked example** — the house pattern for lived-in realism, and the one the default model
  wants too, so read it even when you are prompting GPT.
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
grade *(measured)*. Pick one model per series and stay on it. Practical consequence: decide
production-or-draft (step 1) **before the first frame**, because the choice binds the whole
series — a landing page runs start to finish on `gemini-3.1-flash-image`, and you never
"switch to something cheaper" halfway through.

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
Model: <openai/gpt-5.4-image-2 | google/gemini-3.1-flash-image | bytedance-seed/seedream-5-0-lite | google/gemini-3-pro-image>
Args: aspect_ratio: '<16:9|1:1|…>'[, resolution: '2K'][, reference_images: ['<path>']]
Cost: ~$<measured $/frame>

Prompt:
<the prompt text, ready to copy>

Notes:
- <anything you inferred because the user did not specify>
```

`resolution` only for Gemini — the default GPT model and seedream take `aspect_ratio` alone.
`reference_images` takes local absolute paths or http(s) URLs.

State the model choice and why in one line, every time — including the default. One clause is
enough: "production frame, so flash" / "quick draft, so the cheap default".

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
