/**
 * The widget: the markup a reader gets, and the wiring a test cannot render.
 *
 * **Accessibility is asserted against rendered HTML, not against source.** That
 * is the whole reason `Surface.tsx` was split out of `Baldrick.tsx`: the shell
 * returns `null` until an effect has run, and the storefront Vitest project is
 * `environment: node`, so rendering the shell yields an empty string. A row
 * that claimed a live region and proved it with a grep for `aria-live` would be
 * asserting that a string appears in a file.
 *
 * What genuinely cannot be reached from here is the wiring — hooks, timers, a
 * click. Those claims are read off the source and each one says so.
 */

import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Baldrick } from "../src/components/baldrick/Baldrick";
import {
  BALDRICK_HEADING,
  BALDRICK_INPUT_LABEL,
  BALDRICK_LIMITS,
  Surface,
  type SurfaceProps,
} from "../src/components/baldrick/Surface";
import { BALDRICK_DISCLAIMER, BALDRICK_PAUSE_LABEL, BALDRICK_SCRIPT } from "../src/content/baldrick";
import type { Message } from "../src/lib/baldrick/conversation";

const shell = readFileSync(new URL("../src/components/baldrick/Baldrick.tsx", import.meta.url), "utf8");
const surface = readFileSync(new URL("../src/components/baldrick/Surface.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

/** Comments stripped, so a guard matches code and not the paragraph explaining it. */
const code = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\/.*$/gm, "");

const MESSAGES: readonly Message[] = [
  { speaker: "baldrick", lines: ["I am Baldrick. I am here about the certificate."] },
  { speaker: "visitor", lines: ["is there a discount"] },
  { speaker: "baldrick", lines: ["There is a discount code."] },
];

const render = (props: Partial<SurfaceProps> = {}): string =>
  renderToStaticMarkup(
    createElement(Surface, {
      messages: MESSAGES,
      indicating: false,
      replies: BALDRICK_SCRIPT.discount?.quickReplies ?? [],
      value: "",
      onChange: () => undefined,
      onSubmit: () => undefined,
      onQuickReply: () => undefined,
      ...props,
    }),
  );

describe("the transcript, for somebody who cannot see it", () => {
  it("is a polite live region", () => {
    // A message arriving is announced without interrupting whatever the reader
    // is doing. `assertive` would cut across their own typing.
    expect(render()).toContain('aria-live="polite"');
  });

  it("announces additions only, and is not atomic", () => {
    // **The classic defect this row exists to avoid.** `aria-atomic="true"`
    // makes the region re-read from the top every time a child is added, so a
    // four-message exchange is announced ten times and the newest line arrives
    // last in a queue nobody asked for. Absent means false, and absent is what
    // is asserted -- an explicit `false` would pass this too, and both are
    // correct.
    const html = render();
    expect(html).toContain('aria-relevant="additions"');
    expect(html).not.toContain('aria-atomic="true"');
  });

  it("names the region, so it is not an unlabelled landmark", () => {
    const html = render();
    expect(html).toContain('aria-labelledby="baldrick-heading"');
    expect(html).toContain(BALDRICK_HEADING);
  });

  it("labels the input, visibly hidden rather than removed", () => {
    // `visually-hidden` is in the accessibility tree; `display: none` is not.
    const html = render();
    expect(html).toContain(BALDRICK_INPUT_LABEL);
    expect(html).toMatch(/<label class="visually-hidden" for="baldrick-input">/);
  });

  it("takes no focus on arrival", () => {
    // He is not why anybody came to this page. `autoFocus` would move the caret
    // out of whatever a visitor was doing, and he mounts after hydration --
    // which is to say, while they are already reading.
    expect(render()).not.toContain("autofocus");
    expect(code(shell) + code(surface)).not.toMatch(/\.focus\(\)|autoFocus/);
  });
});

describe("the pause indicator", () => {
  it("says something, because a blinking block announces nothing", () => {
    const html = render({ indicating: true });
    expect(html).toContain(BALDRICK_PAUSE_LABEL);
    expect(html).toContain('<span aria-hidden="true" class="cursor">');
  });

  it("does not tell anybody a person is typing", () => {
    // B4 settled the wording and this is where it matters: the disclaimer under
    // the input exists to stop a visitor believing a person is at the other
    // end, and an indicator reading "Baldrick is typing" would say the opposite
    // to the reader least able to check.
    expect(render({ indicating: true })).not.toMatch(/typing/i);
  });

  it("is absent when he is not pausing", () => {
    expect(render({ indicating: false })).not.toContain(BALDRICK_PAUSE_LABEL);
  });

  it("does not re-announce his name when he was already the one talking", () => {
    const html = render({ messages: MESSAGES.slice(0, 1), indicating: true, replies: [] });
    expect(html.match(/baldrick-speaker/g) ?? []).toHaveLength(1);
  });
});

describe("the speaker label, which names a turn and not a message", () => {
  /**
   * **Found by rendering it and looking, not by an assertion.** A step says two
   * things, which arrive as two messages, and every message carrying a label
   * put "BALDRICK" twice over two consecutive lines. It reads as two people
   * with one name, and a screen reader says the name twice for one answer.
   */
  it("labels a run of messages from one speaker once", () => {
    // Three of his messages, one of theirs, in the order MESSAGES has them:
    // baldrick, visitor, baldrick. Three messages, three runs -- but the two
    // consecutive ones in the fuller fixture below collapse to one.
    const runs = render({
      messages: [
        { speaker: "baldrick", lines: ["first"] },
        { speaker: "baldrick", lines: ["second"] },
        { speaker: "visitor", lines: ["mine"] },
        { speaker: "baldrick", lines: ["third"] },
      ],
      replies: [],
    });
    expect(runs.match(/baldrick-speaker/g) ?? []).toHaveLength(3);
    expect(runs).toContain(">You</span>");
  });

  it("still labels every change of speaker", () => {
    // The failure the fix could introduce: suppressing the label everywhere and
    // leaving a transcript nobody can attribute.
    const html = render();
    expect(html.match(/baldrick-speaker/g) ?? []).toHaveLength(MESSAGES.length);
  });
});

describe("the controls, from a keyboard", () => {
  it("makes every quick reply a real button", () => {
    // Real buttons are in the tab order and answer to Enter and Space without
    // this component knowing that they do. A div with an onClick is the defect.
    const html = render();
    for (const reply of BALDRICK_SCRIPT.discount?.quickReplies ?? []) {
      expect(html).toContain(`>${reply.label}</button>`);
    }
  });

  it("hangs no click handler on anything that is not a control", () => {
    expect(code(surface)).not.toMatch(/<(?:div|span|li|p)[^>]*onClick/);
  });

  it("submits through a form, so Enter and the button are one path", () => {
    expect(render()).toContain("<form");
    expect(code(surface)).toContain('type="submit"');
    expect(code(surface)).toContain("onSubmit");
  });

  it("shows no quick replies when the step offers none", () => {
    expect(render({ replies: [] })).not.toContain("baldrick-replies");
  });
});

describe("a document, not a bubble", () => {
  const block = css.slice(css.indexOf("---- Baldrick ----"));

  it("has the section it styles", () => {
    // Guards that slice a stylesheet are guards that can silently address
    // nothing.
    expect(block.length).toBeGreaterThan(200);
    expect(block).toContain(".baldrick-transcript");
  });

  it("carries no card, no radius, no shadow", () => {
    // §6. Two columns of opposed rounded bubbles is the thing this is not.
    expect(block).not.toMatch(/border-radius|box-shadow/);
  });

  it("distinguishes the speakers without colour", () => {
    // Indentation and a label, so the transcript survives being printed and
    // reads for somebody who cannot tell two greys apart.
    expect(block).toContain('.baldrick-message[data-speaker="visitor"]');
    expect(render()).toContain('data-speaker="visitor"');
  });

  it("reuses the cursor already in the stylesheet rather than a second animation", () => {
    // `brand.md` §6 was amended by B1 to allow a second animation; it is not
    // needed, because the blinking block is already here and already has its
    // `prefers-reduced-motion` exception.
    expect(block).not.toContain("@keyframes");
    expect(css).toContain("@keyframes cursor-blink");
  });

  it("stacks the ask at a narrow width", () => {
    expect(block).toMatch(/@media \(width < 480px\)/);
  });
});

describe("the standing disclaimer", () => {
  it("is rendered always, not on an intent", () => {
    // Constraint 8. Somebody typing "my certificate never arrived" must not
    // walk away believing they have reported it, and they will not have asked
    // the right question first.
    for (const indicating of [true, false]) {
      expect(render({ indicating, messages: [], replies: [] })).toContain(BALDRICK_DISCLAIMER);
    }
  });
});

describe("the shell, which is the part no test can render", () => {
  it("renders nothing before an effect has run", () => {
    // **The mounted gate, asserted rather than described.** This is exactly
    // what a visitor with scripting off receives: not a disabled input, not a
    // dead button. `brand.md` says a control which does nothing is a lie, and a
    // chat box that cannot send is one.
    expect(renderToStaticMarkup(createElement(Baldrick))).toBe("");
  });

  it("ends the turn in flight on unmount and before a new one, differently", () => {
    // Two halves of one defect -- timers emitting into a component that is
    // gone, and a second question interleaving with the first answer -- with
    // **different right answers**, which is B7's Gate E finding.
    //
    // Unmounting discards: nothing is left to render into. A new turn flushes:
    // the lines were chosen when the turn began, so throwing them away leaves
    // a question in the transcript with no answer under it. Gate E produced
    // exactly that, three times in ten turns.
    expect(code(shell)).toMatch(/return \(\) => \{\s*cancel\.current\?\.\(\);\s*\};/);
    expect(code(shell)).toMatch(/\(utterance: Utterance\) => \{\s*stop\(true\);/);
  });

  it("flushes the unplayed lines rather than dropping them", () => {
    // The property, not just the call: what `stop` hands back must reach the
    // transcript.
    expect(code(shell)).toMatch(/const remaining = cancel\.current\?\.\(\) \?\? \[\];/);
    expect(code(shell)).toMatch(/remaining\.flatMap\(\(step\) => \(step\.kind === "message" \? \[step\.line\] : \[\]\)\)/);
    expect(code(shell)).toMatch(/setShown\(\(before\) => \[\.\.\.before, \.\.\.lines\.map/);
  });

  it("ignores an empty submit instead of answering it", () => {
    // Answering an empty box with the fallback would be the widget blaming a
    // visitor for pressing Enter.
    expect(code(shell)).toMatch(/if \(text\.length === 0\) return;/);
  });

  it("bounds what can be typed, in the shape the other limits use", () => {
    expect(BALDRICK_LIMITS).toEqual({ utterance: 200 });
    // Both halves: the attribute a browser enforces, and the slice for anything
    // that arrives without one. Matched case-insensitively -- React 19 emits
    // `maxLength` where earlier versions lowercased it, and HTML does not care.
    expect(render()).toMatch(/maxlength="200"/i);
    expect(code(shell)).toContain("slice(0, BALDRICK_LIMITS.utterance)");
  });

  it("hides the quick replies until he has finished answering", () => {
    expect(code(shell)).toContain("presenting ? [] : offered(conversation, BALDRICK_SCRIPT)");
  });

  it("reads the motion preference at the moment it schedules", () => {
    // The B5a correction, wired. `globals.css` cannot reach a `setTimeout`, so
    // a shell that scheduled without asking would leave a reader who requested
    // stillness sitting through the full pause.
    expect(code(shell)).toContain("schedule(said.lines, { reducedMotion: prefersReducedMotion() })");
  });
});

describe("a joke may not unmount the shop", () => {
  it("wraps him in a boundary that drops him silently", () => {
    // Without this, a render-time exception here reaches `app/error.tsx` and
    // replaces the purchase order with PROCESSING ERROR -- a visitor loses the
    // ability to buy anything because a chat widget threw. He gates nothing, so
    // a page without him is a complete page.
    expect(code(shell)).toContain("getDerivedStateFromError");
    expect(code(shell)).toMatch(/failed \? null : this\.props\.children/);
    expect(code(shell)).toMatch(/<Boundary>\s*<BaldrickWidget \/>\s*<\/Boundary>/);
  });
});

describe("nothing is persisted, and nothing leaves the page", () => {
  it("is covered by the storage scan rather than exempt from it", () => {
    // `browser-storage-disclosure.test.ts` reads `src` recursively, so these
    // files are already in its scope. Asserted here because "already covered"
    // is the assumption that guard's own docstring records being wrong about
    // twice.
    const guard = readFileSync(new URL("./browser-storage-disclosure.test.ts", import.meta.url), "utf8");
    expect(guard).toContain('readdirSync(srcDir, { recursive: true');
  });

  it("stores nothing and asks nothing of a server", () => {
    const both = code(shell) + code(surface);
    expect(both).not.toMatch(/localStorage|sessionStorage|document\.cookie|fetch\(|XMLHttpRequest/);
  });

  it("links nowhere, so following his advice does not end the conversation", () => {
    // **The navigation decision, taken rather than left implied.** The
    // conversation is React state; leaving the page ends it. Rather than
    // warning about that, he names documents and does not link them -- which is
    // in character for somebody who cannot be bothered to fetch one, and means
    // there is nothing in the transcript to click away on.
    expect(render()).not.toContain("<a ");
    expect(code(surface)).not.toMatch(/<a\b|<Link\b|href=/);
  });
});
