Review the prompt below, fix it's inconsistencies and gaps if any, then make implementation plan, and implement.
Goals: visuals implemented to lousydeal.com, compliant legal pages, and a complete visual identity. Deployed to test and live.

# PROMPT — Build the Lousydeal.com visual identity and implement the storefront's visual side

*Paste everything below this line into Claude Code (or another coding agent) at the repo root of `hannosirkel/lousydeal`. It assumes the existing Next.js App Router storefront in `storefront/` and does not touch `backend/`, deployment, or Medusa configuration.*

---

You are working in the `lousydeal` monorepo. The storefront (`storefront/`, Next.js App Router, TypeScript, npm workspace) currently renders an unstyled list of three products. Your task is to build the complete visual identity and implement it across the storefront, including compliant legal pages. Read `AGENTS.md`, `CLAUDE.md`, and `docs/current/concept.md` first and follow the repo's working rules. All work must pass `bash scripts/validate` before you consider it done.

## 0. The brand in one paragraph

Lousydeal.com sells a deliberately terrible transaction: customers knowingly pay $5/$10/$25 for a numbered certificate proving they made a lousy deal. The visual identity is **a deadpan financial institution**: every surface looks like an official transaction document — invoice, ledger, receipt, certificate. The design itself NEVER jokes. No comic fonts, no emoji, no wacky colors, no tilted elements, no illustrations, no mascots. The design is completely serious; the *content* (prices, values, terms) carries the humor. The site should look like it was designed by a meticulous Swiss accountant who has no idea anything is funny.

## 1. Design tokens (implement first, everything else consumes these)

Create a single source of truth (Tailwind theme config + CSS custom properties in the root layout):

### Typography

- One typeface for everything: **IBM Plex Mono** via `next/font` (self-hosted through next/font, weights 400, 500, 700; include italic 400 for fine print). No second typeface anywhere.
- Type scale (rem): 0.6875 (fine print), 0.8125 (body-small/labels), 0.9375 (body), 1.125 (section), 1.5 (page title), 2.25 (display, used sparingly, e.g. the counter and "-100%").
- All-caps with letter-spacing 0.08em for labels and headings; sentence case for body and legal text. Line-height 1.6 body, 1.2 headings.

### Color

- `--paper: #FAFAF7` (background), `--ink: #141412` (text), `--ink-soft: #6B6B66` (secondary text, borders use it at full strength, 1px), `--stamp: #B3261E` (the ONLY accent: negative numbers, the primary buy button, error states, the "VOID"/"NO REFUNDS" motifs), `--paper-shade: #F1F0EB` (row hover, table header fill).
- Dark mode (optional, `prefers-color-scheme`): invert to `#141412` paper / `#EDEDEA` ink, keep `--stamp` as is. If time-boxed, skip dark mode; light "paper" mode is the brand.

### Layout & shape

- Max content width 720px, centered — documents are narrow. Certificate and legal pages 640px.
- Border radius: 0 everywhere. Shadows: none. Gradients: none.
- Rules instead of boxes: 1px solid `--ink` horizontal rules separate sections; a double rule (two 1px lines, 3px apart) marks document tops and bottoms.
- Spacing scale: 4/8/12/16/24/32/48/64 px only.

### Motifs (reusable components — build these in `storefront/` under a `components/document/` folder)

- `<DocumentFrame>`: double rule top and bottom, small caps header row with document title left ("PURCHASE ORDER", "CERTIFICATE", "TERMS OF SERVICE") and document number/date right.
- `<LedgerRow label value>`: label left, dotted leader (CSS `border-bottom: 1px dotted`) filling the middle, value right-aligned in tabular numerals (`font-variant-numeric: tabular-nums`). This is the signature component.
- `<Rule>` and `<DoubleRule>`.
- `<FinePrint>`: 0.6875rem italic, `--ink-soft`.
- `<StampMark>`: thin 1.5px double-ring circle, all-caps text, `--stamp` color, used for "CERTIFIED LOUSY DEAL", rendered as inline SVG, max one per page.
- Buttons: rectangular, 1px solid border. Primary = `--stamp` background, paper text, label style caps ("ACQUIRE FOR $5.00"). Secondary = transparent, ink border. Hover: background and text invert; no transitions longer than 120ms; no scale/bounce effects.
- Links: underlined, ink; visited same; hover switches to `--stamp`.

## 2. Pages to implement (visual layer only; wire to existing data where it exists, use typed placeholder data where backend endpoints are not ready, clearly marked TODO)

**Home (`/`)** — structured as a single purchase order document:

1. Masthead: `LOUSYDEAL.COM` small caps, centered; beneath it the fine-print line `PURVEYORS OF OBJECTIVELY BAD VALUE`.
2. Hero is NOT a hero: it is a ledger block —
   `ITEM ……… LOUSY DEAL`, `PRICE ……… $5.00`, `VALUE ……… $0.00`, `RETURN ……… -100%` (the -100% in `--stamp`), followed by the primary button.
3. Tier table: the three tiers as rows of one invoice-style table (columns: ITEM / DESCRIPTION / VALUE / PRICE / action), not as cards. Descriptions deadpan: "Official numbered certificate of poor judgment." / "Identical, but labeled Plus." / "Professional-grade poor judgment." Each row's VALUE column reads `$0.00`.
4. The counter, display size, as a ledger line: `TOTAL VOLUNTARILY WASTED ……… $NN,NNN.00` with fine print "Figure reflects real orders. Nothing on this site is fabricated except the value proposition."
5. Footer (global): three columns of small links — Legal (Terms, Privacy, Refunds & Withdrawal, Imprint), Company (About, Contact), and the fine-print company/imprint line. Footer appears on every page.

