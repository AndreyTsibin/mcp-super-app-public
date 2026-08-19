# GPT-5.4 Image 2 — prompt syntax

**Default model — for drafts, references and experiments.** `openai/gpt-5.4-image-2` ·
\$0.035 at 16:9 · 1536×864 (1.3 MP). Production frames do not come here: anything shipped
goes to `gemini-3.1-flash-image` at `resolution:'2K'` (SKILL.md step 1).

Sizing: pass `aspect_ratio` and nothing else. `resolution` and `size` are ignored silently.
Price scales with pixels: 16:9 = 1536×864 for \$0.035, 1:1 = 1024×1024 for \$0.024 *(measured)*.

OpenAI publishes no prompt guide for this model comparable to ByteDance's or Google's, so
everything here is *(measured)* — from the 2026-08-19 six-model comparison run — or marked
*(inferred)* where it follows from how the model behaved rather than from a documented rule.

---

## The one rule that matters most

**The seedream house pattern transfers as-is.** The comparison run used one identical prose
prompt across six models; on this model it produced the strongest frame of the cheap tier
without a single model-specific tweak *(measured)*. So write it the way seedream.md teaches:

**subject + action + environment**, then light, materials and an explicit anti-polish clause,
all in coherent prose. No tag soup, no "masterpiece / 8k", no lens numbers.

See the [anti-polish worked example](seedream.md#worked-example--the-anti-polish-pattern-measured) —
it is the house pattern, not a seedream-only trick.

## What it is unusually good at *(measured)*

- **Believable working scenes.** Tools on the floor, an unscrewed panel leaning against a
  bath, a torch actually lighting the puddle it points at — it renders the *logic* of a job
  in progress, not just its props.
- **No cheap-tier anatomy failures.** In the same scene where seedream put a hand through
  the glass of a washing-machine door, this model kept limbs, hands and hardware coherent.
- **Cyrillic lettering on objects.** Asked to place «РЕМБЫТ» on a work polo, it rendered the
  word cleanly and in the right place — better than most diffusion models manage in Russian.
  Still quote the exact string (`"РЕМБЫТ"`) and expect to re-roll on longer lines.

## What it will not do

- **Pixels.** 1.3 MP at 16:9 is the ceiling — no tier argument raises it. Anything that has
  to fill a hero slot goes to `gemini-3.1-flash-image` at `resolution:'2K'`.
- **Small embroidered logos.** Sub-centimetre lettering on clothing turns to mush, same as
  every model in the set. Ask for a plain garment, or add the logo in post.
- **Flat pricing.** Unlike seedream, a wider ratio costs more here. There is no free upgrade
  from picking 16:9.

## Editing — expensive, excellent, use deliberately

Passing `reference_images` plus a change instruction works, and works *well*: in the measured
edit the requested change landed and the face, pose, tools, interior and lighting came back
untouched — the same one-change contract seedream honours.

**But it cost \$0.140** *(measured)* — 4x a fresh frame on this model and 4x the same edit on
seedream, because the source image is billed as input tokens.

Practical rule:

- **One-off rescue** ("just fix the sign in this frame") → fine, pay it.
- **Planned iteration, or a series off one reference** → do not start the job here. Generate
  the first frame on `bytedance-seed/seedream-5-0-lite` and keep the whole series there;
  mixing models across a series breaks identity anyway (see SKILL.md).

Use the same Change / Preserve contract as everywhere else — see [editing.md](editing.md).

## Output format

Returns **PNG**, and heavy for its size (~1.8 MB at 1.3 MP) *(measured)*. For anything going
on a site, run `optimize_images` on `save_dir` afterwards — same last step as the rest.
