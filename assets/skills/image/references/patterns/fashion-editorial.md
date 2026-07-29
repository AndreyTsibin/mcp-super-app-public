# Fashion Editorial Patterns

Reusable prompt templates for fashion campaigns, lookbooks, and editorial shoots. Each pattern uses `{variables}` for customization.

Prompts are written as connected prose — subject and action first, then environment, style, color, light, composition. Comma-separated tags and labelled slots degrade Seedream output; keep the sentences.

Default model is `bytedance-seed/seedream-4.5` (pass `aspect_ratio`, never `size`). Each pattern lists the model it actually wants and the exact `create_image` args.

---

## 3-Panel Campaign Collage

Use for fashion brand campaign hero images, lookbook covers, and social carousel heroes — one wide shot combining hero pose, close-up detail, and movement in a triptych.

<!-- Source concept: fashion campaign triptych collage — hero + detail + movement panels -->

```
{model_description} wearing {outfit_description} appears three times across one wide canvas divided into a triptych: a tall left panel taking 40% of the width, and two stacked right panels of equal height filling the remaining 60%, separated by thin 3px white dividers. In the left hero panel the subject stands full-body in a three-quarter pose against {background_1}, weight shifted onto one hip, gaze direct into the lens, medium-format film grain, {color_grade}. The top-right panel is an extreme close-up of {detail_focus} with the weave and stitching of {fabric_type} legible at thread level, shallow depth of field, warm directional light raking across the surface. The bottom-right panel is a mid-stride walking shot from a low angle against {background_2}, the fabric swinging with natural drape physics and the hair carrying the movement. The same person with identical features appears in all three panels, one {lighting_setup} carries across them, skin tone renders consistently, and the {color_temperature} temperature ties the set together as a single shoot rather than three separate photos. Skin stays matte and untouched, with no retouching glow. Clean frames: no text, no logos, no studio equipment in view.
```

**Key levers:** `{model_description}` (East Asian woman mid-20s, athletic man early 30s), `{outfit_description}`, `{detail_focus}` (collar construction, cuff button, belt buckle, shoe sole), `{fabric_type}` (raw selvedge denim, double-faced cashmere, washed silk), `{background_1}` (concrete wall, sand dune, industrial corridor), `{background_2}` (open street, field, rooftop), `{color_grade}` (lifted blacks with amber cast, desaturated teal), `{color_temperature}` (warm 4000K feel, cool overcast daylight)

**Recommended model:** `bytedance-seed/seedream-4.5` — the panel geometry and the "same person three times" requirement are prompt-following problems, and Seedream follows layout instructions best per dollar.

**Args:** `model: 'bytedance-seed/seedream-4.5'`, `aspect_ratio: '16:9'` (3642×2048, \$0.040)

---

## 2x2 Editorial Portrait Grid

Use for model tests, casting cards, comp cards, and editorial portfolio spreads — four angles of the same person in a clean grid.

<!-- Source concept: 2x2 fashion portrait grid — same model, four setups -->

```
A 2x2 grid on a white canvas holds four frames of {model_description} in the same {outfit_description}, separated by thin 2px {divider_color} dividers. Every cell uses the same {background_type}, varied only by camera angle. Top-left is a straight-on headshot, neutral expression, eyes to the lens, even butterfly lighting. Top-right is a three-quarter profile, chin slightly lifted, a single key light from camera-left cutting a defined cheekbone shadow. Bottom-left is a full profile, a rim light from behind tracing the jaw and nose, the {background_type} dropping darker. Bottom-right is a candid beat — mid-laugh, or adjusting {accessory} — natural movement under softer light. All four frames carry {film_stock} color science, {skin_tone_handling}, and shallow depth of field. Skin renders at full texture: visible pores, fine hairs, natural unevenness, no smoothing. The same person appears in every frame with identical bone structure, skin and hair, and the same makeup throughout. The four backgrounds read as one session. No text, no watermarks.
```

