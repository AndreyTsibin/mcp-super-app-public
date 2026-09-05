---
name: frontend-design
description: >
  Guidance for distinctive, intentional visual design when building new UI or reshaping
  an existing one. Reach for it whenever the work touches how an interface looks: a new
  page or screen, a redesign, «сделай красиво», «выглядит шаблонно», «подбери шрифты»,
  colour and type decisions, spacing and hierarchy, component styling, hero and landing
  sections, dark mode, motion. Covers aesthetic direction, typography pairing, palette,
  layout rhythm and the judgement calls that separate a considered interface from
  framework defaults, plus a countable pre-flight pass over the hero, section rhythm and
  decoration that catches the layout habits which read as machine-made. Worth consulting
  even when the ask is just "build the page" — the
  design choices are the part that decides whether it reads as templated. Not for
  generating images (use the image skill), not for diagrams (diagram-design), not for
  backend or data-layer work.
---

# Frontend Design

Approach this as the design lead at a small studio known for giving every client a visual identity that could not be mistaken for anyone else's. This client has already rejected proposals that felt templated, and is paying for a distinctive point of view: make deliberate, opinionated choices about palette, typography, and layout that are specific to this brief, and take one real aesthetic risk you can justify.

## Ground it in the subject

If the brief does not pin down what the product or subject is, pin it yourself before designing: name one concrete subject, its audience, and the page's single job, and state your choice. If there's any information in your memory about the human's preferences, context about what they're building, or designs you've made before – use that as a hint. The subject's own world, its materials, instruments, artifacts, and vernacular, is where distinctive choices come from. Build with the brief's real content and subject matter throughout.

## Design principles

For web designs, the hero is a thesis. Open with the most characteristic thing in the subject's world, in whatever form makes sense for it: a headline, an image, an animation, a live demo, an interactive moment. Be deliberate with your choice: a big number with a small label, supporting stats, and a gradient accent is the template answer, only use if that's truly the best option.

Typography carries the personality of the page. Pair the display and body faces deliberately, not the same families you would reach for on any other project, and set a clear type scale with intentional weights, widths, and spacing. Make the type treatment itself a memorable part of the design, not a neutral delivery vehicle for the content.

Structure is information. Structural devices, numbering, eyebrows, dividers, labels, should encode something true about the content, not decorate it. Many generic designs use numbered markers (01 / 02 / 03), but that's only appropriate if the content actually is a sequence - like a real process or a typed timeline where order carries information the reader needs. Question if choices like numbered markers actually make sense before incorporating them.

Leverage motion deliberately. Think about where and if animation can serve the subject: a page-load sequence, a scroll-triggered reveal, hover micro-interactions, ambient atmosphere. An orchestrated moment usually lands harder than scattered effects; choose what the direction calls for. However, sometimes less is more, and extra animation contributes to the feeling that the design is AI-generated.

Match complexity to the vision. Maximalist directions need elaborate execution; minimal directions need precision in spacing, type, and detail. Elegance is executing the chosen vision well.

Consider written content carefully. Often a design brief may not contain real content, and it's up to you to come up with copy. Copy can make a design feel as templated as the design itself. See the below section on writing for more guidance.

## Process: brainstorm, explore, plan, critique, build, critique again

For calibration: AI-generated design right now clusters around three looks: (1) a warm cream background (near #F4F1EA) with a high-contrast serif display and a terracotta accent; (2) a near-black background with a single bright acid-green or vermilion accent; (3) a broadsheet-style layout with hairline rules, zero border-radius, and dense newspaper-like columns. All three are legitimate for some briefs, but they are defaults rather than choices, and they appear regardless of subject. Where the brief pins down a visual direction, follow it exactly — the brief's own words always win, including when it asks for one of these looks. Where it leaves an axis free, don't spend that freedom on one of these defaults. Just like a human designer who's hired, there's often a careful balance between doing what you're good at and taking each project as a chance to experiment and learn.

Work in two passes. First, brainstorm a short design plan based on the human's design brief: create a compact token system with color, type, layout, and signature. Color: describe the palette as 4–6 named hex values. Type: the typefaces for 2+ roles (a characterful display face that's used with restraint, a complementary body face, and a utility face for captions or data if needed). Layout: a layout concept, using one-sentence prose descriptions and ASCII wireframes to ideate and compare. Signature: the single unique element this page will be remembered by that embodies the brief in an appropriate way.

Then review that plan against the brief before building: if any part of it reads like the generic default you would produce for any similar page (work through a similar prompt to see if you arrive somewhere similar) rather than a choice made for this specific brief — revise that part, say what you changed and why. Only after you've confirmed the relative uniqueness of your design plan should you start to write the code, following the revised plan exactly and deriving every color and type decision from it.

When writing the code, be careful of structuring your CSS selector specificities. It's easy to generate CSS classes that cancel each other out (especially with a type-based selector like .section and a element-based selector like .cta). This can happen often with paddings/margins between sections.

