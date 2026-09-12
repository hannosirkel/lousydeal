/**
 * The conversation reducer: state, flows, and quick replies.
 *
 * **Driven with a made-up script**, not with `content/baldrick.ts`. What is
 * under test is when he says something, not what — asserting against the real
 * lines would break this file every time B4 changes a word, and would tell us
 * nothing about the machinery. The real script gets its own guards in B4.
 */

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  EMPTY_CONVERSATION,
  initialConversation,
  offered,
  respond,
  unknownStep,
  type Conversation,
  type Script,
} from "../src/lib/baldrick/conversation";

/**
 * Two intents, one two-step flow, and a fallback. Single-line pools so an
 * assertion names a line rather than a draw — the draw is `pool.ts`'s subject.
 */
const SCRIPT: Script = {
  gift: {
    say: [["gift-1"], ["gift-2"]],
    quickReplies: [
      { id: "gift-go-on", label: "Go on", goes: "gift_how" },
      { id: "gift-no", label: "No thank you", goes: "gift_dropped" },
    ],
  },
  gift_how: { say: [["gift-how-1"]], quickReplies: [{ id: "gift-done", label: "Fine", goes: "gift_end" }] },
  gift_end: { say: [["gift-end-1"]] },
  gift_dropped: { say: [["gift-dropped-1"]] },
  refund: { say: [["refund-1"]] },
  fallback: { say: [["fallback-1"]] },
};

const typed = (text: string) => ({ kind: "typed", text }) as const;
const quick = (id: string, label: string) => ({ kind: "quick", id, label }) as const;
const said = (state: Conversation): string[] =>
  state.transcript.filter((m) => m.speaker === "baldrick").flatMap((m) => m.lines);

describe("a single turn", () => {
  it("answers the intent it matched, in as many messages as the step has", () => {
    // §8 asks for multi-message replies. Two pools mean two messages, not one
    // paragraph pretending to be two.
    const state = respond(EMPTY_CONVERSATION, typed("can I send one as a gift"), SCRIPT);
    expect(said(state)).toEqual(["gift-1", "gift-2"]);
  });

  it("records what the visitor said, and what he said back", () => {
    const state = respond(EMPTY_CONVERSATION, typed("I want a refund"), SCRIPT);
    expect(state.transcript.map((m) => m.speaker)).toEqual(["visitor", "baldrick"]);
    expect(state.transcript[0]?.lines).toEqual(["I want a refund"]);
  });

  it("falls back for an intent the script has no step for", () => {
    // The script is allowed to be smaller than the intent list while it is
    // being written. A missing step is a copy gap, and the fallback is the
    // honest thing to say while it exists.
    expect(said(respond(EMPTY_CONVERSATION, typed("do you have an enterprise plan"), SCRIPT))).toEqual([
      "fallback-1",
    ]);
  });
});

describe("state, which is what makes it a conversation", () => {
  it("starts at a step when it is opened at one, and its buttons work from there", () => {
    // **The state a widget actually opens in.** `EMPTY_CONVERSATION` is not it:
    // `offered` reads the step, so a conversation opened at `null` can display
    // no quick reply, and a button that is never displayed cannot be pressed
    // -- the greeting's two were unreachable rather than mishandled.
    const opening = initialConversation("gift");
    expect(offered(opening, SCRIPT).map((r) => r.id)).toEqual(["gift-go-on", "gift-no"]);

    // The other half, and the one with no coverage before: the press resolves
    // against the opening step like any other, rather than through `fallback`.
    const pressed = respond(opening, quick("gift-go-on", "Go on"), SCRIPT);
    expect(said(pressed)).toEqual(["gift-how-1"]);
    expect(pressed.step).toBe("gift_how");
  });

  it("offers the step's quick replies, and only while it is at that step", () => {
    const asked = respond(EMPTY_CONVERSATION, typed("a gift please"), SCRIPT);
    expect(offered(asked, SCRIPT).map((r) => r.id)).toEqual(["gift-go-on", "gift-no"]);

    const ended = respond(asked, quick("gift-no", "No thank you"), SCRIPT);
    expect(offered(ended, SCRIPT)).toEqual([]);
  });

  it("lets a second turn depend on the first", () => {
    // The property that separates a character from an FAQ: the same button id
    // means nothing while the conversation is at no step, and something after
    // the gift step. `EMPTY_CONVERSATION` is still reached in earnest -- every
    // flow that ends returns to it -- which is why this stays keyed on it even
    // though the widget now opens at the greeting instead.
    const cold = respond(EMPTY_CONVERSATION, quick("gift-go-on", "Go on"), SCRIPT);
    expect(said(cold)).toEqual(["fallback-1"]);

    const warm = respond(respond(EMPTY_CONVERSATION, typed("gift"), SCRIPT), quick("gift-go-on", "Go on"), SCRIPT);
    expect(said(warm).at(-1)).toBe("gift-how-1");
  });

  it("walks a flow to its end and lets go of it", () => {
    let state = respond(EMPTY_CONVERSATION, typed("gift"), SCRIPT);
    state = respond(state, quick("gift-go-on", "Go on"), SCRIPT);
    state = respond(state, quick("gift-done", "Fine"), SCRIPT);

    expect(said(state).at(-1)).toBe("gift-end-1");
    // A step with no quick replies ends the flow rather than stranding the
    // visitor somewhere nothing leads out of.
    expect(state.step).toBeNull();
    expect(offered(state, SCRIPT)).toEqual([]);
  });
});

