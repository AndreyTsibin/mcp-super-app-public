# Character Design Patterns

Reusable prompt templates for character turnarounds, expression sheets, outfit variants, and collectible/card formats. Each pattern uses `{variables}` for customization.

Default model: **Seedream 5.0 Lite** (`bytedance-seed/seedream-5-0-lite`, \$0.035/frame, 3642x2048 at 16:9). Write prompts as connected prose — subject and action first, then environment, then style, colour, light and composition. Comma-separated tags and labelled slots (`Scene:`, `Subject:`, …) are an anti-pattern for this model. Pass `aspect_ratio`; `size` only for print work (see SKILL.md step 2). Text that must appear in the image goes in "double quotes".

Seedream renders a consistent character in a consistent style across multiple outputs — the vendor's own use cases are storyboarding, comic creation, set-based design, IP product design and emoji packs. Trigger a series with "a set of", "a series of", or an explicit frame count, and raise `n` (up to 10) for separate frames instead of cells on one sheet.

---

## Character Turnaround Sheet (3-View)

Use for game or animation pre-production — front, side, and back views of a character on a single white canvas with color callouts and height reference lines.

<!-- Source concept: character model sheet / turnaround sheet for 3D modelers and animators -->

```
{character_name}, {character_description}, laid out as a three-view model sheet on a clean white canvas: front view facing the camera on the left, three-quarter view turned 75 degrees to the right in the middle, back view facing away on the right. All three views are the same character in the same outfit at the same scale, standing in a neutral pose with arms relaxed at the sides and feet on a shared baseline, so the silhouette reads cleanly at every angle. Clothing folds and seam lines carry across all three angles unchanged. Thin #CCCCCC horizontal reference lines run the full width of the sheet at head, shoulder, waist, knee and foot level, and each view aligns to them. Beside the front view sit colour callouts — small filled circles for {color_1} {hex_1}, {color_2} {hex_2} and {color_3} {hex_3}, each joined to the material it describes by a thin #999999 leader line. Flat even lighting, empty white background behind the figure, hands empty, no cast shadows and no drop shadows. Fine consistent line weight throughout.
```

