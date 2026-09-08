/**
 * The pause, asserted as a schedule rather than watched.
 *
 * Everything here runs without a DOM and without a clock. That is the point of
 * splitting `schedule` from `play`: the timing is a value, so a test reads it
 * the way a reviewer would, and the one function that touches a timer takes the
 * timer as an argument.
 */

import { readFileSync } from "node:fs";

import { afterEach, describe, expect, it, vi } from "vitest";

import { BALDRICK_SCRIPT } from "../src/content/baldrick";
import {
  BALDRICK_PAUSE,
  play,
  prefersReducedMotion,
  schedule,
  turnLength,
  type PresentationStep,
  type Timer,
} from "../src/lib/baldrick/presenter";

const MOVING = { reducedMotion: false } as const;
const STILL = { reducedMotion: true } as const;
const LINES = ["There is no subscription.", "You buy the certificate once and it stays bought."];

/** A timer that records what it was asked to do and runs it only when told. */
function fakeTimer(): { timer: Timer; run: (after: number) => void; pending: () => number[] } {
  let queue: Array<{ after: number; run: () => void; cancelled: boolean }> = [];
  return {
    timer: (run, after) => {
      const entry = { after, run, cancelled: false };
      queue.push(entry);
      return () => {
        entry.cancelled = true;
      };
    },
    run: (after) => {
      for (const entry of queue) if (entry.after <= after && !entry.cancelled) entry.run();
      queue = queue.filter((entry) => entry.after > after);
    },
    pending: () => queue.filter((entry) => !entry.cancelled).map((entry) => entry.after),
  };
}

describe("the schedule", () => {
  it("shows the indicator before each message and the message after it", () => {
    const steps = schedule(LINES, MOVING);
    expect(steps.map((step) => step.kind)).toEqual(["indicator", "message", "indicator", "message"]);
    expect(steps.filter((step) => step.kind === "message").map((step) => step.line)).toEqual(LINES);
  });

  it("puts the first indicator at zero, so nothing waits before the wait starts", () => {
    // A visitor who has just pressed send must see something in the first
    // frame. An indicator that is itself delayed reads as a dead widget.
    expect(schedule(LINES, MOVING)[0]).toEqual({ at: 0, kind: "indicator" });
  });

  it("only moves forward", () => {
    const steps = schedule(LINES, MOVING);
    const instants = steps.map((step) => step.at);
    expect(instants).toEqual([...instants].sort((first, second) => first - second));
  });

  it("is proportional to the line, inside the jitter band, at every length", () => {
    // **The first draft of this compared one short line to one long one and
    // passed on a constant pause**, because the jitter alone made the two
    // differ and `toBeGreaterThan` cannot tell a rule from a coin. Found by
    // mutation, so the assertion is now the actual property: at every length,
    // the pause is the proportional value moved by at most the jitter, then
    // clamped. A constant fails it, a wrong exponent fails it, and jitter
    // applied after the clamp fails it.
    const clamp = (value: number) => Math.min(BALDRICK_PAUSE.maximum, Math.max(BALDRICK_PAUSE.minimum, value));
    for (let length = 0; length < 200; length += 1) {
      const pause = turnLength(schedule(["x".repeat(length)], MOVING));
      const ideal = length * BALDRICK_PAUSE.perCharacter;
      const low = clamp(Math.floor(ideal * (1 - BALDRICK_PAUSE.jitter)));
      const high = clamp(Math.ceil(ideal * (1 + BALDRICK_PAUSE.jitter)));
      expect(`${length}: ${String(pause >= low && pause <= high)}`).toBe(`${length}: true`);
    }
  });

  it("bottoms out at the minimum and tops out at the maximum", () => {
    // The clamp read plainly, so "proportional and capped" is two assertions
    // and not one clever one.
    expect(turnLength(schedule(["Go on."], MOVING))).toBe(BALDRICK_PAUSE.minimum);
    expect(turnLength(schedule(["x".repeat(400)], MOVING))).toBe(BALDRICK_PAUSE.maximum);
  });

  it("varies the pause, so two messages are not metronomic", () => {
    // Without the jitter, two lines of equal length would land on identical
    // pauses and the beat would read as a machine tick rather than a person.
    const steps = schedule(["aaaaaaaaaaaaaaaaaaaaaaaaa", "bbbbbbbbbbbbbbbbbbbbbbbbb"], MOVING);
    const first = steps[1]!.at;
    const second = steps[3]!.at - first;
    expect(first).not.toBe(second);
  });
});

