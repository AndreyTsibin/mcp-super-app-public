# Portrait & Cinema Patterns

Reusable prompt templates for cinematic portraits, atmospheric character photography, and mood-driven portraiture. Each pattern uses `{variables}` for customisation and carries the model plus the exact `create_image` arguments to pass with it.

Default is **Seedream 5.0 Lite**, written as coherent prose — subject + action + environment first, then style, colour, light and composition. Never labelled slots or comma-separated tags: ByteDance names tag soup as the anti-pattern. Sizing rules live in SKILL.md step 2.

---

## Golden Hour Street Backlit Portrait

Use for warm, emotive street portraits with strong backlight flare — editorial, personal branding, album covers.

<!-- Source concept: golden hour backlit street portrait with lens flare and warm atmospheric haze -->

```
An editorial portrait photograph of {person_description} standing at {position_in_street} in {street_description} at golden hour, body angled three-quarter to camera, face turned toward the lens with {expression}. The sun sits directly behind them, 5-10 degrees above the horizon line, flooding the street with warm amber light through a slight atmospheric haze that diffuses the backlight. A strong rim light traces their hair and shoulders in warm gold (#FFAA33), while the face is lit by softer, cooler bounce light coming off {bounce_surface} on the opposite side — the face stays clearly visible and well exposed, never a silhouette. {clothing_detail} catches the backlight along its edge and shows the texture of the fabric. A long shadow runs from their feet toward the camera across {ground_surface}. Shallow depth of field renders the background into warm bokeh circles. One or two hexagonal flare artifacts sit near the frame edge — organic and restrained, not a starburst. Skin keeps its natural texture and warm undertones, with visible pores and no smoothing. Colour grade: {color_grade}. Available light only, with no reflectors or studio equipment anywhere in frame. No text, no vignette.
```

**Key levers:** `{street_description}` (narrow European alley with stone walls, wide boulevard with linden trees, industrial backstreet with brick), `{person_description}`, `{expression}` (quiet confidence, mid-smile with closed lips, contemplative gaze), `{bounce_surface}` (cream-painted wall, parked white van, sand-colored buildings), `{clothing_detail}` (linen shirt collar, leather jacket shoulder seam, scarf edge), `{ground_surface}` (wet cobblestones, dry asphalt, packed earth), `{color_grade}` (Kodak Portra 400 warmth, slightly lifted blacks with amber cast, clean digital with warm white balance)

**Recommended model:** `bytedance-seed/seedream-5-0-lite` — the shot is carried by constraint-following (face exposed under backlight, flare held to one or two artifacts), which is seedream's strength.
**Args:** `aspect_ratio: '3:2'`

> If you crop tight to head-and-shoulders and pores become the subject, switch to `google/gemini-3.1-flash-image` with `aspect_ratio: '3:2', resolution: '2K'` (\$0.101, 4.2 MP) — seedream's skin reads slightly rendered up close. You trade pixels for texture: flash gives fewer of them than seedream's 7.5 MP, so only swap when skin is genuinely the subject.

---

## Convenience Store Neon Portrait

Use for urban night portraits with mixed artificial lighting — fluorescent overhead + colored neon signage creating a chromatic push-pull on the subject's face.

<!-- Source concept: convenience store / bodega neon portrait — fluorescent + neon mixed light on face -->

```
A night portrait of {person_description} outside a {store_type}, {pose_description} at the threshold of the entrance where the interior light and the street meet and split the lighting across their face. Overhead fluorescent tubes inside throw flat {fluorescent_color} light onto one side; a {neon_sign_description} mounted on the window casts {neon_color} onto the other. The two colours meet and mix on the nose bridge and chin, both held in check so the features read clearly and neither source blows out. Product shelves and a cooler glow softly behind, dissolved by shallow depth of field into a mosaic of coloured bokeh, with the subject sharp. {clothing_description} takes the two lights differently, absorbing one and bouncing the other. The window glass carries a little condensation and grime, thin enough to see straight through. Wet pavement outside pulls both colours into long reflected streaks. Every light in the frame is a practical that belongs to the scene, and the colour comes from the signage and the tubes themselves rather than from a grade. Any sign lettering stays a background element rather than the focus of the picture. {camera_feel}. Everything is still and sharp, with no motion blur.
```