Try to do a lot of this planning and iteration in your thinking, and only show ideas to the user when you have higher confidence it'll delight them.

## Restraint and self-critique

Spend your boldness in one place. Let the signature element be the one memorable thing, keep everything around it quiet and disciplined, and cut any decoration that does not serve the brief. Not taking a risk can be a risk itself! Build to a quality floor without announcing it: responsive down to mobile, visible keyboard focus, reduced motion respected. Critique your own work as you build, taking screenshots if your environment supports it – a picture is worth 1000 tokens. Consider Chanel's advice: before leaving the house, take a look in the mirror and remove one accessory. Human creators have memory and always try to do something new, so if you have a space to quickly jot down notes about what you've tried, it can help you in future passes.

## Pre-flight: the countable failures

Everything above is a judgement call. This pass is not. Each item below is checkable by counting, and each is a shape that generated pages fall into by default — which is exactly why a reader clocks the page as machine-made before reading a word of it. Run this before calling the work done, and again after any large edit. A hit here is a fix, not a trade-off to weigh.

**Hero**

- It fits the first viewport. Headline at most two lines at desktop, subtext at most twenty words, primary CTA visible without scrolling. If the copy will not fit, cut the copy or drop the scale; never push the CTA below the fold.
- At most four text elements, total: an eyebrow *or* a brand strip (one or neither), the headline, the subtext, the CTA row (one primary plus at most one secondary). Trust micro-strips, pricing teasers, feature bullets and avatar rows belong to their own section underneath.
- Type scale is planned together with the hero asset, not after it. A headline that wraps to four lines is a font-size mistake, not a copy-length one. The largest display sizes are for headlines of three to five words.
- Top padding stays modest. Hero content floating a third of the way down the viewport reads as a layout bug rather than as breathing room. Buy the air with scale, not with padding.
- The "trusted by" logo wall is the section under the hero, never a row inside it.

**Sections**

- A layout family appears at most once per page. If "Services" and "Selected work" both resolve to a three-card row, one of them is wrong. Eight sections should draw on at least four different families.
- At most two consecutive image-left/text-right alternating sections. A third in a row is a failure: break the run with a full-width band, a stacked section, a grid, or another family entirely.
- A grid has exactly as many cells as there is content for. An empty tile at the end means the shape was picked before the content was counted — reshape the grid, do not pad it.
- Multi-cell grids carry real variation in two or three cells: an image, a tint, a pattern, a change of density. Six identical text-only cards on one background is the default answer, not a designed one.
- Small uppercase eyebrow labels are rationed to roughly one per three sections, hero included. When every header carries one they stop labelling anything and just beat out a rhythm the reader recognizes as generated. Dropping the label outright is usually right — a section's position on the page already says what it is. Same test as the numbered markers above: does it encode something true, or decorate?
- "Big headline left, small explainer paragraph floating top-right" is a default, not a composition. Stack headline and body instead, unless the right column carries something real.

**Chrome and decoration**

- Navigation fits one line at desktop widths and stays under roughly 80px tall. A nav that wraps to two lines, or eats a tenth of the viewport, is broken.
- Every multi-column block declares its narrow-width fallback where the block is defined. Do not assume the framework handles it.
- No product UI faked out of styled divs — no invented dashboard, terminal or task list standing in for a screenshot. Use a real capture, a real component, a generated image, or nothing.
- No hairlines, crosshairs or rules added purely to make the page feel designed. Rules earn their place by separating real content.
- No scroll cues under the hero. Whoever is looking at the hero has not scrolled yet and knows how.
- Long lists and spec tables get one border direction, not both. Ten rows with a hairline above and below each one is the laziest layout available.

Rules in this section are adapted from [taste-skill](https://github.com/Leonxlnx/taste-skill) (MIT), sections 4.7 and 9.

## More on writing in design

Words appear in a design for one reason: to make it easier to understand, and therefore easier to use. They are design material, not decoration. Bring the same intentionality to copy that you would bring to spacing and color. Before writing anything, ask what the design needs to say, and how it can best be said to help the person navigate the experience.

Write from the end user's side of the screen. Name things by what people control and recognize, never by how the system is built. A person manages notifications, not webhook config. Describe what something does in plain terms rather than selling it. Being specific is always better than being clever.

Use active voice as default. A control should say exactly what happens when it's used: "Save changes," not "Submit." An action keeps the same name through the whole flow, so the button that says "Publish" produces a toast that says "Published." The vocabulary of an interface is the signposting for someone navigating the product. Cohesion and consistency are how people learn their way around.

Treat failure and emptiness as moments for direction, not mood. Explain what went wrong and how to fix it, in the interface's voice rather than a person's. Errors don't apologize, and they are never vague about what happened. An empty screen is an invitation to act.

Keep the register conversational and tuned: plain verbs, sentence case, no filler, with tone matched to the brand and the audience. Let each element do exactly one job. A label labels, an example demonstrates, and nothing quietly does double duty.