**Tier page (`/deal/[tier]`)** — a quotation document: DocumentFrame titled "QUOTATION", ledger block for that tier, an "UPGRADES AVAILABLE" section linking the worse tiers ("Pay more. Receive the same."), gift toggle ("This lousy deal is for: MYSELF / A VICTIM OF MY CHOOSING"), primary button to checkout. Fine print: withdrawal-rights notice (see §3).

**Order success (`/order/confirmed`)** — a receipt: DocumentFrame titled "RECEIPT", full ledger (item, price, VAT line, value, return), certificate number, StampMark "CERTIFIED LOUSY DEAL", link to the public certificate page, and the merch upsell as three further ledger rows titled "MAKE IT WORSE".

**Public certificate page (`/deal/nr/[publicId]`)** — the shareable artifact and the most designed page. Centered 640px certificate: double rules, "CERTIFICATE OF LOUSY JUDGMENT", deal number in display size, the chosen display name, amount wasted, date, StampMark, and a fine-print clause ("This certificate confers no rights, value, or benefits of any kind, and the bearer knew that."). Must look screenshot-worthy on mobile — test at 390px width.

**Legal pages (`/legal/terms`, `/legal/privacy`, `/legal/refunds`, `/legal/imprint`)** — DocumentFrame, 640px, numbered sections (§1, §1.1) with a small table of contents. Same identity; content rules in §3.

**System pages** — 404 as a document: "DOCUMENT NOT FOUND — This page has even less content than our products." Error page equivalent. Loading states: a single blinking `▮` cursor, no spinners.

**Social/OG images** — implement dynamic OG image generation with `next/og` for the home page and per-certificate pages, rendering the ledger block / certificate in the same tokens (IBM Plex Mono, paper, ink, stamp red), 1200×630.

## 3. Legal & compliance content (real obligations, deadpan register)

Rules of engagement for these pages: the *typography* stays in the identity; the *substance* must be genuinely accurate and enforceable. Absurdist flourishes are allowed only where they do not change legal meaning (e.g., a recital may note the deal is lousy; the withdrawal clause may not be a joke). Every page ends with the fine-print line "This document is legally binding, unlike our value proposition." followed by the last-updated date.

Draft the following, with clear `<!-- REVIEW: have counsel verify -->` markers and placeholder tokens (`{COMPANY_LEGAL_NAME}`, `{REG_CODE}`, `{ADDRESS}`, `{VAT_NO}`, `{SUPPORT_EMAIL}`) — do not invent company details:

- **Terms of Service**: seller identity; exact description of what is sold (a numbered digital certificate — state plainly that the customer receives a digital certificate and nothing else of value, and that this is the point); prices include VAT; order process; delivery (immediate, by email/page); gift purchases; acceptable-use of public display names (seller may reject or remove offensive names); liability limits; governing law Estonia; consumer-dispute info (Estonian Consumer Protection and Technical Regulatory Authority + EU ODR platform link).
- **Refunds & Withdrawal**: this is digital content supplied immediately. Implement the EU consumer-rights mechanics honestly: at checkout the buyer must tick express consent to immediate delivery and acknowledgment that they thereby lose the 14-day withdrawal right (add this checkbox to the checkout/tier page UI, unticked by default). The policy page explains this in plain language. "NO REFUNDS" may appear as a stamp motif ONLY where it is legally true after that consent; the statutory rights paragraph itself stays straight.
- **Privacy Policy (GDPR)**: controller identity; data processed (checkout email, chosen display name, payment handled by Stripe as processor — card data never touches the site), purposes and legal bases, retention, processors (Stripe, Printful for merch, hosting), international transfers, data-subject rights, complaint right to the Estonian Data Protection Inspectorate (AKI). If only strictly necessary cookies are used, say so and skip a consent banner; do not add analytics silently.
- **Imprint/Contact**: legal name, registry code, address, email, VAT number.

Do not fabricate legal facts. Where the repo lacks the real company details, leave the placeholder tokens and list them in a final "OWNER MUST FILL" section of your PR description.

## 4. Constraints and definition of done

- No raster images anywhere except OG output; the identity is type, rules, and one SVG stamp. Total added client JS for the visual layer ≈ 0 (server components; the only interactivity is the gift toggle and consent checkbox).
- Accessibility: semantic HTML (the ledger is a `<dl>` or table, not divs), visible focus states (2px `--stamp` outline), contrast AA (verify `--ink-soft` on `--paper`), reduced-motion respected (trivial, since there is almost no motion).
- Responsive: single column, mobile-first; the tier table collapses to stacked ledger blocks below 640px; certificate page verified at 390px.
- Keep components in `storefront/` per the repo's structure conventions; no new dependencies beyond `next/font` (already available in Next) and `next/og`. If a needed font file or utility conflicts with repo standards, stop and flag rather than working around.
- `bash scripts/validate` passes; typecheck and lint clean; add/adjust unit tests where the repo's conventions expect them (e.g., LedgerRow rendering, consent checkbox required before checkout).
- PR description: screenshots of home, tier, certificate, and terms pages at desktop and 390px, plus the OWNER MUST FILL list.

Work in this order: tokens + document components → home → certificate page → legal pages + consent checkbox → remaining pages → OG images. Commit in reviewable steps.