describe("the same conversation, the same timing", () => {
  it("schedules identically for the same lines", () => {
    expect(schedule(LINES, MOVING)).toEqual(schedule(LINES, MOVING));
  });

  it("reads no clock and no global randomness", () => {
    // The same guard `conversation.ts` carries, and for the same reason: a
    // `Math.random()` here would make a reported transcript unreplayable and
    // the failure would present as flakiness. Comments are stripped first --
    // this file's header discusses both by name.
    const source = readSource();
    expect(source).not.toMatch(/Date\.now|new Date\(|Math\.random/);
    expect(source).toContain("export function schedule");
  });

  it("draws its pause from the words themselves, not from a fixed seed", () => {
    // **The first draft compared two lines of different lengths** and could not
    // fail: the schedules carry the lines, so they differ whatever the seed
    // does. Found by mutation. Equal-length lines isolate the seed — with a
    // constant one, every pause here would be identical. They are 50
    // characters because at 15 the clamp swallows the whole jitter band and
    // the test measures the minimum instead of the seed -- which is how it
    // first failed, on a correct file.
    //
    // Why this property at all: the seed comes from what he says, so a
    // transcript replays with its timing from the transcript alone, and the
    // pause does not move in lockstep with the draw that chose the wording.
    const pauses = ["a", "b", "c", "d"].map((character) => character.repeat(50)).map((line) =>
      turnLength(schedule([line], MOVING)),
    );
    expect(new Set(pauses).size).toBeGreaterThan(1);
  });
});

describe("when the reader asked for no motion", () => {
  it("puts every message at zero", () => {
    expect(schedule(LINES, STILL)).toEqual([
      { at: 0, kind: "message", line: LINES[0] },
      { at: 0, kind: "message", line: LINES[1] },
    ]);
  });

  it("shows no indicator at all", () => {
    // Not an indicator that flashes on and off within one tick. There is
    // nothing to indicate once the text is already there, and a live region
    // announcing a pause that did not happen is noise for the reader most
    // likely to be relying on it.
    expect(schedule(LINES, STILL).some((step) => step.kind === "indicator")).toBe(false);
  });

  it("still says everything, in order", () => {
    // The failure this forbids: collapsing the schedule by dropping messages
    // rather than by dropping the wait.
    expect(schedule(LINES, STILL).map((step) => (step.kind === "message" ? step.line : ""))).toEqual(LINES);
  });
});

describe("reading the preference", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("says yes when there is no window, which is the server and the test runner", () => {
    // `globals.css` cannot reach a `setTimeout`, so this function is the only
    // thing standing between a reader who asked for stillness and the full
    // pause. Where it cannot ask, it assumes they asked.
    expect(typeof globalThis.window).toBe("undefined");
    expect(prefersReducedMotion()).toBe(true);
  });

  it("says yes when the browser has no matchMedia", () => {
    vi.stubGlobal("window", {});
    expect(prefersReducedMotion()).toBe(true);
  });

  it("asks for the reduce query, and reports what it is told", () => {
    for (const matches of [true, false]) {
      const asked: string[] = [];
      vi.stubGlobal("window", {
        matchMedia: (query: string) => {
          asked.push(query);
          return { matches };
        },
      });
      expect(prefersReducedMotion()).toBe(matches);
      expect(asked).toEqual(["(prefers-reduced-motion: reduce)"]);
    }
  });
});

