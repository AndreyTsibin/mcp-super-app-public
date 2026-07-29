# Gemini 3 Image — prompt syntax

`google/gemini-3.1-flash-image` (Nano Banana 2) · `google/gemini-3-pro-image` (Nano Banana Pro).

The code names are current and official — Google states "Nano Banana is the name for Gemini's
native image generation capabilities". Both are GA, not preview.

Sources: Google's official
[image generation guide](https://ai.google.dev/gemini-api/docs/image-generation),
[image prompting best practices](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/capabilities/gemini-image-generation-best-practices),
and the [Gemini 3 developer guide](https://ai.google.dev/gemini-api/docs/gemini-3).
Marked *(vendor)* below. Ours marked *(measured)*.

**Sizing: always pass `resolution`** — omitting it silently gives you 1K. See SKILL.md step 2.
`2K` is the working tier on both models; never ask pro for `1K` (same price as `2K`).

---

## When to reach for these at all

Seedream is the default. Come here for:
- **Skin texture close-ups** — flash renders pores and stray hairs better than seedream,
  whose skin reads slightly "rendered" *(measured)*. This is the only reason to pick flash.
- **Genuinely hard scenes** — pro only. It is ~6x seedream per pixel; it is not a "better" button.

**Never come here for pixels.** At `2K` flash gives 4.2 MP (2752×1536 at 16:9) for \$0.101 —
*fewer* pixels than seedream's 7.5 MP at \$0.040, and 2.5x the price. Pro at `2K` is the same
4.2 MP for \$0.137. Reaching for Gemini to get a bigger frame is a downgrade *(measured)*.

## Official rules *(vendor)*

- **Be specific.** "More details give you more control." `ornate elven plate armor, etched
  with silver leaf patterns` beats `fantasy armor`.
- **Provide context and intent.** "Create a logo for a high-end, minimalist skincare brand"
  beats "Create a logo". (Same rule ByteDance gives — state the purpose.)
- **Describe what you want, not what you don't.** Instead of "no cars", write "an empty,
  deserted street with no signs of traffic". There is **no `negative_prompt`** on Gemini
  (unlike Imagen). Google's guidance is to rephrase positively.
- **Control the camera** with descriptive terms: "wide-angle shot", "macro shot",
  "low-angle perspective". Not lens numbers.
- **Step-by-step for complex scenes**: "First, create a background… Then… Finally…".
- **Say "create an image of"** — otherwise "the multimodal model might respond with text
  instead of the image".
- **Iterate.** "Don't expect a perfect image on your first attempt."

## How long?

Google's own docs pull in two directions, and the resolution matters:

- Image guide: *"Describe a scene in rich detail. The more specific you are, the more control
  you have."*
- Gemini 3 dev guide: *"Be concise in your input prompts. Gemini 3 responds best to direct,
  clear instructions. It may over-analyze verbose or overly complex prompt engineering
  techniques used for older models."*

**Read together: dense scene description yes; prompt-engineering scaffolding no.** Drop role
preambles, "think step by step", and incantations — keep concrete detail. This is the same
conclusion ByteDance's guide reaches independently, and it matches our testing *(measured)*.

Also: *"Place your specific instructions or questions at the end of the prompt, after the
data context."* *(vendor)*

## Official templates *(vendor)*

**Photorealism**
```
A photorealistic [shot type] of a [subject] in a [setting]. [Light description].
Shot from a [angle] with a [lens].
```

**Illustration**
```
A [style] of a [subject with details] doing [activity]. The design features
[visual qualities] and [color preference].
```

**Text in image**
```
Create a [image type] for [brand] with the text '[exact text]' in a [font style].
```

**Product mockup**
```
A high-resolution, studio-lit product photograph of a [product]…
The lighting is a [setup] to [purpose].
```

Plus templates for minimalism/negative space, sequential art (comics), and grounding with
Search — see the source page if the task calls for one.

## Editing

Google documents six techniques — add/remove, inpainting, style transfer, multi-image
composition, detail preservation, sketch refinement. See [editing.md](editing.md).

Multi-turn editing uses `previous_interaction_id` and requires passing **Thought Signatures**
*(vendor)* — neither is exposed through our `create_image`, so treat each call as one-shot.

## Limits *(vendor + measured)*

- Up to **14 reference images**; DeepMind claims consistency across "up to five characters"
  and "up to fourteen objects" *(vendor)*.
- Aspect ratios — pro: `1:1, 3:2, 2:3, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9`.
  flash is wider, adding the extremes `1:4, 4:1, 1:8, 8:1` *(vendor)* — flash is the only
  model here that does banner-strip ratios.
- Resolution tiers — flash: `512px, 1K, 2K, 4K`; pro: `1K, 2K, 4K`. Uppercase `K` is
  mandatory; `1k` is rejected *(vendor)*. `2K` = 2752×1536 at 16:9 = 4.2 MP *(measured)* —
  the working tier: \$0.101 on flash, \$0.137 on pro.
- `4K` exists: 5504×3072 at 16:9 = 16.9 MP, \$0.153 on flash and \$0.242 on pro. It is a real
  render, not an upscale — micro-detail holds at 100% and image tokens scale with the tier
  (1120 → 1680 → 2520) *(measured)*.
  But 16.9 MP is print territory: **do not use `4K` for web work.**
