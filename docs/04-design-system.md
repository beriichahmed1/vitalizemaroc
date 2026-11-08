# 4. Design System and Responsive Behavior

## Visual direction

Create a calm, modern, premium Moroccan DTC identity: clean product photography, generous whitespace, clear typography, and confident but restrained color. "Premium" means polished presentation and trustworthy information, not unsupported claims or luxury clichés.

Starting palette (final contrast must be tested):

- Deep evergreen: `#154D3A` — primary brand/action.
- Warm ivory: `#FAF8F2` — page background.
- Charcoal: `#202622` — body text.
- Muted gold: `#B28A45` — small accent only; not for small text on ivory.
- White: `#FFFFFF` — cards and surfaces.
- Error: `#B42318`; success: `#18794E`.

Keep color tokens in CSS variables/Tailwind theme. Verify WCAG AA contrast for normal and large text. Avoid gold body text.

## Typography and RTL

- Use a legible Arabic typeface such as **Tajawal** or **IBM Plex Sans Arabic**, served locally if practical; verify font licensing and Arabic glyph coverage.
- Use an appropriate Latin companion font for product names/domain.
- Set page direction to RTL at document level, and explicitly isolate Latin SKU/domain strings with bidi-safe markup.
- Do not reverse numbers, phone inputs, currency values, or product codes. Use a consistent MAD formatter.
- Use correct Arabic punctuation, line height, and responsive headings; do not letter-space Arabic.

## Requested brand lockup

At desktop and mobile header: circular **N** mark at the far right, Arabic name **فيتالايز المغرب**, and English **Vitalize Maroc** on the next/secondary line; nav follows, cart remains visible. The N/brand-initial mismatch is called out in the brand brief and needs owner confirmation.

Use text as the primary wordmark; do not draw a fake certification seal or create a symbol that resembles an official Moroccan authority mark.

## Layout

- Mobile-first. Design for narrow phones first, then tablet and wide desktop.
- Product image and purchase controls are visible early on mobile; do not let a sticky CTA cover forms, content, or keyboard focus.
- On desktop, alternate text-right/image-left and image-right/text-left between relevant editorial sections.
- On mobile, use a single-column order that preserves meaning and puts the product CTA after the necessary decision information.
- Use logical CSS properties (`margin-inline`, `padding-inline`, `inset-inline`) rather than left/right assumptions.
- Dialogs/drawers fit within dynamic viewport height, account for safe areas, scroll internally, and support keyboard navigation.

## Temporary imagery

No product or brand images were supplied. Create neutral, clearly replaceable sample assets or CSS placeholders. Never fabricate product packaging, certification badges, laboratory scenes, customer faces, reviews, or before/after imagery.

For each of three product galleries, document these future asset slots:

1. Actual package, front-facing.
2. Actual package/label detail with legible ingredients.
3. Scale/contents image showing the real pack quantity.
4. Authentic use-context image that does not imply an unsubstantiated result.

Home hero should use an actual Vitalize visual or non-deceptive abstract graphic, not an invented product or fake customer. Use responsive image formats, correct dimensions, lazy-load below-fold media, and set dimensions to prevent layout shift.

## Interaction, motion, and accessibility

- Touch targets should be comfortably sized; buttons need visible hover, pressed, disabled, and focus states.
- Respect `prefers-reduced-motion`. No flashing countdowns, forced carousels, or motion that hides content.
- Use semantic headings, links, buttons, form labels, status announcements, and dialog roles.
- Cart and checkout dialogs support Escape, focus trapping, and focus restoration; errors are announced accessibly.
- Include meaningful alt text for product imagery; decorative images use empty alt text.
- Test keyboard-only, screen-reader basics, color contrast, zoom, and long Arabic strings.
