/**
 * Three links for showing somebody a certificate.
 *
 * **The first external links on this site**, and until this row there were
 * none at all: `grep 'href="http' storefront/src` was empty. That is why they
 * arrive with a guard rather than quietly —
 * `tests/third-party-disclosure.test.ts` now states the whole list of hosts the
 * source may link to, in the same way it states the whole list of packages the
 * storefront may depend on, so a fourth is a decision somebody makes rather
 * than a line somebody adds.
 *
 * **Anchors, not widgets.** A share button that loads a script is a third party
 * on every page that carries it, and this site's answer to "what do you load
 * from elsewhere" is currently "nothing". These load nothing: the browser goes
 * to the service only when somebody presses one, at which point they have
 * chosen to. The notice under the row says exactly that, because a reader of
 * this site's privacy notice would reasonably wonder.
 *
 * **The URL is built from the request's own host.** There is no configured base
 * URL in this storefront and adding one would put an environment-specific value
 * somewhere a build could see it, which decision `002` forbids. `headers()` is
 * per-request and therefore right in both environments without either knowing
 * about the other.
 */

import {
  SHARE_EMAIL_SUBJECT,
  SHARE_LABEL,
  SHARE_NOTICE,
  SHARE_TARGETS,
  SHARE_TEXT,
} from "../../content/certificate";
import { FinePrint } from "./FinePrint";

export interface ShareRowProps {
  /** The certificate's own absolute URL. Built by the page, which is where the request's host is. */
  readonly url: string;
}

/**
 * Where each link goes.
 *
 * Written as functions of the URL rather than as templates with a placeholder,
 * so every parameter goes through `encodeURIComponent` and none is spliced. A
 * dedication is buyer text and reaches none of these — only the address does —
 * but the discipline is the same either way.
 */
function destinations(url: string): readonly (readonly [keyof typeof SHARE_TARGETS, string])[] {
  const text = encodeURIComponent(SHARE_TEXT);
  const address = encodeURIComponent(url);

  return [
    // `twitter.com/intent/tweet` is the endpoint X still serves and redirects;
    // `x.com/intent/post` is the current spelling. The current one is used, and
    // the guard's host list is where a change to it is noticed.
    ["x", `https://x.com/intent/post?text=${text}&url=${address}`],
    ["bluesky", `https://bsky.app/intent/compose?text=${text}%20${address}`],
    // `mailto:` reaches whatever the reader's own machine opens, which is no
    // third party at all.
    ["email", `mailto:?subject=${encodeURIComponent(SHARE_EMAIL_SUBJECT)}&body=${text}%0A%0A${address}`],
  ];
}

export function ShareRow({ url }: ShareRowProps) {
  return (
    <aside className="share-row" aria-labelledby="share-row-label">
      <h2 id="share-row-label" className="share-row-label">
        {SHARE_LABEL}
      </h2>
      <ul className="share-row-links">
        {destinations(url).map(([target, href]) => (
          <li key={target}>
            {/*
              `noopener` and `noreferrer` on every one. The first is the
              security rule; the second is this site's own posture -- a
              referrer would tell the service which certificate somebody came
              from, before they had decided to say so.
            */}
            <a href={href} rel="noopener noreferrer" target="_blank">
              {SHARE_TARGETS[target]}
            </a>
          </li>
        ))}
      </ul>
      <FinePrint>{SHARE_NOTICE}</FinePrint>
    </aside>
  );
}
