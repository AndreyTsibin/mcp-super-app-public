# Seedream 5.0 Lite — prompt syntax

**Fallback and editing workhorse.** `bytedance-seed/seedream-5-0-lite` · \$0.035 flat ·
7.5 MP at 16:9. Not the default any more — the default is `openai/gpt-5.4-image-2`
(drafts) and production goes to `gemini-3.1-flash-image`; see SKILL.md step 1. Come here
when a draft frame disappointed the user, when the job will be edited or extended into a
series off one reference, or when raw pixel count is the point.

Source: ByteDance's official prompt guide,
[docs.byteplus.com/en/docs/ModelArk/1829186](https://docs.byteplus.com/en/docs/ModelArk/1829186)
("Seedream 4.0-4.5 prompt guide"), plus the
[image generation API reference](https://docs.byteplus.com/en/docs/ModelArk/1541523).
Everything below marked *(vendor)* is from those pages. Everything marked *(measured)* is ours.

**Caveat on the source.** The vendor's prompt guide was written for the 4.x line; ByteDance
has since published separate 5.0 pages we have not read through. The syntax below still
matches what 5.0 Lite does in our own runs *(measured)*, but treat the *(vendor)* notes as
"documented for 4.x, holding for 5.0" rather than freshly confirmed.

Sizing: pass `aspect_ratio` for web work (7.5 MP at 16:9); `size` only for print, up to
16.8 MP at the same flat \$0.035. See SKILL.md step 2.

---

## The one rule that matters most

**Coherent natural language, not tags.** The vendor names tag-soup as the anti-pattern, with
this exact pair *(vendor)*:

- ✅ `A girl in a lavish dress walking under a parasol along a tree-lined path, in the style of a Monet oil painting.`
- ❌ `Girl, umbrella, tree-lined street, oil painting texture.`

Structure the prose as **subject + action + environment**, then add descriptors of **style,
colour, lighting or composition** if aesthetics matter *(vendor)*.

## How long?

Detailed, but not padded. Two vendor statements that must be read together:

> "Use clear and detailed **natural language** to describe the scene. For complex images,
> describe elements thoroughly to control the output precisely." *(vendor)*

> "using concise and precise prompts is usually better than repeatedly stacking ornate and
> complex vocabulary" *(vendor)*

These are not in conflict. **Detail = concrete nouns, spatial relations, materials, light.
Padding = adjective stacking, "masterpiece / 8k / stunning", synonyms of the same idea.**
The vendor's own worked examples run 60–100 words and are dense with concrete objects and
their positions — that is the target. Hard cap: **under 600 English words** *(vendor, API
reference)*; beyond that "information scatters" and details get dropped.

This matches our own testing: long concrete descriptions beat short ones *(measured)*.

## Text inside the image

**Double quotation marks are the syntax.** *(vendor)*

- ✅ `Generate a poster with the title "Seedream 4.5".`
- ❌ `Generate a poster titled Seedream 4.5.`

4.5 specifically improved "typography and dense text rendering" over 4.0 *(vendor)*.

## State the purpose

Say what the image is *for* and what *type* it is *(vendor)*:

- ✅ `Design a logo for a gaming company. The logo features a dog playing with a game controller. The company name "PITBULL" is written on it.`
- ❌ `An abstract image of a dog holding a controller, and the word PITBULL on it.`

## Negations

There is **no `negative_prompt` parameter** — checked against the full API reference, zero
occurrences *(vendor)*. The guide does not discuss negation as a technique.

But inline negation in prose **works** — both the vendor's own examples use it ("Do not include
any text or hand-drawn edges from the original sketch", "Remove the girl's hat") and our
testing confirmed it ("NOT bright cyan" was honoured) *(measured)*.

So: prefer positive description, reach for an inline negation when the thing to exclude is
easier to name than to describe around.

## Style

Use **precise style keywords** or a **reference image** *(vendor)*. "picture book style",
"children's book illustration style" are the vendor's own examples of keywords that land.

For diagrams, formulas, infographics: use **precise technical terminology** and explicitly
state the visualisation format, layout and style *(vendor)*. The model is built to turn
reasoning into dense visual content — the vendor's example is literally
`Draw the following system of binary linear equations and the corresponding solution steps
on the blackboard: 5x + 2y = 26; 2x - y = 5.`

## Multiple images in one call

Trigger a series with the phrases **"a series"**, **"a set"**, or by stating the number
*(vendor)*. Output stays character-consistent and stylistically unified — meant for
storyboards, icon sets, IP design. `n` goes up to 10 on this model.

Example *(vendor)*: `Generate four film storyboard images, corresponding to the following
scenes: astronauts repairing a spacecraft in a space station, suddenly encountering an
asteroid belt attack, …`

## What the 4.x line brought *(vendor)*

Stronger prompt adherence, alignment and aesthetics; "strictly preserves the details of the
reference images" in multi-image editing; better typography and dense text. Benchmarked on
their internal MagicBench — no published numbers, treat as vendor marketing.

Hard technical limits of 5.0 Lite *(measured)*: no resolution tiers,
output between 3,686,400 and 16,777,216 px, price flat at \$0.035 across that whole range.

---

## Worked example — the anti-polish pattern *(measured)*

Our house pattern for lived-in realism. Note: dense concrete detail, explicit light physics,
explicit anti-polish clause, prose throughout.

```
A photorealistic wide shot of a cluttered independent bicycle repair workshop at dusk. A
mechanic in a worn canvas apron leans over a stripped-down road bike frame clamped in a
stand. Low warm light from a single caged work lamp rakes across the scene from the left;
deep shadow swallows the far corner, no fill light, hard falloff. Grease-blackened fingers,
scuffed concrete floor, mismatched tools on a pegboard. Candid documentary photography, not
a staged studio shot, no gloss, no product-catalogue tidiness.
```

Why it works: every clause is a concrete thing or a light instruction. No adjective stacking.
The last sentence is the anti-polish clause — without it you get a catalogue shot *(measured)*.

## Editing

See [editing.md](editing.md) — seedream is the strongest editor of the three and the vendor
documents the syntax properly.
