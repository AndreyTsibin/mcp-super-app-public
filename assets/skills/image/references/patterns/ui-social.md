# UI Mockups & Social Media Patterns

Reusable prompt templates for social media ads, app store assets, dashboard mockups, and visual
analysis boards. Each pattern uses `{variables}` for customization.

**Which model?** Step 1 of SKILL.md decides that, not this file: production frames
(landing, client site, anything shipped) go to `google/gemini-3.1-flash-image` with
`resolution:'2K'`; drafts and experiments go to the default `openai/gpt-5.4-image-2`.
The "Best fit for this pattern" line under each pattern below says which model holds *this
particular layout* best — read it as a tie-breaker inside your category, and as a reason to
override step 1 only when the pattern's own demand (exact object counts, dense on-image text,
a consistent set of n frames) is the whole point of the frame. Seedream leads on those, and
that is a deliberate trade of skin texture for instruction-following.

Sizing: pass `aspect_ratio`; `size` is seedream-only and only for print. Everything
in this file is text-carrying layout work, and Seedream is the strongest model here at typography and
dense text rendering; it also renders UI directly from wireframes and annotations. Deviate only
where a pattern says so.

Two rules this file depends on:

- **Prose, not slots.** Write subject + action + environment first, then style, colour, light and
  composition. A comma-separated list of labels and tags is the documented anti-pattern for this
  model.
- **Text that must appear in the image goes in double quotation marks.** Vendor syntax, not
  taste: ✅ `a poster with the title "Seedream 4.5"` / ❌ `a poster titled Seedream 4.5`.

Banner-strip ratios (`4:1`, `8:1`, `1:4`, `1:8`) are the one thing seedream cannot do — those are
`google/gemini-3.1-flash-image` only.

---

## Instagram Story Ad (9:16)

Use for vertical product or brand ads targeting Instagram Stories — hero product, bold headline,
and swipe-up CTA zone at the bottom.

<!-- Source concept: Instagram Story ad with glassmorphism elements and gradient background -->

```
A vertical 9:16 Instagram Story ad for {product_name}, a {product_description}, positioned in the
upper two-thirds of the frame and angled slightly to show dimension. The background is a smooth
gradient from {gradient_top} at the top to {gradient_bottom} at the bottom, with a soft ambient
glow behind the product; the product casts a soft coloured shadow onto the background in the
gradient's own hue. Two frosted glassmorphism panels — translucent white at 20% opacity, thin
border highlight at #FFFFFF30 — float on either side of the product, one left, one right, each
rotated slightly, sitting behind and beside it as depth layers with the product fully visible
between them. The headline "{headline_text}" runs across the top third in {headline_font}, white
or light-coloured, with a subtle drop shadow for readability, and the subtext "{subtext}" sits
directly below it in a lighter weight. The bottom 15% of the canvas is a swipe-up CTA zone
holding a thin upward-pointing chevron and "{cta_text}" in small caps, both white; the lowest 5%
stays empty for the system UI overlay. Up to three {accent_elements} are scattered across the
frame at 10-15% opacity for texture. Type carries enough visual weight to stay legible on a phone
screen, and the product reads as the single focal point.
```