describe("playing a schedule", () => {
  it("emits each step at its own instant", () => {
    const { timer, run } = fakeTimer();
    const seen: PresentationStep[] = [];
    const steps = schedule(LINES, MOVING);
    play(steps, (step) => seen.push(step), timer);

    expect(seen).toEqual([]);
    run(0);
    expect(seen).toEqual([{ at: 0, kind: "indicator" }]);
    run(Number.MAX_SAFE_INTEGER);
    expect(seen).toEqual(steps);
  });

  it("stops when cancelled, so a second question does not interleave with the first", () => {
    // The real defect this closes: somebody types again while he is mid-reply.
    // Without cancellation both turns play at once and the transcript records
    // an exchange that never happened in that order.
    const { timer, run } = fakeTimer();
    const seen: PresentationStep[] = [];
    const cancel = play(schedule(LINES, MOVING), (step) => seen.push(step), timer);

    run(0);
    cancel();
    run(Number.MAX_SAFE_INTEGER);
    expect(seen).toEqual([{ at: 0, kind: "indicator" }]);
  });

  it("leaves nothing pending after cancellation, so an unmounted widget is not emitted into", () => {
    const { timer, pending } = fakeTimer();
    const cancel = play(schedule(LINES, MOVING), () => undefined, timer);
    expect(pending().length).toBeGreaterThan(0);
    cancel();
    expect(pending()).toEqual([]);
  });

  it("can be cancelled twice, and after everything has run", () => {
    const { timer, run } = fakeTimer();
    const cancel = play(schedule(LINES, MOVING), () => undefined, timer);
    run(Number.MAX_SAFE_INTEGER);
    expect(() => {
      cancel();
      cancel();
    }).not.toThrow();
  });

  it("emits nothing for an empty turn", () => {
    const seen: PresentationStep[] = [];
    const { timer, run } = fakeTimer();
    play(schedule([], MOVING), (step) => seen.push(step), timer);
    run(Number.MAX_SAFE_INTEGER);
    expect(seen).toEqual([]);
  });
});

describe("what the real script actually costs a visitor", () => {
  /**
   * The numbers are provisional and B5b retunes them against the rendered
   * widget. What is not provisional is that a visitor never sits waiting for
   * an answer that is already decided — so the worst case over the real script
   * is asserted here, where a change to a constant or a longer line in
   * `content/baldrick.ts` moves it into view.
   */
  const BUDGET = 3000;

  it("makes nobody wait more than three seconds for a whole turn", () => {
    for (const [id, step] of Object.entries(BALDRICK_SCRIPT)) {
      const worst = turnLength(schedule(step.say.map((pool) => longest(pool)), MOVING));
      expect(`${id}: ${String(worst <= BUDGET)}`).toBe(`${id}: true`);
    }
  });

  it("spends the budget exactly, so raising the cap or adding a message is a failure", () => {
    // **Measuring the script is not enough, and mutation showed why.** Tripling
    // `perCharacter` left this passing, because the clamp absorbed it — the cap
    // was doing its job. What the clamp cannot absorb is the cap itself moving,
    // or a step gaining a third message.
    //
    // So the structural bound is asserted instead of only the measured one:
    // longest step × the ceiling. Today that is two messages at 1500ms and it
    // lands on the budget precisely, which is worth seeing rather than
    // discovering. B5b may retune the constants against the rendered widget;
    // if it retunes them upward, this is the sentence it has to answer.
    const messages = Math.max(...Object.values(BALDRICK_SCRIPT).map((step) => step.say.length));
    expect(messages).toBe(2);
    expect(BALDRICK_PAUSE.maximum * messages).toBeLessThanOrEqual(BUDGET);
  });

  it("costs nothing at all when motion is off", () => {
    for (const [id, step] of Object.entries(BALDRICK_SCRIPT)) {
      expect(`${id}: ${turnLength(schedule(step.say.map((pool) => longest(pool)), STILL))}`).toBe(`${id}: 0`);
    }
  });
});

const longest = (pool: readonly string[]): string =>
  pool.reduce((widest, line) => (line.length > widest.length ? line : widest), "");

function readSource(): string {
  const source = readFileSync(new URL("../src/lib/baldrick/presenter.ts", import.meta.url), "utf8");
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}