describe("abandoning a flow", () => {
  it("answers the new question instead of insisting on the old one", () => {
    // Insisting on finishing a flow is what makes a bot feel like a form. §8
    // asks for a character.
    const inFlow = respond(EMPTY_CONVERSATION, typed("gift"), SCRIPT);
    const left = respond(inFlow, typed("actually I want a refund"), SCRIPT);

    expect(said(left).at(-1)).toBe("refund-1");
    expect(left.step).toBeNull();
  });

  it("keeps the whole transcript when a flow is left", () => {
    const inFlow = respond(EMPTY_CONVERSATION, typed("gift"), SCRIPT);
    const left = respond(inFlow, typed("refund"), SCRIPT);
    expect(left.transcript).toHaveLength(4);
    expect(said(left)).toEqual(["gift-1", "gift-2", "refund-1"]);
  });
});

describe("quick replies are inputs, not shortcuts", () => {
  it("records a button press in the transcript, as the visitor speaking", () => {
    // A button that left no trace would make the transcript a partial record,
    // and B7's acceptance is a transcript.
    const state = respond(respond(EMPTY_CONVERSATION, typed("gift"), SCRIPT), quick("gift-go-on", "Go on"), SCRIPT);
    expect(state.transcript.filter((m) => m.speaker === "visitor").at(-1)?.lines).toEqual(["Go on"]);
  });

  it("feeds the seed with the button's id, not its label", () => {
    // The label is copy and will change; the id is the decision. Seeding on the
    // label would mean a reworded button silently changing which lines a
    // conversation draws, and a transcript from before the change would no
    // longer replay.
    const state = respond(respond(EMPTY_CONVERSATION, typed("gift"), SCRIPT), quick("gift-go-on", "Go on"), SCRIPT);
    expect(state.utterances).toEqual(["gift", "gift-go-on"]);
  });

  it("refuses a button the current step does not offer", () => {
    // The stale-button hole: a widget still showing a button from a step the
    // conversation has moved past. Resolving against the whole script would let
    // it jump somewhere nothing on screen offered.
    const atGift = respond(EMPTY_CONVERSATION, typed("gift"), SCRIPT);
    const stale = respond(atGift, quick("gift-done", "Fine"), SCRIPT);
    expect(said(stale).at(-1)).toBe("fallback-1");
  });

  it("does not parse a button's label as a sentence", () => {
    // A button labelled with a word that matches another intent must still go
    // where the script says. Otherwise a copy change moves a button.
    const atGift = respond(EMPTY_CONVERSATION, typed("gift"), SCRIPT);
    const pressed = respond(atGift, quick("gift-go-on", "I want a refund"), SCRIPT);
    expect(said(pressed).at(-1)).toBe("gift-how-1");
  });
});

describe("purity, which is what makes a transcript worth having", () => {
  it("replays identically", () => {
    const play = () => {
      let state = respond(EMPTY_CONVERSATION, typed("gift"), SCRIPT);
      state = respond(state, quick("gift-go-on", "Go on"), SCRIPT);
      return respond(state, typed("refund"), SCRIPT);
    };
    expect(play()).toEqual(play());
  });

  it("does not mutate the state it was given", () => {
    const before = respond(EMPTY_CONVERSATION, typed("gift"), SCRIPT);
    const snapshot = JSON.parse(JSON.stringify(before)) as Conversation;
    respond(before, typed("refund"), SCRIPT);
    expect(before).toEqual(snapshot);
  });

  it("reads no clock and no global randomness", () => {
    // Asserted against the source: a `Date.now()` or `Math.random()` here would
    // make a transcript unreplayable, and the failure would look like flakiness
    // rather than a defect.
    //
    // **Comments are stripped first.** The file's own header says it uses
    // neither, and a guard that read its own explanation would fail on a
    // correct file -- the same false positive that has now caught three tests
    // in this repository, each matching prose where it meant to match code.
    const source = readFileSync(new URL("../src/lib/baldrick/conversation.ts", import.meta.url), "utf8");
    const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(code).not.toMatch(/Date\.now|new Date\(|Math\.random/);
    // And the stripping itself is checked, so a broken regex cannot make this
    // pass by deleting the whole file.
    expect(code).toContain("export function respond");
  });
});

describe("the script's own integrity", () => {
  it("reports a quick reply pointing at a step that does not exist", () => {
    // B4 uses this to assert the real script is closed under its own buttons.
    expect(unknownStep(SCRIPT)).toEqual([]);
    expect(
      unknownStep({
        ...SCRIPT,
        refund: { say: [["refund-1"]], quickReplies: [{ id: "x", label: "x", goes: "nowhere" }] },
      }),
    ).toEqual(["nowhere"]);
  });
});
