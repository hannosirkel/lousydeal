# 004. Render the trader identity from runtime configuration

- **Date:** 2026-08-28
- **Status:** accepted

## Context and problem statement

Aislopica OÜ operates the store, and its legal name, registered address and
contact address must appear where a customer can find them: the imprint, the
order confirmation, the invoice. The build contract records the entity as a fact
(§2b) but does not say how it reaches a rendered page. Legal and tax work is out
of build scope and gates publication (§23), so whatever V1 builds must let a
lawyer add disclosures later without rework.

## Considered options

- Runtime configuration, resolved into content through named placeholders, as
  `plepic` does.
- Literal values written into the content files.
- A constant module imported by the pages that need it.

## Decision

Runtime configuration. Content files carry literal placeholders —
`{merchantLegalName}` and its siblings — and a resolver substitutes them at
render from values read server-side per request. An unconfigured field is
`null`, never a placeholder string and never a fabricated value.

## Rationale

This is what §23 asks for in mechanism rather than in intention: *do not
hard-code copy that a lawyer will later have to unpick from logic*. A
disclosure that is a placeholder in a content file can be changed by editing
content. A disclosure interpolated inside a component cannot.

`plepic` already runs this seam and learned the part that is not obvious: what a
page does with a `null` depends on what that page owes the reader. Optional
prose is dropped, because losing an alternative contact route costs a visitor
nothing they could have used. A legal disclosure is rendered as a **named,
visible gap** with a notice that the page is incomplete, because an imprint that
quietly loses its registration number renders as a complete legal notice that is
not one. Copy that distinction, not just the substitution.

The trade-off accepted: seven or so more environment values per environment, and
a page that is wrong if a deployment forgets one. The `no-unresolved-placeholder`
guard test is what converts that from a silent defect into a failing build.

Committing the values instead was rejected despite the repository being public
and the values being public register facts. Publishability was never the
question; changeability is. A committed disclosure is a code change to fix, and
the legal gate is expected to change these.

## Consequences

- The imprint, order confirmation and invoice read from one configuration
  object, and no component holds a literal.
- Every field needs a deployment value in both environments before publication,
  delivered through the sanctioned secrets and configuration path.
- `no-unresolved-placeholder` becomes a required test, not an optional one.
- The registry code and VAT number are **not** covered by this decision. They
  are separate facts the operator has not supplied, and adding them is
  configuration, not a redesign.