**Key levers:** `{model_description}`, `{outfit_description}` (black turtleneck, white linen shirt unbuttoned at collar), `{background_type}` (seamless medium gray, textured plaster wall, out-of-focus greenery), `{divider_color}` (#FFFFFF, #E0E0E0), `{film_stock}` (Kodak Portra 400, Fujifilm Pro 400H), `{skin_tone_handling}` (warm undertones preserved, cool-neutral rendering), `{accessory}` (earring, collar, watch)

**Recommended model:** `google/gemini-3.1-flash-image` — this pattern lives or dies on skin. Flash renders pores and fine hairs; Seedream smooths them into a render-like finish.

**Args:** `model: 'google/gemini-3.1-flash-image'`, `aspect_ratio: '1:1'`, `resolution: '2K'` (\$0.101/frame, 4.2 MP)

---

## Streetwear Poster with Oversized Typography

Use for streetwear drops, limited edition launches, and urban fashion campaigns where bold type dominates the composition.

<!-- Source concept: streetwear poster with model integrated into oversized typographic layout -->

```
{model_description} in {streetwear_outfit} holds a {pose_description} against a flat {background_color} field, placed {model_position} and threaded through the typography. The headline "{HEADLINE_TEXT}" runs across the upper two thirds of the frame in extra-bold condensed {font_style}, {text_color}, and the body passes in front of some letters and behind others so the type and the model share the same space. Secondary text "{SUBHEAD_TEXT}" sits near the bottom edge in a thin weight, {subhead_color}. {lighting_type} on the model produces {shadow_quality} shadows. {grain_intensity} covers the whole image. The model lands on a {grid_position} thirds intersection while the typography holds about 60% of the visual space. Every letter stays fully readable where the body crosses it, with no single letter covered by more than a third. "{HEADLINE_TEXT}" is spelled exactly as written. Only type and model in frame: no watermark, no ornament, no extra text.
```

**Key levers:** `{HEADLINE_TEXT}` (brand name, drop name), `{SUBHEAD_TEXT}` (date, "LIMITED DROP", collection name), `{background_color}` (off-white #F5F1EB, concrete gray #8C8C8C, matte black #0D0D0D), `{text_color}` (#000000, #FF3333, #FFFFFF), `{font_style}` (sans-serif like Druk Wide, slab-serif, stencil), `{streetwear_outfit}`, `{model_position}` (center-left, right third), `{lighting_type}` (harsh direct flash, soft window light), `{grain_intensity}` (subtle film grain, heavy 35mm grain)

**Recommended model:** `bytedance-seed/seedream-4.5` — text rendering and the front/behind depth interplay are instruction-following, which is Seedream's strength. Quoted text is its documented syntax for on-image copy.

**Args:** `model: 'bytedance-seed/seedream-4.5'`, `aspect_ratio: '2:3'` (\$0.040)

---

## Retro Roller Skating Sportswear Campaign

Use for playful, nostalgic sportswear or athleisure campaigns with 70s-80s visual language.

<!-- Source concept: retro roller skating / sportswear campaign with analog film aesthetic -->

```
A sun-drenched wide shot of {model_description} roller skating along a {location_description}. They wear {outfit_description}, the fabric catching light as they move, one leg extended mid-glide, arms relaxed and swinging naturally. The ground is smooth asphalt with painted lane markings in faded {lane_color}, scuffed and patched from use. Background shows {background_elements} slightly out of focus through heat haze. Shot on {film_stock} with pronounced grain and slightly lifted shadows. The palette centers on {palette_description}. Golden hour backlight wraps a warm halo around the subject and throws a long shadow toward the camera. Genuine movement energy: hair and loose fabric respond to speed.
```

**Key levers:** `{model_description}`, `{outfit_description}` (high-waisted terry shorts in coral, cropped zip-up in cream, tube socks with racing stripes), `{location_description}` (Venice Beach boardwalk, empty suburban tennis court, coastal promenade), `{film_stock}` (Kodak Gold 200, Fuji Superia 400), `{palette_description}` (terracotta #CC5533, cream #FFF5E1, sky blue #87CEEB, mustard #D4A017), `{lane_color}` (faded yellow, sun-bleached white), `{background_elements}` (palm trees and pastel buildings, chain-link fence and bleachers), `{aspect_ratio}` (3:2, 16:9 — passed as an arg, not written into the prompt)

**Recommended model:** `bytedance-seed/seedream-4.5` — the default; strong prompt adherence and realistic environments. \$0.04, up to 7.5MP.

**Args:** `model: 'bytedance-seed/seedream-4.5'`, `aspect_ratio: '16:9'` (\$0.040)

---

## Futuristic Sportswear Editorial with 3D Blob Shapes

Use for forward-looking athletic or techwear editorials where abstract 3D forms build a surreal spatial environment around the model.

<!-- Source concept: futuristic sportswear editorial with organic 3D blob/sphere shapes -->

```
{model_description} holds a {pose_detail} at the center of a {studio_environment} studio space with a matte {floor_color} floor running to infinity, wearing {techwear_outfit} with {fabric_detail} visible in the construction. Three to five organic 3D blobs in {blob_color} float around the subject at varying heights, ranging from basketball-sized to armchair-sized, each a smooth amoebic form with a glossy surface, environment reflections and a single specular highlight. They cast soft colored shadows onto the floor and across the model's clothing, and they keep their distance — none touches or intersects the body. One blob sits partially behind the model, one in front, building spatial depth. Cool directional light from camera-right defines muscle and fabric contour; ambient fill arrives from no visible source. The palette stays limited to {palette}. The blobs read as physically present objects sharing the room rather than pasted-in graphics, and the model remains the clear focal point. Clinical, aspirational mood, everything sharp with no motion blur. No text, no logos, no props.
```

**Key levers:** `{studio_environment}` (white void, concrete gray, deep navy), `{floor_color}` (light gray #D0D0D0, charcoal #333333), `{blob_color}` (chrome silver, translucent jade #00A86B, matte coral #FF6B6B), `{techwear_outfit}` (bonded seam track pants + compression top, oversized windbreaker + utility shorts), `{pose_detail}` (low lunge position, standing with one arm extended checking a wrist device, mid-jump), `{fabric_detail}` (visible bonded seams, reflective piping, mesh ventilation panels), `{palette}` (monochrome + single accent, earth tones + neon green #39FF14)

**Recommended model:** `bytedance-seed/seedream-4.5` — the studio is deliberately clean, so Seedream's smooth render finish is an asset here, and blob placement plus shadow direction are prompt-following work. Only escalate to `google/gemini-3-pro-image` if the pattern is pushed toward heavy fabric physics (a full windbreaker mid-jump, a flowing layer wrapping a blob); Pro costs roughly 6x Seedream per pixel and is not a general quality upgrade.

**Args:** `model: 'bytedance-seed/seedream-4.5'`, `aspect_ratio: '4:5'` (\$0.040)
