# Social media kit

This directory contains the shared Lousy Deal account identity. Use the PNG
files for uploads. Keep the SVG files as editable masters.

| Service | Profile image | Cover or post image |
| --- | --- | --- |
| TikTok | `profile.png` | `card-square.png` for posts |
| Facebook | `profile.png` | `cover.png` |
| Instagram | `profile.png` | `card-square.png` for posts |
| X | `profile.png` | `cover.png` |
| YouTube | `profile.png` | `cover.png` |
| LinkedIn | `profile.png` | `cover.png` |
| Reddit | `profile.png` | `reddit-cover.png` |

`cover.png` is 2560 by 1440 pixels. Its complete design fits inside the central
1546 by 423 pixel area so that wide platform crops retain every ledger row.
`card-square.png` is 1080 by 1080 pixels. `profile.png` is 1024 by 1024 pixels.
`reddit-cover.png` is 1080 by 128 pixels.

The SVG masters load the committed IBM Plex Mono files from
`storefront/public/fonts/`. Render PNG replacements against those files. Do not
accept a system font fallback.

## Profile copy

| Field | Copy |
| --- | --- |
| Display name | Lousy Deal |
| Preferred handle | `lousydeal`, if available |
| Website | `https://lousydeal.com` |

### Bio

> Numbered certificates of objectively bad value. By Aislopica OÜ.

### About

> Lousy Deal sells numbered digital certificates that document a deliberately
> lousy deal. A certificate records the purchase and has no rights, ownership,
> entitlement, membership, service, discount, redemption value or other
> benefit. The shop also sells ordinary printed merchandise. Lousy Deal is
> operated by Aislopica OÜ, an Estonian private limited company.

## Image descriptions

Use this description for `profile.png`:

> A red double-ring receipt stamp containing the words Lousy Deal on an
> off-white paper background.

Use this description for the cover and card images:

> Receipt-style ledger stating: item, nothing; price, five dollars; value, zero
> dollars; return, minus one hundred percent.

Do not add emoji, exclamation marks, fabricated totals, reviews or testimonials.

Platform interfaces and crops change. Preview each upload before publication.
Move the image only when needed to avoid a service's profile-image overlay.
