"use client";

/**
 * Baldrick, wired up.
 *
 * **The fifth client component here, and the first that exists because
 * somebody wanted it.** The other four are requirements: a checkbox the law
 * makes conditional, a payment element Stripe owns, and two error boundaries a
 * framework will not let be Server Components. B1 amended `brand.md` §6 to
 * allow this one, with the operator's decision recorded there and two bounds on
 * it — he is not rendered at all where scripting is off, and he gates nothing.
 *
 * **This file holds no copy, no timing and no conversation logic.** B3 owns the
 * reducer, B4 the lines, B5a the schedule, and `Surface.tsx` the markup. What
 * is left is the wiring, which is the part that cannot be tested without a
 * browser — so it is kept to about eighty lines and everything worth asserting
 * was pushed out of it.
 *
 * **Nothing is persisted.** No cookie, no `localStorage`, no `sessionStorage`,
 * no fetch. Reloading loses the conversation, which is the honest behaviour for
 * something the Privacy Policy describes as storing nothing;
 * `browser-storage-disclosure.test.ts` scans `src` recursively and is the proof
 * rather than this sentence.
 */

import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { BALDRICK_GREETING, BALDRICK_SCRIPT } from "../../content/baldrick";
import {
  EMPTY_CONVERSATION,
  offered,
  respond,
  type Conversation,
  type Message,
  type QuickReply,
  type Utterance,
} from "../../lib/baldrick/conversation";
import { conversationSeed, draw } from "../../lib/baldrick/pool";
import { play, prefersReducedMotion, schedule, type PresentationStep } from "../../lib/baldrick/presenter";
import { BALDRICK_LIMITS, Surface } from "./Surface";

/**
 * **A joke may not be allowed to unmount the shop.**
 *
 * Without this, a render-time exception anywhere in Baldrick propagates to
 * `app/error.tsx` and replaces the purchase order with `PROCESSING ERROR` — a
 * visitor loses the ability to buy anything because a chat widget threw. The
 * plan says deciding nothing is the only wrong answer here, and the decision is
 * that he disappears silently: he gates nothing, so a page without him is a
 * complete page, and an error notice in his place would draw attention to a
 * failure that costs the reader nothing.
 *
 * A class, because React has no function-component error boundary and the
 * storefront's runtime dependencies are few because each one was argued for.
 * `getDerivedStateFromError` alone: there is no logging here, since a component
 * that stores nothing and talks to no server has nothing worth reporting that
 * the browser console does not already have.
 */
class Boundary extends Component<{ readonly children: ReactNode }, { readonly failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** Baldrick, and the guarantee that he cannot take the page with him. */
export function Baldrick() {
  return (
    <Boundary>
      <BaldrickWidget />
    </Boundary>
  );
}

export function BaldrickWidget() {
  /**
   * **The mounted gate.** `null` on the server and on first paint, so a visitor
   * with scripting off gets no dead control — §6 says elsewhere that a control
   * which does nothing is a lie, and a chat box that cannot send is exactly
   * that. The cost is that he arrives after hydration, which is why B6 places
   * him where nothing above him moves when he does.
   */
  const [mounted, setMounted] = useState(false);
  const [conversation, setConversation] = useState<Conversation>(EMPTY_CONVERSATION);
  const [shown, setShown] = useState<readonly Message[]>([]);
  const [indicating, setIndicating] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const [value, setValue] = useState("");

  /** The current turn's stop, so a new question ends the old answer. */
  const cancel = useRef<(() => PresentationStep[]) | null>(null);

  /**
   * End the turn in flight.
   *
   * **`flush` is the whole of B7's Gate E finding.** Ten real turns driven
   * through a browser produced a transcript with three questions and no
   * answers under them — the next question had arrived while he was still
   * speaking, and stopping discarded the rest of his reply. A transcript is
   * this slice's only acceptance, and one where he appears to ignore people is
   * not one.
   *
   * The lines were chosen the instant the turn began; the delay is
   * presentation. So an interruption collapses the wait and keeps the words,
   * exactly as the reduced-motion path does. Unmounting passes `false`,
   * because there is nothing left to render into.
   */
  const stop = useCallback((flush: boolean) => {
    const remaining = cancel.current?.() ?? [];
    cancel.current = null;
    if (!flush) return;
    const lines = remaining.flatMap((step) => (step.kind === "message" ? [step.line] : []));
    if (lines.length === 0) return;
    setIndicating(false);
    setShown((before) => [...before, ...lines.map((line) => ({ speaker: "baldrick" as const, lines: [line] }))]);
  }, []);

  useEffect(() => {
    setMounted(true);
    setShown([{ speaker: "baldrick", lines: greeting() }]);
    return () => {
      // Unmounting mid-answer must not leave timers emitting into a component
      // that is gone -- and must not flush either, for the same reason.
      cancel.current?.();
    };
  }, []);

  const ask = useCallback(
    (utterance: Utterance) => {
      // Flushes rather than discards: see `stop`.
      stop(true);

      const next = respond(conversation, utterance, BALDRICK_SCRIPT);
      const said = next.transcript.at(-1);
      const asked = next.transcript.at(-2);
      if (said === undefined || asked === undefined) return;

      setConversation(next);
      setValue("");
      // The visitor's own message never waits. Only his answer is paced.
      setShown((before) => [...before, asked]);
      setPresenting(true);

      const steps = schedule(said.lines, { reducedMotion: prefersReducedMotion() });
      let remaining = steps.filter((step) => step.kind === "message").length;
      cancel.current = play(steps, (step) => {
        if (step.kind === "indicator") {
          setIndicating(true);
          return;
        }
        setIndicating(false);
        setShown((before) => [...before, { speaker: "baldrick", lines: [step.line] }]);
        remaining -= 1;
        if (remaining === 0) setPresenting(false);
      });

      // A turn with nothing to say would otherwise leave the quick replies
      // hidden for good. `draw` throws on an empty pool and B4 asserts none
      // exists, so this is a belt on a brace rather than a live path.
      if (steps.length === 0) setPresenting(false);
    },
    [conversation, stop],
  );

  if (!mounted) return null;

  return (
    <Surface
      indicating={indicating}
      messages={shown}
      onChange={(typed) => setValue(typed.slice(0, BALDRICK_LIMITS.utterance))}
      onQuickReply={(reply: QuickReply) => ask({ kind: "quick", id: reply.id, label: reply.label })}
      onSubmit={() => {
        // **An empty submit does nothing.** No message, no turn, no fallback.
        // Answering an empty box with "I did not understand that" would be the
        // widget blaming a visitor for pressing Enter.
        const text = value.trim();
        if (text.length === 0) return;
        ask({ kind: "typed", text });
      }}
      // Hidden while he is still answering. A button belonging to a step he has
      // not finished reaching is a button that resolves against the wrong step,
      // which B3 made safe and this makes invisible.
      replies={presenting ? [] : offered(conversation, BALDRICK_SCRIPT)}
      value={value}
    />
  );
}

/**
 * His opening lines.
 *
 * Drawn once at mount rather than held as a constant, because the greeting is a
 * pool like any other and `respond` is the wrong tool for it: nobody asked.
 */
function greeting(): string[] {
  const step = BALDRICK_SCRIPT[BALDRICK_GREETING];
  if (step === undefined) return [];
  const next = conversationSeed([]);
  return step.say.map((pool) => draw(pool, next));
}
