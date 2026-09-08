/**
 * When each message appears.
 *
 * B3 made the conversation a pure reducer so the whole of Baldrick's behaviour
 * is testable without a browser. This is the same argument one layer up:
 * *when* a message appears is logic, and logic living inside a component is
 * logic a test reaches through a rendering library or not at all. The widget in
 * B5b renders what this returns and owns no timing of its own.
 *
 * **The pause is the character.** A step's two messages arriving in the same
 * frame reads as a page, not a person; arriving after a beat reads as somebody
 * who had to be asked twice. That beat is the only animation Baldrick has, and
 * it is why this file exists rather than the delay being a magic number in an
 * effect.
 *
 * **Reduced motion is honoured here, and that is a correction rather than a
 * flourish.** `globals.css` flattens CSS animation and transition for anyone
 * who asks; it cannot reach a `setTimeout`. Without this file reading the
 * preference itself, a visitor who asked for no motion would still sit through
 * the full theatrical pause with nothing on screen — the worst version of the
 * effect, since the indicator they cannot see is the only thing explaining the
 * wait.
 *
 * **The schedule is separate from playing it**, which is what makes the timing
 * assertable. {@link schedule} is a pure function from lines to instants;
 * {@link play} is the only part that touches a clock, takes its timer as an
 * argument, and is about fifteen lines. A test can therefore assert the
 * schedule exactly and drive the player with a fake timer, without either
 * needing a DOM.
 */

import { conversationSeed } from "./pool";

/**
 * One thing the widget does, and the instant it does it.
 *
 * `at` is milliseconds from the start of the turn, not from the previous step,
 * because a schedule with absolute instants can be read as a whole — the worst
 * case is `steps.at(-1).at` rather than a sum a reader has to do in their head.
 */
export type PresentationStep =
  | { readonly at: number; readonly kind: "indicator" }
  | { readonly at: number; readonly kind: "message"; readonly line: string };

/**
 * The pause, in the shape the other limits in this repository use.
 *
 * **Provisional by design.** The plan says these are picked against the
 * rendered thing in B5b, the way C6 picked the certificate's spacing by
 * rendering it and looking, rather than guessed here. They are named and
 * exported so B5b retunes one object rather than hunting literals, and the
 * worst case they produce over the real script is asserted rather than left to
 * be discovered by a visitor sitting through it.
 */
export const BALDRICK_PAUSE = {
  /** Proportional to what he is about to say: a longer line took longer to find. */
  perCharacter: 16,
  /** Below this the beat is not read as a beat, only as lag. */
  minimum: 350,
  /** Above this it stops being character and becomes a broken page. */
  maximum: 1500,
  /**
   * How far the pause may vary either side, as a fraction.
   *
   * Drawn from a seed rather than `Math.random()`, for the same reason
   * `pool.ts` gives: LD-05's acceptance is a transcript, and a transcript that
   * cannot be replayed with its timing is a transcript of a different
   * conversation.
   */
  jitter: 0.25,
} as const;

/**
 * The instants at which a turn's messages appear.
 *
 * **Seeded from the lines themselves**, not from the conversation's utterances.
 * Two reasons, and the second is the one that decided it. Seeding from the
 * utterances would make a message's pause correlate with the draw that chose
 * it, since `respond` takes its lines from a generator over the same input —
 * the pause and the wording would move together for no reason anybody could
 * explain. And a transcript records what he said, so seeding from that means
 * the timing replays from the transcript alone, without the reader also
 * needing the exact keystrokes that produced it.
 *
 * **Reduced motion returns messages at zero and no indicator at all.** Not an
 * indicator that flashes on and off in the same tick: there is nothing to
 * indicate once the text is already there, and an aria-live region announcing
 * a pause that did not happen is noise.
 */
export function schedule(
  lines: readonly string[],
  { reducedMotion }: { readonly reducedMotion: boolean },
): PresentationStep[] {
  if (reducedMotion) return lines.map((line) => ({ at: 0, kind: "message", line }) as const);

  const next = conversationSeed(lines);
  const steps: PresentationStep[] = [];
  let at = 0;
  for (const line of lines) {
    steps.push({ at, kind: "indicator" });
    at += pauseFor(line, next());
    steps.push({ at, kind: "message", line });
  }
  return steps;
}

/**
 * How long he takes over one line.
 *
 * The jitter is applied before the clamp, so the maximum is a real ceiling
 * rather than a ceiling a quarter of conversations exceed.
 */
function pauseFor(line: string, drawn: number): number {
  const proportional = line.length * BALDRICK_PAUSE.perCharacter;
  const varied = proportional * (1 + (drawn * 2 - 1) * BALDRICK_PAUSE.jitter);
  return Math.round(Math.min(BALDRICK_PAUSE.maximum, Math.max(BALDRICK_PAUSE.minimum, varied)));
}

/** The last instant in a schedule: how long the whole turn takes. */
export function turnLength(steps: readonly PresentationStep[]): number {
  return steps.reduce((longest, step) => Math.max(longest, step.at), 0);
}

/**
 * Somewhere to run something later.
 *
 * Taken as an argument rather than reached for, so the player is driven by a
 * fake in a test and by `setTimeout` in a browser, and neither path is the
 * untested one.
 */
export type Timer = (run: () => void, after: number) => () => void;

export const realTimer: Timer = (run, after) => {
  const id = setTimeout(run, after);
  return () => clearTimeout(id);
};

/**
 * Play a schedule, and hand back the way to stop it.
 *
 * **Cancellation is not housekeeping.** A visitor who types again while
 * Baldrick is mid-reply must not get both turns interleaved, and a widget that
 * unmounts must not emit into a component that is gone. Both are the same
 * defect and both are closed by the returned function, which B5b calls from its
 * effect's teardown and before starting a new turn.
 *
 * Cancelling twice, or after everything has run, does nothing.
 */
export function play(
  steps: readonly PresentationStep[],
  emit: (step: PresentationStep) => void,
  timer: Timer = realTimer,
): () => void {
  const cancels = steps.map((step) => timer(() => emit(step), step.at));
  return () => {
    for (const cancel of cancels) cancel();
  };
}

/**
 * Whether the reader asked for no motion.
 *
 * **Unknown means no motion.** There is no `window` on the server, and no
 * `matchMedia` in an old enough browser or a test runner; in both cases this
 * says yes. The asymmetry is deliberate — guessing wrong towards stillness
 * costs a visitor a joke, and guessing wrong towards motion costs a visitor
 * who asked not to have it exactly the thing they asked not to have.
 *
 * Read at the moment a turn is presented rather than cached, so somebody who
 * changes the preference mid-session is answered by their next message. There
 * is no listener to leak and nothing to keep in step.
 */
export function prefersReducedMotion(): boolean {
  const media = typeof globalThis.window === "undefined" ? undefined : globalThis.window.matchMedia;
  if (typeof media !== "function") return true;
  return media.call(globalThis.window, "(prefers-reduced-motion: reduce)").matches;
}