**Key levers:** `{store_type}` (Korean convenience store, bodega, late-night pharmacy, 24-hour laundromat), `{fluorescent_color}` (cool blue-white, greenish-white, warm tungsten), `{neon_sign_description}` (red "OPEN" sign, blue beer brand logo, pink cursive word), `{neon_color}` (red #FF2D2D, blue #3366FF, pink #FF69B4, green #39FF14), `{person_description}`, `{pose_description}` (leaning against door frame, sitting on overturned crate, standing with hands in pockets), `{clothing_description}` (dark hoodie that absorbs light, white t-shirt that bounces both colors, leather that reflects), `{camera_feel}` (Cinestill 800T with halation around neon, clean digital night, Fujifilm color science)

**Recommended model:** `bytedance-seed/seedream-5-0-lite` — the default; strong prompt adherence and realistic environments. \$0.035, up to 7.5MP.
**Args:** `aspect_ratio: '3:2'`

> Keep any sign text in double quotes, as in the `red "OPEN" sign` lever above.

---

## Monochrome Glitch Profile Portrait

Use for edgy, tech-forward portraits — artist profiles, electronic music press, tech brand campaigns. High contrast black-and-white with selective red digital artifacts.

<!-- Source concept: monochrome profile portrait with digital glitch artifacts and red accent color -->

```
A high-contrast black-and-white press portrait of {person_description} in sharp profile facing {direction}, head and upper shoulders only, emerging from a pure black background (#000000) with no environment around them. The contrast is extreme: skin highlights blow out to near-white, shadows fall to pure black, and almost no midtone graduation survives between them. {hair_detail} reads as a silhouette against the black. The one eye visible in profile holds a single catchlight. The jaw line and nose bridge are the sharpest elements in the frame. No more than {max_glitch_lines} horizontal glitch displacement lines cut across the image at {glitch_positions} — each one offsets a thin horizontal slice of 4-8px to the right by 10-20px, a clean digital displacement rather than an organic tear. Those displaced slices are the only colour in the picture, rendered in {accent_color}; every other element stays monochrome. Fine horizontal scan lines run across the entire image like the texture of a CRT monitor, subtle under heavy high-ISO film grain that sits over everything. The face stays recognisable through the artifacts. The background stays solid black with no gradient and no texture. No text anywhere in the image.
```

**Key levers:** `{person_description}`, `{direction}` (left, right), `{hair_detail}` (tight buzz cut showing skull contour, shoulder-length hair with flyaway strands catching backlight, pulled-back bun), `{glitch_positions}` (across the eye, across the mouth, across the forehead — specify 2-3 positions), `{accent_color}` (#FF0000 red, #00FF41 terminal green, #FF00FF magenta), `{max_glitch_lines}` (3-5)

**Recommended model:** `bytedance-seed/seedream-5-0-lite` — pixel-level graphic instructions (slice thickness, offset distance, line count, colour confined to the slices) are prompt-adherence work, and skin texture is irrelevant here since the highlights are blown by design.
**Args:** `aspect_ratio: '1:1'`

---

## Japanese Negative Film Rooftop Portrait

Use for moody, atmospheric portraits with overexposed analog film qualities — muted colors, lifted shadows, and a feeling of faded memory. Ideal for editorial, zine, or personal project work.

<!-- Source concept: Japanese negative film aesthetic — overexposed, muted tones, rooftop setting -->

```
A waist-up portrait of {person_description} on a {rooftop_description}. They stand near the edge railing, {pose_description}, with the {city_skyline} visible behind them but washed out and desaturated by {sky_condition}. Shot on expired Japanese negative film — colours shifted toward {color_shift}, highlights blown soft and chalky, shadows lifted with visible grain through the flat midtones. Skin tones run slightly green-yellow as if the film has aged. {clothing_description} reads as muted tones, almost monochromatic against the overexposed sky. Wind moves {wind_detail}. The mood is nostalgic and transient, a memory captured on deteriorating film stock. Eye-level framing, subject slightly off-center toward {frame_position}.
```

**Key levers:** `{person_description}`, `{rooftop_description}` (concrete apartment building rooftop, industrial warehouse roof with exhaust vents, school building roof with chain-link fence), `{pose_description}` (leaning on railing looking at camera, turned away looking at skyline, sitting on a ledge with knees drawn up), `{city_skyline}` (Tokyo mid-rise apartments, generic Asian city with power lines), `{sky_condition}` (overcast white sky, hazy afternoon sun), `{color_shift}` (green-cyan cast, yellow-amber cast), `{clothing_description}` (oversized vintage windbreaker, plain white t-shirt, navy work jacket), `{wind_detail}` (hair across face, jacket hem, collar), `{frame_position}` (left third, right third)

**Recommended model:** `bytedance-seed/seedream-5-0-lite` — the look is a colour and exposure treatment applied over a simple one-subject scene, which seedream handles at the best price per pixel.
**Args:** `aspect_ratio: '3:2'` (or `'4:5'`)

---

## Dreamy Underwater Surreal Portrait

Use for beauty campaigns, conceptual art, or album visuals — a portrait where the subject floats in clear water surrounded by translucent aquatic elements.

<!-- Source concept: surreal underwater portrait with translucent fish and dreamy caustic light -->

```
A surreal underwater beauty portrait of {person_description} floating in a relaxed {pose_description} in clear {water_color} water, eyes {eye_state}, hair fanned out weightlessly in all directions. Water fills the entire frame — an infinite aquatic void with no pool walls, no tiles and no surface edge in sight. Caustic light ripples across the subject from above as sunlight breaks through the water surface in {light_pattern}. {clothing_description} billows and hangs suspended, its folds and hems drifting independently of the body. {fish_count} translucent {fish_type} swim in a loose school around the subject, each one semi-transparent with a visible skeletal structure and iridescent scales catching the caustic light. Fine air bubbles rise in a delicate thread from the subject's {bubble_source}. The skin carries a cool {water_tint} cast from the water. The face is clearly visible and serene, at ease rather than straining or holding breath, and the subject wears no goggles or scuba gear. Everything in the frame obeys the same underwater physics — hair, fabric and bubbles all float. Palette: {palette}. Composition: {shot_type}.
```

**Key levers:** `{water_color}` (deep cerulean #0077B6, pale turquoise #AFEEEE, dark teal #004D4D), `{person_description}`, `{pose_description}` (arms slightly outstretched like a slow free-fall, curled fetal position, one arm reaching upward toward the light), `{eye_state}` (softly closed, open and gazing upward at the light, looking directly at camera), `{clothing_description}` (flowing white silk dress, loose linen shirt and trousers, sheer organza wrap), `{fish_count}` (5-8), `{fish_type}` (jellyfish, small reef fish, elongated glass catfish), `{light_pattern}` (parallel god rays from upper right, scattered dappled caustics, single concentrated beam), `{bubble_source}` (lips, fingertips, fabric edges), `{water_tint}` (blue-green, aquamarine), `{palette}` (teal and ivory, deep blue and gold, seafoam and blush), `{shot_type}` (full body vertical, waist-up centered, three-quarter with negative space below)

**Recommended model:** `google/gemini-3-pro-image` — this is the one pattern here that earns it: many interacting subjects under one physics rule (weightless hair, fabric drifting free of the body, a school of translucent fish, caustics falling across all of it).
**Args:** `aspect_ratio: '4:5', resolution: '2K'`

> Pro costs ~7x seedream per pixel, so try `bytedance-seed/seedream-5-0-lite` with `aspect_ratio: '4:5'` first and only escalate if the fish turn opaque or the fabric starts hanging as if dry.
