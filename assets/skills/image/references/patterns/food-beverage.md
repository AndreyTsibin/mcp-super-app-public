# Food & Beverage Patterns

Reusable prompt templates for food photography, beverage campaigns, and culinary illustration. Each pattern uses `{variables}` for customization.

**Which model?** Step 1 of SKILL.md decides that, not this file: production frames
(landing, client site, anything shipped) go to `google/gemini-3.1-flash-image` with
`resolution:'2K'`; drafts and experiments go to the default `openai/gpt-5.4-image-2`.
The "Best fit for this pattern" line under each pattern below says which model holds *this
particular layout* best — read it as a tie-breaker inside your category, and as a reason to
override step 1 only when the pattern's own demand (exact object counts, dense on-image text,
a consistent set of n frames) is the whole point of the frame. Seedream leads on those, and
that is a deliberate trade of skin texture for instruction-following.

Write prompts as flowing prose: subject and action first, then environment, then style, color, light and composition. Do not use comma-separated tag lists or labeled slots (`Scene:` / `Subject:` / …) — every model here treats them as an anti-pattern. Text that must appear in the image goes in "double quotes". Sizing: pass `aspect_ratio`; `size` is seedream-only and only for print work (see SKILL.md step 2).

---

## Luxury Chocolate Brand Campaign

Use for premium chocolate or confectionery brand visuals — moody, textural, with controlled color and atmosphere. Adaptable across mood variants (dark indulgence, bright artisan, earthy origin-story).

<!-- Source concept: luxury chocolate brand campaign with variant moods and tactile surfaces -->

```
{product_count} pieces of {chocolate_type} arranged in a {arrangement_style} on a {surface_material} surface, one piece caught mid-break with a clean fracture line whose snap edge reveals {interior_texture}. Fine cocoa powder lies across the surface as if sifted, concentrated near the chocolate and fading out to clean edges. {garnish_elements} placed deliberately, as art direction rather than garnish. The chocolate surface shows {surface_quality}, firm and cool with no softening at the edges. {lighting_mood} lighting — {light_description} — with a thin atmospheric haze along the background edge. Color restricted to {palette}. Camera at {camera_angle}, shallow depth of field, sharpest focus on the broken piece. The frame holds only the chocolate, the cocoa dust and the {garnish_elements}: no hands, no utensils, no wrappers, no packaging, no text.

Mood variant — {mood_name}: {mood_modifier}
```

**Key levers:**
- `{surface_material}` — dark slate, raw walnut wood, black marble, crumpled kraft paper
- `{lighting_mood}` — dramatic chiaroscuro / soft diffused warmth / cold window light
- `{light_description}` — single hard key from upper left / wrap-around softbox / backlit through parchment
- `{palette}` — deep browns #3E2723 + gold #C9A84C + black / warm terracotta #A0522D + cream #FFF8E7 / emerald #2D6A4F + copper #B87333
- `{chocolate_type}` — single-origin dark 72%, white chocolate with matcha veins, ruby chocolate
- `{interior_texture}` — smooth ganache center, crunchy praline layers, salted caramel pocket
- `{garnish_elements}` — single vanilla pod, fleur de sel crystals, edible gold leaf fragments, dried raspberry
- `{arrangement_style}` — diagonal cascade, tight cluster with negative space right, single row
- `{surface_quality}` — high-gloss temper shine, matte velvet bloom, hand-scraped ridges
- `{camera_angle}` — low three-quarter, straight-on eye-level, steep overhead
- `{mood_name} / {mood_modifier}` — "Dark Indulgence": push contrast, deepen shadows, add smoke wisp / "Bright Artisan": overcast daylight, lifted blacks, pastel accent / "Origin Story": raw earth tones, burlap texture, raw cacao beans nearby

**Best fit for this pattern:** `google/gemini-3.1-flash-image` — the pattern lives on micro-texture (fracture grain, sifted cocoa dust, temper shine); flash resolves it up close where seedream goes slightly waxy.
**Args:** `model: 'google/gemini-3.1-flash-image'`, `aspect_ratio: '4:3'`, `resolution: '2K'` (\$0.101/frame, 4.2 MP)

---

## High-Fashion Beverage Campaign Board

Use for premium beverage brand campaigns that combine lifestyle and product in a structured board layout — model shot + hero product + product lineup.

<!-- Source concept: fashion-meets-beverage campaign board with model, hero product, and lineup -->

