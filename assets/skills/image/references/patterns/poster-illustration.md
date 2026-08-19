# Poster & Illustration Patterns

Reusable prompt templates for posters, art prints, campaign collages, and graphic illustrations. Each pattern uses `{variables}` for customization. Write prompts as connected prose — subject and action first, then style, color, light, composition. Never as comma-separated tags or labelled slots.

Default model: `bytedance-seed/seedream-5-0-lite` with `aspect_ratio` (`size` only when the poster goes to print — see SKILL.md step 2). Any text that must appear in the image goes in double quotes — that is the syntax the model reads as "render this literally".

---

## City Across Two Centuries (Time-Split Composition)

Use for urban development campaigns, anniversary materials, cultural exhibitions, or editorial features — a single city view divided down the middle, one half historical and one half modern.

<!-- Source concept: time-split composition — same city view, two eras side by side -->

```
A wide elevated view of {city_landmark_view}, the frame divided vertically down the center into two eras of the same place. The left half shows {historical_era}: {historical_details}, with {historical_figures} going about daily life and {historical_transport} in the street, under {historical_atmosphere}, in a muted {historical_palette} palette with period-accurate architecture. The right half shows {modern_era}: {modern_details}, {modern_figures}, {modern_transport}, contemporary buildings standing where the old ones were and a few landmarks preserved, under {modern_atmosphere} in a {modern_palette} palette. At the center the halves morph across a narrow transition zone about 5% of the frame wide: a horse-drawn cart becomes a car, a gas lamp becomes an LED fixture, cobblestones become asphalt, a sapling grows into a full tree. The sky carries the same shift, {historical_sky} on the left grading into {modern_sky} on the right. Both halves share identical terrain — the same river bend, the same hill, the same street axis — under one consistent perspective and scale, seen from roughly 30 degrees above street level. Each era holds only its own objects, with period details staying on their own side of the transition. No text.
```

**Key levers:** `{city_landmark_view}` (view down the main avenue toward the central square, riverfront panorama, view from the hill overlooking the old town), `{historical_era}` / `{modern_era}` (1920s / 2020s, medieval / present day, 1960s / 2060s), `{historical_details}` (cobblestone streets, horse-drawn carts, hand-painted shop signs), `{modern_details}` (glass facades, rooftop gardens, digital signage), `{historical_palette}` (sepia and desaturated earth tones, hand-colored photograph quality), `{modern_palette}` (clean contemporary color, cooler blue-grays with warm accent), `{historical_atmosphere}` (coal haze, soft morning fog), `{modern_atmosphere}` (clear sky, light pollution glow at horizon), `{historical_sky}` (warm overcast), `{modern_sky}` (clear gradient blue)

**Recommended model:** seedream 5.0 Lite — the split-frame rule, the shared terrain and the single perspective across both halves are all prompt-adherence problems, and seedream follows them best per dollar.
**Args:** `model: 'bytedance-seed/seedream-5-0-lite', aspect_ratio: '16:9'` → 3642×2048, \$0.035

---

## Fitness Boxing Campaign Collage

Use for sport and fitness brand campaigns — a dynamic 3-panel collage combining action, detail, and atmosphere around a boxing/combat sport theme.

<!-- Source concept: 3-panel fitness/boxing campaign collage with action and detail shots -->

```
A three-panel horizontal collage on a {canvas_color} canvas with {divider_style} dividers, held together by one {overall_tone} color tone. The left panel takes 35% of the width: a wide shot of {gym_environment} with {atmosphere_detail}, equipment visible but out of focus, and {athlete_description} as a distant figure warming up — the mood is anticipation. The center panel takes 40% and carries the collage: a medium shot of the same athlete mid-{action_type} at peak effort, {action_detail}, sweat on the skin and on {gear_description}, sharp focus on the face showing {expression}, hard directional light from {light_direction} throwing a deep shadow across the opposite cheek, a slight motion trail on the {moving_element}. The right panel takes 25%: an extreme close-up of {detail_subject}, {detail_description}, texture filling the frame under {detail_lighting}. The same athlete appears in all three panels with the same build, face, gear and wraps. Color treatment: {color_treatment}. Uniform {grain_level} grain across the whole collage, all three panels equally. Clean of text, logos and sponsor marks.
```