**Key levers:** `{product_name}`, `{product_description}` (shape, material, color), `{gradient_top}` / `{gradient_bottom}` (e.g. #6C3CE1 violet to #1A1A2E dark navy, #FF6B6B coral to #FFE66D warm yellow), `{headline_text}`, `{headline_font}` (bold condensed sans-serif, rounded geometric), `{subtext}`, `{cta_text}` (e.g. "Swipe Up", "Shop Now", "Learn More"), `{accent_elements}` (translucent spheres, soft light flares, floating geometric shards)

**Best fit for this pattern:** `bytedance-seed/seedream-5-0-lite` — headline legibility and glass transparency both ride on prompt adherence, and Seedream leads on both
**Args:** `aspect_ratio: '9:16'` · ~\$0.035

> Vertical costs pixels, not money: 9:16 returns well under the 7.5 MP seedream gives at 16:9,
> for the same \$0.035. Fine for a Story — it is a phone-screen deliverable.

---

## Social Media Feed Post (1:1)

Use for square-format posts on Instagram or Facebook — quote cards, feature announcements, or
product highlights with centered layout.

<!-- Source concept: square social media post with brand color palette and centered typography -->

```
A square 1:1 {post_type} for a social feed — {content_description} — built as a clean centred
composition. The background is {bg_treatment} in {bg_color}: flat colour, a 3% opacity noise
texture, or a soft radial gradient from {bg_color} at the centre to a slightly darker edge. The
primary text "{primary_text}" is set in {primary_font} in {text_color}, centred horizontally in
the upper half with at least 10% padding from every edge, sized large enough to read in a
thumbnail while scrolling. Below it sits {supporting_element}, carrying the visual weight and the
context. A thin horizontal divider in {accent_color} separates that content from a bottom strip
holding "{brand_name}" in small caps beside {brand_mark}. The whole layout uses exactly two type
sizes. Colour stays inside {palette} and nothing outside it. Text holds WCAG AA contrast against
the background, and every element on the canvas serves the message rather than competing with it.
```

**Key levers:** `{post_type}` (quote card, product feature, announcement, stat highlight), `{content_description}`, `{primary_text}`, `{primary_font}` (geometric sans-serif, modern serif, handwritten accent), `{text_color}` (#FFFFFF on dark, #1A1A1A on light), `{bg_color}` / `{bg_treatment}`, `{accent_color}`, `{brand_name}`, `{brand_mark}`, `{palette}` (e.g. navy #1B2A4A, gold #C9A84C, white #FFFFFF), `{supporting_element}` (product photo, icon illustration, data number in large type)

**Best fit for this pattern:** `bytedance-seed/seedream-5-0-lite` — text-heavy layout that must survive being shrunk to a feed thumbnail; dense-text rendering is Seedream's strongest suit
**Args:** `aspect_ratio: '1:1'` · ~\$0.035 (2048×2048, 4.2 MP)

---

## App Store Screenshot

Use to create a polished App Store or Google Play listing screenshot — device frame with app UI
inside, feature headline, and clean gradient background.

<!-- Source concept: App Store marketing screenshot with iPhone device frame and feature callout -->

```
A vertical App Store listing screenshot: one realistic {device_type} standing centred on a smooth
gradient background running from {gradient_top} to {gradient_bottom}, with equal breathing room
above and below the device. The device has a physically accurate {device_type} bezel in space
black, silver or natural titanium, with correct corner radius and correct button placement, and
it casts a soft diffused shadow beneath itself tinted to the gradient rather than pure black. Its
screen shows the {app_name} interface — {screen_description} — displaying {screen_content}:
{ui_description}, laid out on a {ui_style} design system with proper spacing, a correct
iOS/Android status bar along the top edge, and internally consistent real interface elements
whose text stays readable even at small size. The headline "{feature_headline}" sits
{headline_position} the device with clear separation from it, set bold in {headline_font} in
{headline_color}, two to three words per line. The subheadline "{subheadline}" runs below it in a
lighter weight at 60% opacity of the headline colour. The background stays a plain gradient from
edge to edge — no patterns, no photographs behind the device — and only this one device appears
in the frame.
```

**Key levers:** `{device_type}` (iPhone 16 Pro, Pixel 9, Galaxy S25), `{app_name}`, `{screen_description}` (brief: what the screen shows), `{screen_content}` / `{ui_description}` (detailed: specific UI elements visible), `{ui_style}` (iOS native, Material 3, custom dark theme), `{feature_headline}`, `{headline_font}` (SF Pro Display, condensed geometric), `{headline_position}` (above, below), `{headline_color}`, `{subheadline}`, `{gradient_top}` / `{gradient_bottom}` (e.g. #1A1A2E to #0D0D1A for dark, #F0F4FF to #FFFFFF for light)

**Best fit for this pattern:** `bytedance-seed/seedream-5-0-lite` — bezel precision, small in-screen UI text and headline all need adherence; Seedream is also the model documented to render UI from wireframes and annotations
**Args:** `aspect_ratio: '9:16'` · ~\$0.035

---

## Dashboard Design Mockup

Use for realistic analytics dashboard mockups — dark or light theme with data visualizations, KPI
cards, and sidebar navigation.

<!-- Source concept: analytics dashboard UI mockup with charts, cards, and navigation -->

```
A full-screen desktop analytics dashboard mockup for {dashboard_title}, showing {data_domain}
metrics in a {theme_mode} theme on a clean {design_system} design system. A vertical sidebar
roughly 220px wide runs down the left in {sidebar_bg}, with the app logo and a collapsed user
avatar at the top and icon-plus-label navigation for {nav_items} below it; the active item
carries a {accent_color} left border and a slightly lighter background. A top bar across the main
area holds the page title "{page_title}" in medium weight, a date range selector reading
"{date_range}", and a notification bell with a dot indicator. Under it, a horizontal row of
{num_kpis} metric cards in {card_bg}, each showing its metric name in small caps, a large number
value, and a small trend indicator — a green upward arrow or a red downward arrow with a
percentage. The chart area below follows {chart_layout}: a {chart_1_type} plotting {chart_1_data}
in {chart_1_colors}, and a {chart_2_type} plotting {chart_2_data} in {chart_2_colors}, both with
proper labelled axes. Below the charts sits {secondary_widget}. Every figure on screen is
plausible real data — correct scales, reasonable percentages, properly formatted numbers.
Hierarchy runs from the KPI numbers as the largest type down through the chart labels to the
navigation text as the smallest. The {theme_mode} theme holds consistently across sidebar, cards
and charts, and each element occupies its own space with the sidebar cleanly separated from the
main content.
```

**Key levers:** `{theme_mode}` (dark / light), `{design_system}` (minimal flat, glassmorphism cards, shadowed Material), `{dashboard_title}`, `{data_domain}` (SaaS revenue, e-commerce orders, marketing campaign, IoT sensor monitoring), `{sidebar_bg}` (#0F1117 dark, #FFFFFF light), `{accent_color}` (#6366F1 indigo, #10B981 emerald, #F59E0B amber), `{nav_items}` (Dashboard, Analytics, Users, Settings, Reports), `{num_kpis}` (3-5), `{chart_1_type}` / `{chart_2_type}` (line chart, grouped bar chart, donut chart, area chart), `{chart_1_colors}` / `{chart_2_colors}` (hex values), `{card_bg}` (#1E1E2E dark card, #FFFFFF light card), `{secondary_widget}`

**Best fit for this pattern:** `bytedance-seed/seedream-5-0-lite` — the densest text in this file (axis labels, KPI numbers, nav items) plus chart structure; Seedream at 16:9 is also the best pixels-per-dollar on offer
**Args:** `aspect_ratio: '16:9'` · ~\$0.035 (3642×2048, 7.5 MP)

---

## Personal Color Analysis Board

Use to create a visual color analysis graphic from a portrait — seasonal palette classification,
clothing color comparisons, and accessory recommendations in an organized layout.

<!-- Source concept: personal color analysis / seasonal color palette board with side-by-side comparisons -->

```
A personal colour analysis board for {subject_description}, laid out on a white background in
three stacked sections divided by thin #E0E0E0 lines, in a clean editorial format.

The top section runs full width. On the left, a head-and-shoulders portrait of
{subject_description} in natural lighting with a neutral expression. To its right, the season
classification "{season_type}" in medium bold text, and below that a 4x3 grid of {num_palette}
small colour swatches showing the best colours for this season ({palette_colors}), each swatch a
solid flat colour with its name in tiny text underneath.

The middle section is a clothing comparison: two side-by-side panels showing the same person as
the portrait above. The left panel, labelled "{good_label}", has the subject in a
{flattering_color} top — skin healthy, face lifted and bright. The right panel, labelled
"{bad_label}", has the same subject in an {unflattering_color} top — skin washed out and sallow.
A caption of five to eight words under each panel names the effect.

The bottom section is a horizontal strip of {num_recs} small squares, each showing a recommended
item ({rec_items}) in one of the palette colours with a one-word label below it — "Scarf",
"Blazer", "Lipstick", "Frames".

The portraits and swatches carry the board; text appears only as short labels of one to three
words each, never body copy. The layout stays organized and scannable, every section in its own
band with clean separation and no decorative flourishes.
```

**Key levers:** `{subject_description}` (age, skin tone, hair color, eye color — needed for accurate seasonal analysis), `{season_type}` (Warm Spring, Cool Summer, Warm Autumn, Cool Winter — or sub-seasons like Soft Autumn, Bright Winter), `{palette_colors}` (12 hex values matching the season, e.g. Warm Autumn: rust #B7410E, olive #708238, mustard #E1AD01, burgundy #722F37...), `{num_palette}` (12), `{flattering_color}` / `{unflattering_color}` (specific colors with hex), `{good_label}` / `{bad_label}` (e.g. "Warm Coral" / "Cool Pink"), `{num_recs}` (4-6), `{rec_items}` (scarf in olive, blazer in navy, lipstick in warm rose, eyeglass frames in tortoise)

**Best fit for this pattern:** `bytedance-seed/seedream-5-0-lite` — swatch colour accuracy, small labels throughout, and the same face repeated across three sections; Seedream holds identity across panels better than the alternatives
**Args:** `aspect_ratio: '3:4'` · ~\$0.035
