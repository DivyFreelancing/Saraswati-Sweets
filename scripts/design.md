# DESIGN.md: Saraswati Sweets (Barabanki, UP)

Read this file before any UI, layout or styling change. If a prompt and this file disagree, follow the prompt and tell me about the conflict.

## 0. Scope rules for AI agents

- Visual and layout work only. Do NOT change business logic: payments (Cashfree), auth, order/refund handlers, API routes, database code, cleanup jobs.
- Do not add npm dependencies, fonts from new hosts, or external scripts without asking first.
- Never open, print or commit `.env` or any secret.
- No stock photos, AI-generated images or placeholder food photos. Images come from the owner. Until then use a plain tinted tile, not a random photo.
- Work on a branch, commit in small steps, never merge or push to `main`.
- Before editing, list the files you will touch. After editing, run the type check and production build and test at 375px, 768px and 1280px.

## 1. Brand facts (use exactly; ask before adding more)

- Name: Saraswati Sweets. Pure desi ghee mithai since 1989.
- Location: Indira Market, near Chaya Chauraha, Barabanki, Uttar Pradesh.
- Hours: daily 6:30 AM to 10:00 PM. Phone: +91 91611 10030.
- Do NOT add food or certification claims (for example "certified", "bilona", "zero vanaspati", "cruelty-free silver vark") unless the owner has confirmed each one. List every such claim you find in the code so the owner can check it.
- The shop is pure vegetarian: never show non-vegetarian food (meat, chicken, egg) anywhere, including category tiles and banners. Show only sweets, namkeen, gift boxes, the shop and the people making them.

## 2. Colour tokens

| Token | Hex | Use |
|---|---|---|
| maroon (primary) | #7A1129 | primary buttons, active states, today's bar |
| maroon-deep | #4A0A1B | admin sidebar, dark sections |
| gold | #C79A3D | small accents, borders on feature blocks |
| gold-light | #E8C16A | text on maroon-deep |
| gold-soft | #D9B866 | chart bars |
| cream (page) | #F7F4EF | page background |
| cream-tint | #F3E9DC | active nav item, soft fills |
| card | #FFFFFF | cards and tables |
| border | #E9E2D8 | card and table borders |
| ink | #241C17 | body text |
| muted | #6B5F55 | secondary text |
| success | #1E7A4B (text #17663E on #E3F4EA) | in stock, switches ON |
| warning | text #8A4B00 on #FDEFD0 | pending, needs attention |
| danger | #A8261E | errors, destructive actions |

If the logo uses slightly different colours, the logo wins: tell the owner and update this table.

Rules: text contrast at least 4.5:1 (3:1 for 24px and above). Never convey meaning by colour alone. No gradient washes, no glassmorphism, no neon.

## 3. Typography

- Admin console: Manrope (400, 600, 700, 800). Use tabular numerals for all numbers, prices and tables.
- Storefront: keep the current fonts for now. Changing the storefront typeface is an owner decision and must not be done silently.
- Scale: page title 26px/800, card title 16px/800, body 14px, small text 12-13px, big numbers 32px/800. Line height 1.5 for body text.
- Prices always show the rupee sign and the weight, for example "₹375 / 250 g".

## 4. Layout and spacing

- Spacing scale: 4, 8, 12, 16, 20, 24, 32, 48. Gaps between cards 16px; card padding 20px.
- Cards: white, 1px border, 14px radius. No heavy shadows.
- Breakpoints: phone 375px, tablet 768px, desktop 1280px. The page body must never scroll sideways; wide tables scroll inside their own container.
- Admin shell: fixed left sidebar (232px) on desktop; below 900px it becomes a horizontally scrollable nav strip on top. Main content max width about 1180px.

## 5. Components

- Buttons: minimum height 44px, 10px radius, 14px/700 text. One primary (maroon fill) per area; secondary is white with a border.
- Pills / badges: 12px/700, fully rounded, tinted background with dark text (see status colours).
- Switches: real `<button role="switch" aria-checked>`; the tap area is at least 44px.
- Tables: header row 12px/700 muted; rows have a bottom border; right-align money; a clear empty state ("No orders waiting") when there is no data.
- KPI card: small muted label, big number, one pill underneath.
- Charts: simple bars or lines in the gold/maroon tokens, value labels visible, today highlighted in maroon. No 3D, no animation required.
- Icons: one stroke style (1.8px, round caps). Icon-only buttons need an aria-label. Never use emoji as icons.

## 6. Accessibility (required)

- Real `<button>`, `<a href>`, and `<input>` with a `<label>` or aria-label. No clickable divs.
- Visible keyboard focus ring on every interactive element.
- Respect `prefers-reduced-motion`; avoid motion that is not needed.
- Form errors are shown as text near the field, not by colour alone.

## 7. Copy style

- Plain, specific and short. Write what the shop actually does: names of sweets, "since 1989", delivery area, hours.
- Avoid filler such as "artisanal", "curated", "crafted with passion" unless the owner chose those words.
- Hindi names are welcome next to English names (for example Kaju Katli, Soan Papdi). Do not invent facts, statistics, awards or reviews.
- Button labels match what they do ("Explore Hampers" for hampers, not "Explore Sweets").
- Promises about delivery time must come from the owner. Do not write "same-day delivery" or similar on your own.

## 8. Things that make the site look "AI generated" (avoid)

- Stock or AI-made food photos, especially ones that do not match the shop's products.
- Identical rounded cards repeated in identical grids everywhere.
- Decorative dividers and ornaments added only for decoration.
- Placeholder text left in production ("Category for ..."), clipped headings, dark text on dark backgrounds.
- Generic marketing sentences that could belong to any sweet shop.

## 9. Open decisions (owner to fill in)

- [ ] Storefront heading and body typefaces: keep current / change to: ______
- [ ] Exact brand colours taken from the logo file: ______
- [ ] Which food claims are confirmed with proof (FSSAI licence number, ghee sourcing): ______
- [ ] Delivery promise wording (for example "delivered within ___ hours"): ______
- [ ] Real photos supplied for: hero, categories, hampers, shop front, kitchen