**Key levers:** `{athlete_description}`, `{gym_environment}` (industrial boxing gym with heavy bags, outdoor concrete training yard, dimly lit basement ring), `{atmosphere_detail}` (chalk dust in backlight, steam from breath in cold air, golden light through high windows), `{action_type}` (throwing a cross, landing a hook on a heavy bag, rope-skipping), `{action_detail}` (fist connecting with bag creating visible impact ripple, rope frozen in arc above head), `{gear_description}` (red hand wraps, worn leather gloves, no gloves — taped knuckles), `{expression}` (focused intensity, controlled exhale, battle cry), `{detail_subject}` (taped knuckles against red canvas, worn boxing boot laces, sweat dripping from chin onto canvas), `{detail_description}` (each tape fiber visible, leather cracking at flex points, individual droplets mid-fall), `{color_treatment}` (desaturated with warm midtones, high-contrast monochrome with sepia, teal-and-orange split tone), `{canvas_color}` (matte black #0D0D0D, dark charcoal #1A1A1A), `{divider_style}` (thin white 2px, no dividers — edge bleed)

**Recommended model:** seedream 5.0 Lite — identity has to hold across three panels and the panel widths are an explicit instruction; both are prompt adherence.
**Args:** `model: 'bytedance-seed/seedream-5-0-lite', aspect_ratio: '16:9'` → 3642×2048, \$0.035

---

## Lavender Smartphone Hero Ad

Use for tech product launch visuals — clean, color-dominant hero shots where a smartphone (or similar device) floats against a monochromatic gradient with soft 3D accent elements.

<!-- Source concept: smartphone product launch hero in monochromatic lavender with floating accent shapes -->

```
{device_name} floats at a {tilt_angle}-degree tilt against a smooth gradient running from {color_light} to {color_dark}, screen facing the camera and showing {screen_content}, centered vertically and offset to the {horizontal_position} horizontally. The body renders in physically accurate {device_finish}, its edge chamfer catching a thin highlight line, proportions matching a real smartphone. The screen content stays crisp and legible at this scale, showing only the interface — the glass carries no reflection of the room. {accent_element_count} soft 3D shapes float nearby: matte {accent_shape_color} {accent_shapes} with a frosted glass surface, each around {accent_size} in size, sitting at different depths and falling out of focus to layer the composition. They stay clear of the screen. Soft omnidirectional lighting with a gentle key from the upper left, and a {shadow_softness} shadow from the device falling onto the gradient. Studio void, no props, no horizon. The whole palette stays inside the {color_family} family. Below the device, centered, the headline "{HEADLINE}" in {headline_weight} {headline_font_style}, {headline_color}, and under it "{SUBHEADLINE}" in a thin weight, {subtext_color}. Both lines read exactly as quoted. The gradient stays smooth and continuous, free of banding.
```

**Key levers:** `{device_name}`, `{color_light}` / `{color_dark}` (lavender #E6D5F5 to #7B4FA0, mint #D0F0E0 to #1B7A5A, coral #FFDDD2 to #C44536), `{device_finish}` (matte aluminum, polished titanium, frosted glass back), `{screen_content}` (a clean home screen with app icons, a camera app showing a landscape, a gradient wallpaper), `{accent_shapes}` (spheres, rounded pills, soft cubes, torus rings), `{accent_shape_color}` — same family as background but slightly lighter or more saturated, `{accent_size}` (golf-ball to grapefruit), `{HEADLINE}` / `{SUBHEADLINE}`, `{headline_color}` (white #FFFFFF, dark tint of the color family), `{color_family}` (lavender-purple, sage-green, warm terracotta), `{tilt_angle}` (5-15), `{horizontal_position}` (left third, center, right third)

**Recommended model:** seedream 5.0 Lite — headline, subhead and on-screen UI all have to render as readable type, which is exactly what the Seedream line is built for. Use `4:5` for a POS or social hero, `16:9` for a site header.
**Args:** `model: 'bytedance-seed/seedream-5-0-lite', aspect_ratio: '4:5'` → \$0.035

---

## Emerald Street Fashion Poster

Use for fashion drops, event announcements, or editorial magazine covers where bold typography and a street fashion figure share equal visual weight on a saturated color field.

<!-- Source concept: bold emerald fashion poster with oversized type and street style figure -->

```
A graphic poster on a flat solid {background_color} field, one even color with no gradient, texture or pattern. "{MAIN_TITLE}" fills the upper half in extra-bold extended {title_font_style}, {title_color}, each letter about 20% of the frame height. {model_description} stands in {outfit_description}, full body, shot from roughly 15 degrees below eye level, {pose_description}, filling the lower 60% and rising into the type zone so the head and shoulders pass in front of the bottom row of letters. The overlap touches at most one letter and leaves it more than half visible, so every word of the title reads cleanly. "{SUBTITLE}" runs in lightweight condensed type, {subtitle_color}, along the bottom edge. Flat overcast light on the figure, even exposure, minimal shadow, fabric texture fully readable — {fabric_details}. Shoes visible and planted on the ground. Hands empty. {graphic_accents}. Both lines of type spelled exactly as quoted.
```

**Key levers:** `{background_color}` (emerald #006B3F, cobalt #0047AB, saffron #F4C430, hot pink #FF1493), `{model_description}`, `{outfit_description}` (oversized leather trench + chunky sneakers, cropped bomber + wide-leg trousers + platform boots), `{pose_description}` (wide stance with arms crossed, one hand adjusting collar, walking stride caught mid-step), `{MAIN_TITLE}` / `{SUBTITLE}`, `{title_font_style}` (geometric sans-serif, grotesque, stencil cut), `{title_color}` (#FFFFFF, #000000, cream #FFF5E1), `{subtitle_color}` (same as title but at 60% opacity), `{fabric_details}` (visible grain in leather, corduroy ridges, denim selvedge edge), `{graphic_accents}` (none, thin white border 20px from edge, small logo mark at bottom-left)

**Recommended model:** seedream 5.0 Lite — oversized type is the whole poster, and Seedream handles typography and figure-over-letter layering best per dollar.
**Args:** `model: 'bytedance-seed/seedream-5-0-lite', aspect_ratio: '2:3'` → \$0.035

**Go gemini flash for extreme ratios only** — it is the only model that will take `4:1` or `8:1`, so a banner-strip version of this poster has to run there. That is the whole reason to leave seedream on this pattern; for the poster itself seedream gives more pixels for less.
**Args:** `model: 'google/gemini-3.1-flash-image', aspect_ratio: '4:1', resolution: '2K'` → \$0.101

---

## Peacock Botanical Vintage Art Print

Use for decorative prints, packaging illustration, wallpaper design, or editorial art — a symmetrical composition combining a peacock with botanical elements in a vintage printmaking style.

<!-- Source concept: peacock botanical vintage symmetrical art print — ornamental and decorative -->

```
A symmetrical ornamental art print centered on a {peacock_variant} peacock in full tail display, viewed from {view_angle}. The tail feathers fan into a clean semicircle filling the upper two-thirds of the frame, each eye-spot rendered in iridescent {eye_colors} with fine barb texture. The peacock stands on a {base_element} on the center axis. Flanking it symmetrically: {botanical_left} on the left mirrored by {botanical_right} on the right, leaves, stems and blossoms curving inward to frame the bird. {additional_fauna} perch or fly near the upper corners. The whole composition sits on a {background_texture} background in {background_color}. Rendered as a {print_style} with visible {technique_marks} and rich but slightly flattened color, as if laid down in separate printing passes. Border: {border_style}. Palette: {palette}. Anatomy stays true to the real bird and the plants stay true to their species.
```

**Key levers:** `{peacock_variant}` (Indian blue, white albino, green Java), `{view_angle}` (front-facing straight on, three-quarter turning left), `{eye_colors}` (deep blue #003366 and emerald #006B3F and gold #C9A84C, monochrome — all in shades of navy and silver), `{base_element}` (ornate stone pedestal, flowering branch, decorative tile floor), `{botanical_left}` / `{botanical_right}` (magnolia branches, trailing wisteria, passion flower vines, banksia stems), `{additional_fauna}` (two small butterflies, a dragonfly pair, none), `{background_texture}` / `{background_color}` (aged linen #F5F0E1, dark navy #0A1628, cream parchment #FDF5E6), `{print_style}` (hand-colored etching, woodblock print, chromolithograph), `{technique_marks}` (cross-hatching in shadows, visible plate tone, registration marks at corners), `{border_style}` (thin double-line art nouveau border, ornamental corner flourishes, simple single-line rectangle), `{palette}` (natural jewel tones — emerald, sapphire, gold on cream / limited three-color palette — teal, copper, black on ivory / muted earth tones — sage, terracotta, umber)

**Recommended model:** seedream 5.0 Lite — mirror symmetry and species accuracy are prompt-adherence work, and at 7.5 MP it is also the largest frame on offer.
**Args:** `model: 'bytedance-seed/seedream-5-0-lite', aspect_ratio: '3:4'` → \$0.035

Seedream stays the default here; the Gemini models top out at 4.2 MP on their working `2K` tier, so there is nothing to gain by switching. (If genuinely large-format print ever came up, both have a `4K` tier at 16.9 MP — print territory, not web.)
