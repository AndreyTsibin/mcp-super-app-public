# E-Commerce Product Photography Patterns

Reusable prompt templates for product ads, packaging, and commercial visuals. Each pattern uses `{variables}` for customization and is written as coherent prose — the format every model here expects.

**Which model?** Step 1 of SKILL.md decides that, not this file: production frames
(landing, client site, anything shipped) go to `google/gemini-3.1-flash-image` with
`resolution:'2K'`; drafts and experiments go to the default `openai/gpt-5.4-image-2`.
The "Best fit for this pattern" line under each pattern below says which model holds *this
particular layout* best — read it as a tie-breaker inside your category, and as a reason to
override step 1 only when the pattern's own demand (exact object counts, dense on-image text,
a consistent set of n frames) is the whole point of the frame. Seedream leads on those, and
that is a deliberate trade of skin texture for instruction-following.

---

## Miniature Diorama Product Ad

Use when you need a playful, attention-grabbing product visual where tiny workers interact with an oversized product — ideal for social media ads and launch campaigns.

<!-- Source concept: miniature/tilt-shift product advertising with construction-worker scale play -->

```
A social media product ad built as a miniature diorama. An oversized {product_name} stands
centered on a clean {surface_color} tabletop in a photo studio, surrounded by 1/87 scale
construction-worker figurines — some climbing the packaging with tiny ladders, others working a
miniature crane to lift the cap, a small crew painting the label. Eight figurines at most, each
in a {accent_color} hard hat, their miniature tools finely detailed. Soft diffused light from
overhead plus a key light from the upper left that catches the {product_material} surface;
condensation and surface texture read clearly on the product, and every figurine casts its own
small hard shadow. Eye-level camera, shallow depth of field with tilt-shift blur at the frame
edges, background slightly desaturated. The product stays recognizable and unaltered, and
everything in frame rests on the surface — nothing floats. The product's own label is the only
lettering in the shot.
```