**Key levers:** `{character_name}`, `{character_description}` (age, build, hairstyle, outfit — be specific), `{color_1}`/`{hex_1}` through `{color_3}`/`{hex_3}` (key palette colors for callouts, e.g. jacket navy #1B2A4A, skin warm beige #D4A574, hair auburn #8B3A2F)

**Recommended model:** Seedream 5.0 Lite — best prompt adherence of the set, which is what holds the three views to identical proportions and keeps the callout leader lines attached to the right material.

**Args:** `model: 'bytedance-seed/seedream-5-0-lite'`, `aspect_ratio: '16:9'`

---

## Expression Sheet

Use to produce a grid of 6–9 facial expressions for the same character — consistent head angle and art style, with emotion labels under each face.

<!-- Source concept: character expression/emotion reference sheet for animation or visual novel production -->

```
An expression sheet for {character_name}, {character_description}: a set of six head-and-shoulders portraits in a 3x2 grid on a white background, cells separated by thin #DDDDDD divider lines. Every cell holds the same character at the same three-quarter left head angle under the same lighting, rendered in identical {art_style} — same skin tone, same line weight, same shading — with hair, accessories and clothing unchanged from cell to cell, so the expression is the only thing that changes. Top left, neutral: relaxed brow, closed mouth, calm eyes, labelled "NEUTRAL". Top centre, happy: a genuine smile that reaches the eyes, cheeks raised, labelled "HAPPY". Top right, angry: furrowed brow, clenched jaw, narrowed eyes, labelled "ANGRY". Bottom left, sad: downturned mouth, glistening eyes, head lowered slightly, labelled "SAD". Bottom centre, surprised: wide eyes, eyebrows raised, mouth open, labelled "SURPRISED". Bottom right, disgusted: nose wrinkled, upper lip raised, eyes squinted, labelled "DISGUSTED". {extra_expressions} Each label sits centred beneath its cell in small {label_font}, #555555, crisp and legible. Hands stay out of frame.
```

**Key levers:** `{character_name}`, `{character_description}` (face shape, skin tone, hair, distinguishing marks), `{art_style}` (clean cel-shaded anime, painterly semi-realism, flat vector illustration), `{label_font}` (condensed sans-serif, monospace, rounded sans), `{extra_expressions}` (extend to a 3x3 grid of nine: e.g. "Bottom row continues with smirk: one corner of the mouth raised, knowing look, labelled 'SMIRK'.")

**Recommended model:** Seedream 5.0 Lite — holds one face identity across nine cells and renders the quoted labels. For a nine-expression sheet, switching to `n: 9` separate portraits and assembling the grid yourself gives cleaner faces than nine cells crammed into one canvas.

**Args:** `model: 'bytedance-seed/seedream-5-0-lite'`, `aspect_ratio: '3:2'` (single sheet) or `aspect_ratio: '1:1'`, `n: 9` (separate portraits)

**When skin matters more than the grid:** for a small number of photoreal portraits, `google/gemini-3.1-flash-image` with `resolution: '2K'` (4.2 MP, \$0.101/frame) renders finer skin texture. Note it hands back fewer pixels than seedream's 7.5 MP — the trade is texture, not size. Use it per portrait, not for the assembled sheet.

---

## Outfit Variant Grid

Use to show one character in multiple outfits or costumes — for fashion exploration, game skin concepts, or wardrobe design.

<!-- Source concept: character costume/skin variant sheet for fashion or game design -->

```
A set of six outfit variants of {character_name}, {character_description}, arranged in a {grid_layout} grid on a light {bg_color} background with thin white gaps between cells and soft even front lighting in every cell. The character holds the same pose in all six — {pose_description} — with the same build, face, hairstyle and skin tone throughout, so only the clothing and accessories change. First cell, {outfit_1_name}: {outfit_1_description}. Second, {outfit_2_name}: {outfit_2_description}. Third, {outfit_3_name}: {outfit_3_description}. Fourth, {outfit_4_name}: {outfit_4_description}. Fifth, {outfit_5_name}: {outfit_5_description}. Sixth, {outfit_6_name}: {outfit_6_description}. Each outfit name sits centred below its cell in small bold sans-serif, #333333, readable at a glance. Each cell contains the figure alone against the flat background, garments stay inside their own cell, and the grid keeps uniform cell size and spacing.
```

**Key levers:** `{character_name}`, `{character_description}` (build, face, hair — anchor identity), `{bg_color}` (#F0F0F0 light gray, #FFF8F0 warm cream, #E8EDF2 cool blue-gray), `{grid_layout}` (2x3 or 3x3), `{pose_description}` (hands on hips, relaxed standing, one hand raised), `{outfit_N_name}` / `{outfit_N_description}` (e.g. "Street Casual" — oversized denim jacket, white tee, black cargo pants, chunky sneakers)

**Recommended model:** Seedream 5.0 Lite — character consistency across a set is exactly the vendor's set-based design case, and it is the cheapest per pixel.

**Args:** `model: 'bytedance-seed/seedream-5-0-lite'`, `aspect_ratio: '3:2'` (single sheet) or `aspect_ratio: '2:3'`, `n: 6` (one full-body frame per outfit, labels dropped)

---

## Chibi / Mini-Me Collectible

Use to transform a realistic character into a cute 3D collectible figurine — oversized head, compact body, multiple poses performing different activities.

<!-- Source concept: chibi/super-deformed vinyl collectible figurine with consistent identity across poses -->

```
A row of {num_poses} chibi-style 3D vinyl collectible figurines of {character_name}, {character_description_simplified}, each in a different pose, left to right: {pose_1_description}, then {pose_2_description}, then {pose_3_description}. {extra_poses} Every figurine keeps the same chibi build — head roughly half the total height, rounded limbs, smooth matte vinyl surface with a visible seam line down each side and a soft glossy highlight on the forehead and cheeks — and the same face, which carries {face_markers} through from the original character, simplified into large round eyes with a small nose and mouth. The outfit matches the original, {outfit_simplified}, with its colours preserved ({color_palette}) and its details reduced to clean shapes; it is identical on every figurine. Each stands on a small circular base in matte {base_color}, unlabelled. Soft {bg_gradient} background, studio product lighting with a rim light from behind and soft fill from the front, a subtle contact shadow under each base. Smoothly rendered matte vinyl throughout, chibi proportions on every figurine.
```

**Key levers:** `{character_name}`, `{character_description_simplified}` (key outfit and hair only), `{face_markers}` (e.g. round glasses, scar on left cheek, green eyes), `{color_palette}` (hex values for 2-3 dominant colors), `{bg_gradient}` (#F5F0EB to #FFFFFF warm, #E0E8F0 to #FFFFFF cool), `{num_poses}` (3-5), `{pose_N_description}` (e.g. sitting cross-legged reading a book, waving with both hands, holding a coffee cup), `{base_color}` (white, black, matching character's main color)

**Recommended model:** Seedream 5.0 Lite — the row of figurines is a product-design set, which is what its multi-output consistency is built for.

**Args:** `model: 'bytedance-seed/seedream-5-0-lite'`, `aspect_ratio: '16:9'` (whole row) or `aspect_ratio: '1:1'`, `n: {num_poses}` (one figurine per frame, for avatar sets)

**For marketing-ready close-ups:** `google/gemini-3.1-flash-image` with `resolution: '2K'` (4.2 MP, \$0.101/frame) resolves the vinyl highlights and seam lines more finely than seedream, at the cost of overall frame size. One figurine per frame — describe it as a single product shot on the same background.

---

## Anime-Style Character Card

Use for a full character reference card with portrait, full body, key items, and color palette — organized on a white background in a professional concept art layout.

<!-- Source concept: anime/game character reference sheet with stats, items, and palette swatches -->

```
An anime-style character reference card for {character_name}, {character_description}, laid out on a white background and divided into sections by thin #CCCCCC separator lines. The left section, about 40% of the width, holds a full-body standing pose facing front, arms held slightly away from the body so the whole outfit reads, feet visible, expression confident and neutral. The upper-right section holds a portrait bust at a three-quarter angle with the face rendered in detail, showing {face_details}. Below it, {num_items} key items sit in a row — {item_1}, {item_2}, {item_3} — drawn at a consistent scale with a thin outline, each labelled in small text underneath, and each matching what the character wears or carries in the full-body view. The lower-right section holds a horizontal palette strip of {num_swatches} rectangular swatches in the character's key colours ({swatch_colors}), with its hex code printed under each swatch. A bottom strip carries the stat block in clean sans-serif: "Name: {character_name} | Class: {class} | Height: {height} | Affiliation: {affiliation}". Clean line art with flat cel shading, one line weight and one shading style across every section, the same character design in the portrait and the full body, plain edges with no decorative frame. All text crisp and legible.
```

**Key levers:** `{character_name}`, `{character_description}` (detailed: hair color/style, eye color, outfit layers, accessories), `{face_details}` (distinctive facial features — e.g. heterochromia, facial tattoo, sharp jawline), `{item_1}`/`{item_2}`/`{item_3}` (signature weapon, accessory, artifact), `{swatch_colors}` (e.g. midnight blue #191970, cherry red #C41E3A, silver #C0C0C0, warm skin #E8B89D), `{num_swatches}` (4-6), `{class}` / `{height}` / `{affiliation}` (stat block fields)

**Recommended model:** Seedream 5.0 Lite — the densest text of any pattern here (item labels, hex codes, stat block) plus a multi-section layout, both of which ride on prompt adherence.

**Args:** `model: 'bytedance-seed/seedream-5-0-lite'`, `aspect_ratio: '3:4'`
