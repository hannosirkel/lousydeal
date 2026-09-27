# Open issues

These files list the problems and open questions that remained when the
operator closed the build initiative on 2026-09-27
([decision 017](../decisions/017-close-the-v1-initiative.md)). Nothing here is
committed work.

To take an item up, the operator selects it. Write its plan in `docs/working/`
to [`standards/planning.md`](https://github.com/hannosirkel/architecture/blob/main/standards/planning.md),
and remove the item from its file here in the same change. Remove a file when
its last item goes.

Each item was still open in the code on 2026-09-27. Verify it again before you
plan it: the code, not these files, is the authority.

| File | What it holds |
| --- | --- |
| [`user-experience.md`](./user-experience.md) | Eight changes that would make the shop clearer to a buyer. |
| [`checkout-and-payment.md`](./checkout-and-payment.md) | Problems and unmeasured paths in the checkout and the paid-cart handling. |
| [`operations-and-performance.md`](./operations-and-performance.md) | Load, data-model and operator-visibility problems in how the shop runs. |
| [`legal-and-privacy.md`](./legal-and-privacy.md) | Gaps between what the legal documents say and what the shop records or does. |
| [`rendering-and-copy.md`](./rendering-and-copy.md) | Defects in how pages, the certificate PDF and the copy render, and source comments that are out of date. |
| [`operator-questions.md`](./operator-questions.md) | Product questions that only the operator can answer. |
| [`deferred-features.md`](./deferred-features.md) | Features the build left out on purpose. |
