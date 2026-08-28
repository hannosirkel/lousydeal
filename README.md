# lousydeal

The store behind [lousydeal.com](https://lousydeal.com): a novelty shop that
sells a deliberately poor deal and issues a polished certificate documenting it.
The premise is absurd. The implementation is not.

Public. Public does not mean it may hold a secret.

## Status

Documentation and its checks. There is no application code yet: the catalogue
records `languages: [shell]` for `scripts/validate` and the pre-commit hook, and
`npm_project: false`. `typescript` joins the list in the same commit as the
first TypeScript file.

What is being built, in what order, and what has already been decided:
[`docs/working/fresh-build.md`](./docs/working/fresh-build.md).

## What it owns

- The storefront and the Medusa backend, once they land.
- Certificate issuance and rendering.
- Baldrick, the scripted sales chatbot. No LLM backend, by decision.
- Its own documentation, local architecture, and decisions.

## What it does not own

- Deployable cluster state. That is [`deploys`](https://github.com/hannosirkel/deploys),
  under `lousydeal/`.
- Argo CD `Application` objects, DNS, and cluster bootstrap. That is `orange`.
- Live per-environment values and the cutover plan. Those are private and live
  in `orange-inventory`.
- Credentials of any kind. Those live in OpenBao.

## Developing and testing

```bash
bash scripts/validate
```

It runs markdownlint, the link checker, and the secret scan. It refuses, loudly,
when a tool it needs is not installed rather than skipping the check.

Enable the tracked pre-commit secret scan once per checkout:

```bash
git config --local core.hooksPath .githooks
```

## Deployment

Not yet deployed. When it is: this repository builds an immutable image, an
approved promotion writes its digest into `deploys`, and Argo CD reconciles it
onto the Orange cluster — live at `lousydeal.com`, test at `test.lousydeal.com`
behind Cloudflare Access. Promotion is by digest, never by tag. See
[`standards/gitops-and-deployment.md`](https://github.com/hannosirkel/architecture/blob/main/standards/gitops-and-deployment.md).

## Where things live

| Question | Answer |
| --- | --- |
| What is the product? | [`docs/current/concept.md`](./docs/current/concept.md) |
| What is being built now? | [`docs/working/fresh-build.md`](./docs/working/fresh-build.md) |
| How far along is it? | [`docs/working/status.md`](./docs/working/status.md) |
| How do I work here? | [`AGENTS.md`](./AGENTS.md) |
| Why is it like this? | `docs/decisions/` |
| What rules apply everywhere? | [`architecture/standards/`](https://github.com/hannosirkel/architecture/tree/main/standards) |