**Key levers:** `{product_name}`, `{product_material}` (frosted glass, matte aluminum, glossy plastic), `{surface_color}` (white marble, raw concrete, light birch wood), `{accent_color}` (safety orange #FF6600, yellow #FFD600)

**Best fit for this pattern:** `bytedance-seed/seedream-5-0-lite` — best prompt adherence holds the figurine count and scale play, and keeps the product label legible

**Args:** `aspect_ratio: '4:5'` · ~\$0.035

---

## Luxury Cosmetics Studio Shot

Use for premium beauty or fragrance product photography — dark, moody, tactile surfaces with atmospheric effects.

<!-- Source concept: luxury perfume/cosmetics dark-marble studio photography with condensation and smoke -->

```
A luxury brand campaign hero for print and web. A {product_name} bottle stands centered on a
{background_surface} surface in a dark studio, turned to a three-quarter angle, its
{product_finish} catching a single key light from the upper right. A thin layer of low-hanging
smoke drifts left to right behind it, volumetric haze softens the space, and {time_mood} ambient
light fills the rest. Fine water droplets sit on the product as condensation rather than sprayed
mist. {accent_material} flanks the product on both sides. The contact shadow is sharp at the base
and fades soft as it travels; the reflection on the surface below stays dark and soft. Background
is a #0a0a0a to #1a1a1a gradient, the palette restricted to {palette} with no colour spilling
outside it. Clean light with no lens flare, no text overlaid on the image, no hands in frame.
```

**Key levers:** `{background_surface}` (nero marquina marble, wet obsidian slab, brushed gunmetal), `{product_finish}` (frosted glass, lacquered black, brushed gold), `{accent_material}` (raw quartz crystals, dried lavender stems, black river stones), `{palette}` (golds #C9A84C and blacks, rose #B76E79 and creams, emerald #2D6A4F and silvers), `{time_mood}` (cold blue, warm amber)

**Best fit for this pattern:** `bytedance-seed/seedream-5-0-lite` — 7.5 MP covers magazine print, and the restricted palette plus condensation detail depend on prompt adherence more than on skin fidelity

**Args:** `aspect_ratio: '4:5'` · ~\$0.035

---

## 9-Panel TVC Storyboard Grid

> For a dark-themed variant with timestamps, see [multi-panel.md](../multi-panel.md#1-9-cell-grid-storyboard).

Use to present a product commercial shot breakdown in a single image — pitch decks, creative presentations, client approvals.

<!-- Source concept: 9-panel television commercial storyboard grid with numbered frames -->

```
A storyboard for a creative pitch deck: the shot breakdown of a {duration}-second {product_name}
television commercial, laid out as a 3x3 grid on a white canvas with thin #CCCCCC divider lines
2px wide. Each cell is one camera setup, and the nine shots run in order: a wide establishing shot
of {setting} in warm natural light, product not yet visible; a medium shot as {protagonist} notices
the product on {surface}; a close-up of a hand reaching for {product_name} at shallow depth of
field; an extreme close-up on the texture of {product_material} with the label readable; a medium
shot of {protagonist} opening and using the product with a genuine expression; a close-up reaction
on the face, {emotion}, under a soft key light; a wide shot of the product in {lifestyle_scene}; a
beauty shot of the product on {beauty_surface} under studio lighting; and a pack shot of the
product centered on white with "{tagline}" set below it in thin sans-serif, #333333. {protagonist}
keeps the same face and identity across every panel. Panels one through seven share a single
lighting temperature as one continuous narrative, while panels eight and nine switch to distinct
studio lighting. The cells carry no panel numbers and no captions.
```

**Key levers:** `{product_name}`, `{protagonist}` (woman in her 30s, young couple, family), `{setting}` (bright kitchen, outdoor terrace, urban cafe), `{emotion}` (satisfied, surprised, relaxed), `{beauty_surface}` (white marble, gradient gray), `{tagline}`, `{duration}` (15, 30)

**Best fit for this pattern:** `bytedance-seed/seedream-5-0-lite` — Seedream improved typography and dense text specifically, which is what the grid and the panel-9 tagline need

**Args:** `aspect_ratio: '1:1'` · ~\$0.035

---

## Floating Ingredient Freeze-Frame

Use for food, beverage, or supplement products where suspended ingredients communicate freshness, flavor, or composition.

<!-- Source concept: frozen-motion ingredient explosion around product, high-speed photography aesthetic -->

```
A beverage product poster caught as a high-speed flash freeze-frame. A {product_name} container
stands at the center of a clean studio, tilted {tilt_angle} degrees, with {liquid_type} arcing
mid-pour out of its opening, the splash holding a clean curve with visible viscosity. Around the
product, {max_ingredients} pieces of {ingredient_list} hang frozen in mid-air in a loose orbital
pattern, each sharply focused and showing {texture_details}, micro water droplets suspended
alongside them. A single hard flash from behind rims the ingredients; a soft fill from the front
opens the shadows. The backdrop is a {background_gradient} gradient, clean all the way to the
edges with no stray splashes reaching them. Everything is frozen sharp — no motion blur, no added
glow. The product label faces camera and stays fully legible, with the floating ingredients kept
clear of it.
```

**Key levers:** `{product_name}`, `{background_gradient}` (#F5F0EB to #FFFFFF for light, #1A0A2E to #0D0D0D for dark), `{liquid_type}` (amber juice, white milk, green smoothie), `{ingredient_list}` (sliced strawberries + mint leaves + ice cubes, cocoa nibs + hazelnuts + vanilla pod), `{texture_details}` (visible seeds on strawberry cross-section, frost crystals on ice), `{tilt_angle}` (15, 25), `{max_ingredients}` (6-8)

**Best fit for this pattern:** `bytedance-seed/seedream-5-0-lite` — the shot lives or dies on ingredient count, orbital placement, and an unobstructed label, all prompt-adherence work

**Args:** `aspect_ratio: '4:5'` · ~\$0.035

---

## Inflatable Surrealism Product Poster

Use for disruptive, scroll-stopping social ads where the product packaging appears squeezed, inflated, or physically distorted as if made of soft rubber or vinyl.

<!-- Source concept: inflatable surrealism — product packaging rendered as squeezed/puffy/distorted soft objects -->

```
A disruptive social media ad poster. {product_name} packaging is reimagined as a puffy inflatable
vinyl object — the shape still recognizable, but squeezed at the middle as if gripped by an
invisible hand. Seams run where the vinyl panels meet, a small brass air valve sits at the bottom
edge, and subtle wrinkles gather where the vinyl compresses. The surface is slightly reflective
like a pool float and picks up a reflection of the environment. {product_color_scheme} is preserved
on the inflated surface but stretched and warped around the curves; the brand name distorts with
the inflation and stays readable. Two or three {companion_objects} sit nearby, inflated in the same
vinyl style. Flat {background_color} background with nothing else on it, soft even studio lighting
with no hard shadows, camera raised 15 degrees above eye level, a soft diffused shadow beneath the
object. The vinyl reads as a physical object photographed in a studio, not a digital 3D render. The
product stays identifiable despite the distortion, the only lettering is what already exists on the
packaging, and the frame holds nothing else — no liquid, no particles, no people.
```

**Key levers:** `{product_name}`, `{background_color}` (bubblegum pink #FFB6C1, electric blue #007BFF, acid yellow #E8FF00), `{product_color_scheme}`, `{companion_objects}` (matching accessories, ingredient items, brand mascot elements)

**Best fit for this pattern:** `bytedance-seed/seedream-5-0-lite` — one object on a flat background is not a physics-hard scene; the distortion holds together on prompt adherence alone

**Args:** `aspect_ratio: '4:5'` · ~\$0.035