```
A {beverage_brand} campaign board laid out as a horizontal triptych on one canvas: a left panel at 45% of the width, a center panel at 30%, a right panel at 25%, separated by 2px {divider_color} dividers, the whole board unified under a {color_temperature} color temperature.

The left panel is lifestyle. {model_description} at {location}, holding {product_name} at {hold_position}, {model_action}, shot with a {film_aesthetic}. The environment carries the brand story and the model's attention stays on the moment, not on the product.

The center panel is the hero. The {product_name} container sits on a {product_surface} at a {product_angle} angle, lit by a single key with {highlight_style}, condensation beaded physically on the surface, label sharp and legible.

The right panel is the lineup. {lineup_count} variants stand in a {lineup_arrangement}, lit exactly as the center panel but framed wider, each label told apart by color ({variant_colors}).

The label stays consistent and legible across all three panels, every object rests on a surface, and no typography appears anywhere in the image.
```

**Key levers:** `{product_name}`, `{beverage_brand}`, `{model_description}`, `{location}` (sunlit rooftop bar, marble kitchen counter, poolside), `{hold_position}` (mid-sip, resting at hip, gesturing with it), `{model_action}` (laughing mid-conversation, looking off-frame, walking), `{film_aesthetic}` (warm Kodak Portra feel, clean digital, cold editorial), `{product_angle}` (three-quarter front, straight-on, slight low angle), `{product_surface}` (wet dark stone, frosted glass shelf, white marble), `{highlight_style}` (long specular strip down the bottle, soft wrapped falloff, hard rim edge), `{lineup_count}` (3-5), `{lineup_arrangement}` (even row, shallow arc, staggered depth), `{variant_colors}` (amber/ruby/gold, mint/lemon/berry), `{divider_color}` (#FFFFFF, #1A1A1A), `{color_temperature}` (warm 3200K feel, neutral daylight, cool editorial)

**Best fit for this pattern:** `bytedance-seed/seedream-5-0-lite` — a three-panel layout with fixed proportions and a repeated legible label is pure instruction-following, which is where seedream is strongest.
**Args:** `model: 'bytedance-seed/seedream-5-0-lite'`, `aspect_ratio: '16:9'` (\$0.035/frame)

---

## Hyper-Realistic Food Poster Template

Use for hero food posters — restaurants, delivery apps, menu boards — where the food is the entire composition with fillable content slots.

<!-- Source concept: hyper-realistic food poster with controlled composition slots -->

```
{dish_name}, {dish_description}, plated on {plate_description} and centered in frame. {plating_details}. {steam_detail}. {garnish_detail} sits at {garnish_position}. The plate rests on {table_surface} whose texture runs out to the frame edges, with {prop_list} arranged {prop_arrangement} around it and left untouched. Shot {camera_angle} with {lens_feel}. {food_lighting}, highlights landing on {highlight_targets}. Background is {background_treatment} with {atmosphere_effect}, overall tone {color_tone}. The food reads freshly cooked and warm, its colors saturated and appetizing under a warm cast, and the {plate_description} stays quiet enough that the dish holds the frame alone.
```

**Key levers:**
- `{dish_name}` / `{dish_description}` — the hero food item described in appetizing physical detail
- `{plate_description}` — matte white ceramic, dark stoneware, rustic wooden board, banana leaf
- `{plating_details}` — sauce swoosh from 2 o'clock, microgreens at 10 o'clock, sesame seed scatter
- `{steam_detail}` — steam wisps rising from the center, condensation on a glass nearby, no steam at all
- `{garnish_detail}` / `{garnish_position}` — single basil sprig, chili flake scatter, citrus zest curls / rim at 4 o'clock, crowning the center
- `{table_surface}` — aged oak, dark concrete, white marble with gray veins
- `{prop_list}` / `{prop_arrangement}` — linen napkin, vintage fork, small bowl of sauce, scattered herbs / loose diagonal, pushed to one edge
- `{food_lighting}` — warm directional from upper-left with fill bounce, harsh noon daylight, moody side light
- `{highlight_targets}` — the sauce sheen, the crust ridges, the glass rim
- `{background_treatment}` / `{atmosphere_effect}` / `{color_tone}` — dark vignette, clean bright, rustic blur / faint kitchen haze, clean air / warm amber, neutral, high-contrast
- `{camera_angle}` — 45-degree three-quarter, straight-on eye-level, overhead flat-lay
- `{lens_feel}` — shallow depth of field, deep focus front to back, tight macro on the plating

**Best fit for this pattern:** `bytedance-seed/seedream-5-0-lite` — many filled slots resolved into one composition; seedream follows them and costs the least per pixel. Switch to `google/gemini-3.1-flash-image` at `resolution: '2K'` (\$0.101/frame) when `{lens_feel}` is a tight macro and crust or steam texture is the point — that buys texture, not pixels.
**Args:** `model: 'bytedance-seed/seedream-5-0-lite'`, `aspect_ratio: '3:4'` (\$0.035/frame)

---

## Naturalist Food Specimen Cross-Section

Use for educational food content, ingredient features, or artisanal brand storytelling — the food item rendered as a scientific illustration in the style of 19th-century naturalist prints.

<!-- Source concept: Audubon-style naturalist botanical/food specimen illustration with cross-section -->

```
A naturalist illustration of {food_item} in the style of a 19th-century scientific specimen plate. Three states of the item are stacked vertically on aged {paper_color} parchment: the whole specimen at the top, botanically accurate; a lateral cross-section at the center opening its internal structure ({internal_details}); and an exploded detail of {detail_element} at the bottom, with fine ink annotation lines running out to the key features. Drawn in {medium_description} — hatching for shadow, stippling for texture, thin ink outlines. Color is naturalistic but muted, as in a hand-tinted lithograph. A thin decorative border frames the plate, and a small italic serif label at the bottom reads "{latin_label}" in {ink_color} ink.
```

**Key levers:** `{food_item}` (pomegranate, sourdough loaf, wagyu ribeye, cacao pod), `{internal_details}` (seed chambers with ruby arils, crumb structure with irregular air pockets, marbling fat distribution), `{detail_element}` (individual seed anatomy, crust layering, fat crystal structure), `{paper_color}` (warm cream #FDF5E6, cool ivory #FFFFF0), `{medium_description}` (watercolor wash with ink line, graphite with colored pencil, pure ink with minimal color), `{latin_label}` (a playful Latinized name), `{ink_color}` (sepia #704214, India black #1A1A1A)

**Best fit for this pattern:** `bytedance-seed/seedream-5-0-lite` — a fixed three-tier layout plus a legible serif label; both are instruction-following, and seedream holds the lithograph look without extra spend.
**Args:** `model: 'bytedance-seed/seedream-5-0-lite'`, `aspect_ratio: '3:4'` (\$0.035/frame)

---

## City Food Map Illustration

Use for restaurant guides, food festival materials, travel content, or local cuisine features — a bird's-eye illustrated map showing food specialties across a city.

<!-- Source concept: hand-drawn illustrated food map of a city with dish icons and landmarks -->

```
A hand-drawn bird's-eye map of {city_name} showing its food culture, covering the {area_description}. Simplified but recognizable {landmark_list} are drawn in a loose ink-and-watercolor style. {dish_count} local dishes ({dish_list}) float at exaggerated scale near their own neighborhoods, each painted in warm appetizing watercolor with visible brushstrokes. Streets are thin ink lines, {street_style}. Water features wash in soft {water_color}. A hand-lettered banner across the top reads "{MAP_TITLE}", and small hand-written labels mark each dish and neighborhood. The palette is {palette_description}. The style sits between vintage travel poster illustration and editorial food drawing.
```

**Key levers:** `{city_name}`, `{area_description}` (central 5 km, old town quarter, waterfront district), `{landmark_list}` (main cathedral, central market, river bridges), `{dish_count}` (6-10), `{dish_list}` (plov near the bazaar, samsa near the old town, shashlik near the park), `{street_style}` (slightly wobbly freehand, clean but simplified), `{water_color}` (cerulean #0077B6, teal #2A9D8F), `{palette_description}` (warm terracotta and cream with food items in full saturated color, cool blues and greens with warm food accents), `{MAP_TITLE}` ("A Taster's Guide to {city_name}")

**Best fit for this pattern:** `bytedance-seed/seedream-5-0-lite` — many labeled elements placed at specific spots plus hand-lettered title text; that is placement accuracy, not texture.
**Args:** `model: 'bytedance-seed/seedream-5-0-lite'`, `aspect_ratio: '3:4'` (or `'1:1'`) (\$0.035/frame)
