# Editing / image-to-image

Editing works on every model here — pass the source image via `reference_images` on
`generate_image` plus an instruction in the prompt. There is no separate edit model and no
separate endpoint.

`reference_images` takes **local file paths** (png/jpg/jpeg/webp — absolute, or relative to
the project) **or http(s) URLs**, as an array. Local files are inlined as base64 for you.
Limits: 14 images on seedream and Gemini.

**Two branches, different contracts — decide which one you are in first:**

- **Editing** — modify the given image, leave the rest intact. One change per iteration.
- **Reference-based generation** — extract a character/style/product from the reference and
  draw a **new scene**. Many things change at once; the one-change rule does not apply.

A landing-page series ("same technician, next service") is the second branch, not the first.
Treating it as an edit gets you the new subject awkwardly patched into the old composition.

**Mask-based inpainting is NOT supported.** `/v1/images` has no editing endpoint — this is
image-to-image only. When you need to point at a region, use visual cue markers (below)
instead of a mask.

**Use seedream unless you need something else.** It is the strongest editor of the three —
4.5 was built for editing consistency and "strictly preserves the details of the reference
images" *(vendor)*. Our test (recolour a jacket, "leave everything else alone") held face,
pose, background and even added correct secondary physics — a colour bounce from the jacket
onto the chin *(measured)*.

---

## The universal contract

Both vendors independently document the same pattern: **name what changes, then name what
must not.**

> "Use concise, unambiguous instructions. **Avoid vague pronouns.** If other elements should
> remain unchanged, specify that explicitly." — ByteDance *(vendor)*

- ✅ `Dress the tallest panda in pink Peking Opera costume and headgear, keeping its pose unchanged.`
- ❌ `Put that one in pink clothes.`

Google's version of the same rule *(vendor)*:
`Change only the [element] to [new element]. Keep everything else in the image exactly the same.`

**One change per iteration.** Do not try to change three things at once.

## The four operations *(vendor, ByteDance)*

Addition, deletion, replacement, modification. Their own examples — note the shape, "what to
change" + "what to hold":

| Op | Prompt |
|---|---|
| Addition | `Add matching silver earrings and a necklace to the girl in the image` |
| Deletion | `Remove the girl's hat.` |
| Replacement | `Replace the largest bread man with a croissant man, keeping the action and expression unchanged.` |
| Modification | `Turn the three robots into transparent crystal, colored red, yellow and green from left to right. Make the green one run, yellow walk, red stand.` |

Demand consistent secondary changes explicitly — the vendor does this in their own examples:

> `Keep the composition and lighting direction unchanged. Replace the pine bonsai on the right
> with … Crucial: The shadow on the wall must change to match…`

If you move or replace a lit object and do not mention its shadow, you may keep the old one.

## Visual cue markers — instead of a mask *(vendor, ByteDance)*

When a region is "difficult to describe accurately using text alone", draw on the reference
image and refer to the marks. **Arrows, bounding boxes and doodles are an official feature**:

- `Insert a TV where the red area is marked and a sofa where the blue area is marked. Keep the original wooden style.`
- `Enlarge the title to match the red box and change its style to match the saxophone icon.`
- `Only keep the character in the green outline.`

This is the closest thing to inpainting available here.

## Multiple reference images — index them *(vendor, both)*

Number the inputs and say what to take from each:

- `Replace the subject in Image 1 with the subject from Image 2.`
- `Dress the character in Image 1 with the outfit from Image 2.`
- `Apply the style of Image 2 to Image 1.`

Limits: seedream and Gemini take **14** references.

## Reference-based generation *(vendor, ByteDance)*

Different from editing: you are not modifying the reference, you are extracting from it.
Describe **two** things explicitly:

- **Reference Target** — what to extract and keep (character design, product material, style).
- **Generated Scene Description** — the scene, layout and specifics of what to draw.

Vendor example: `Based on the character in the reference image, create an anime figure and
place it on a desk. Behind it, place a birthday gift box printed with the character's image…
The overall style should be consistent with the reference image, maintaining a cinematic
photographic feel.`

This is how you keep a series of landing-page images stylistically consistent: pass an
approved frame as the reference and describe the style to carry plus the new scene.

## Sketch → high fidelity *(vendor, ByteDance)*

1. Provide a clean source image. If it carries text annotations, say
   "Generate based on the text in the image".
2. State the subject and requirements ("a high-fidelity UI interface", "a modern living room").
3. Name the consistencies to hold ("furniture placement matches the reference",
   "the layout follows the prototype").

Vendor example: `This is a hand-drawn wireframe of a web-based housing rental platform's
detail page. Please render it into a high-fidelity UI interface according to the textual
annotations in the sketch. Add sample images in the gallery section…`

---

## Recipes

Prose, not slots — seedream treats tag lists as an anti-pattern and the others do not mind prose.

**Object removal**
```
Remove [object] from this image and fill the gap with [logical replacement] matching the
surroundings. Keep [preserved elements] exactly the same.
```

**Object addition**
```
Add [object] to this image at [location], scaled [relative size], lit to match the existing
lighting. Keep everything else unchanged.
```

**Lighting change**
```
Relight this scene as [new lighting]. Keep the subject, pose and composition exactly the
same. The shadows must change to match the new light direction.
```

**Season / weather**
```
Turn this scene into [season/weather]. Keep the architecture and camera position exactly the
same. Adjust [snow / fallen leaves / wet reflections / sky] consistently.
```

**Colourisation**
```
Colorize this black-and-white photograph with era-appropriate colours for [decade]. Skin
tones natural and realistic. Keep the grain and the original composition unchanged.
```

**Restoration**
```
Restore this damaged photograph: fix [tears / scratches / fading / stains] and improve
sharpness and contrast. Preserve the original character and film grain.
```

**Localisation**
```
Translate all [source language] text in this image to [target language], using [font style],
with all other content unchanged. Maintain font sizing and position.
```
(The vendor's own example of this shape: `Translate the image into Chinese, using a
handwritten font, with all other content unchanged.`)

**Material / physics**
```
Fill the glass with [liquid], adding correct refraction, a meniscus and condensation on the
outside, matching the existing lighting. Keep everything else unchanged.
```
