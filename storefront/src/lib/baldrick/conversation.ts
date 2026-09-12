/**
 * The conversation, as a pure function.
 *
 * §8 asks for "predefined conversational flows" and "state", which is what
 * separates a character from an FAQ: a second turn can depend on the first.
 * This file is all of that behaviour, and it is deliberately not a component —
 * a state and an input go in, a state comes out, and the whole of Baldrick can
 * be driven by a test without a DOM. B5b's widget is only a way of showing
 * what this returns.
 *
 * **It holds no copy.** The lines live in `content/baldrick.ts` (B4) and reach
 * this file as a {@link Script}. That keeps two questions apart: what he says,
 * which a reviewer reads as prose, and when he says it, which is logic. It also
 * means these tests can drive the machinery with four made-up lines instead of
 * asserting against the real ones and breaking every time a word changes.
 *
 * **Nothing here is impure.** No clock, no `Math.random()`, no storage. The
 * seed comes from `pool.ts` and is derived from the conversation, so replaying
 * the same inputs replays the same conversation exactly — which is what makes
 * B7's acceptance, a transcript a human reads, worth anything.
 */

import { matchIntent, type BaldrickIntent } from "./intents";
import { conversationSeed, draw } from "./pool";

/**
 * One thing the visitor did.
 *
 * **A quick reply is an input, not a shortcut.** §8 lists "buttons/quick
 * replies" beside typed messages, and the temptation is to let a button jump
 * straight to a step while typing goes through matching. That would make the
 * button path untested by everything that tests the typed path, and would let
 * a button reach a step no sentence can — which a transcript could not then
 * reproduce. Both arrive here, both are recorded, both feed the seed.
 */
export type Utterance =
  | { readonly kind: "typed"; readonly text: string }
  | { readonly kind: "quick"; readonly id: string; readonly label: string };

/** A button Baldrick offers. `goes` names the step it leads to. */
export interface QuickReply {
  readonly id: string;
  readonly label: string;
  readonly goes: string;
}

/**
 * One thing Baldrick can be at.
 *
 * `say` is a list of pools, one per message: §8 asks for "multi-message
 * replies", and drawing separately per message is what stops a turn being one
 * paragraph pretending to be three.
 */
export interface Step {
  readonly say: ReadonlyArray<readonly string[]>;
  readonly quickReplies?: readonly QuickReply[];
}

/**
 * Every step, keyed by id.
 *
 * The ten intent names are steps, so a matched intent is looked up the same way
 * a quick reply's destination is. A flow is then just steps whose quick replies
 * point at further steps, with no separate flow machinery to keep in step with
 * the intent machinery.
 */
export type Script = Readonly<Record<string, Step>>;

export interface Message {
  readonly speaker: "visitor" | "baldrick";
  readonly lines: readonly string[];
}

export interface Conversation {
  /**
   * Exactly what fed the seed, in order: typed text verbatim, and quick-reply
   * ids. `pool.ts` explains why nothing is normalised on the way in.
   */
  readonly utterances: readonly string[];
  readonly transcript: readonly Message[];
  /**
   * Where the visitor is, or `null` wherever they are at no step: an empty
   * conversation, and whenever a flow was left. Only quick replies can be *at*
   * a step; a typed message is always matched afresh, which is what makes a
   * flow abandonable.
   *
   * `null` is not the same thing as "the beginning". A widget may open at a
   * step it wrote buttons for -- see {@link initialConversation} -- and this
   * one does.
   */
  readonly step: string | null;
}

export const EMPTY_CONVERSATION: Conversation = { utterances: [], transcript: [], step: null };

/**
 * The opening state: at a step, with nothing said yet.
 *
 * **Deliberately not {@link EMPTY_CONVERSATION}.** That one is `step: null`,
 * which is where a finished flow returns to and where a cold quick reply must
 * still reach `fallback`. A widget opening there can show no quick replies at
 * all, because `offered` has no step to read them from -- so a greeting that
 * declares two buttons renders none, and the copy is dead on arrival. Naming
 * the opening state here rather than spreading `EMPTY_CONVERSATION` at the call
 * site is what makes that a decision somebody can find.
 */
export function initialConversation(step: string): Conversation {
  return { ...EMPTY_CONVERSATION, step };
}

/**
 * What a step id means when the script has no such step.
 *
 * A quick reply pointing at a missing step is a copy defect, not a visitor
 * error, and `fallback` is the honest thing to say while it exists. It is not
 * silent: `unknownStep` reports it so B4's tests can assert the script is
 * closed under its own quick replies.
 */
export function unknownStep(script: Script): string[] {
  const targets = Object.values(script).flatMap((step) =>
    (step.quickReplies ?? []).map((reply) => reply.goes),
  );
  return [...new Set(targets)].filter((target) => !(target in script));
}

/**
 * The next state, given what the visitor just did.
 *
 * **A typed message always re-matches, which is how a flow is abandoned.**
 * Somebody who asks about refunds halfway through the gift flow gets an answer
 * about refunds. Insisting on finishing a flow is what makes a bot feel like a
 * form, and §8 asks for a character.
 *
 * **A quick reply goes where it says**, without matching. Its label is not
 * parsed — it is a button the script wrote, and treating its text as a typed
 * sentence would mean a copy change silently changing where a button leads.
 */
export function respond(state: Conversation, utterance: Utterance, script: Script): Conversation {
  const seedInput = utterance.kind === "typed" ? utterance.text : utterance.id;
  const utterances = [...state.utterances, seedInput];

  const visitorLine = utterance.kind === "typed" ? utterance.text : utterance.label;
  const target =
    utterance.kind === "quick" ? quickReplyTarget(state, utterance.id, script) : intentStep(utterance.text, script);

  const step = script[target] ?? script.fallback;
  const next = conversationSeed(utterances);
  const lines = step === undefined ? [] : step.say.map((pool) => draw(pool, next));

  return {
    utterances,
    transcript: [
      ...state.transcript,
      { speaker: "visitor", lines: [visitorLine] },
      { speaker: "baldrick", lines },
    ],
    // A step with no quick replies is the end of a flow, and leaves the
    // visitor at `null` rather than stranded at a step nothing leads out of.
    step: step?.quickReplies?.length ? (target in script ? target : null) : null,
  };
}

/** The step a typed message reaches: its intent, or `fallback` if the script has no such step. */
function intentStep(text: string, script: Script): BaldrickIntent | "fallback" {
  const intent = matchIntent(text);
  return intent in script ? intent : "fallback";
}

/**
 * Where a pressed button goes.
 *
 * **Resolved against the step the visitor is actually at**, not against the
 * whole script. That closes a real hole rather than an imagined one: a widget
 * showing a stale button — one from a step the conversation has moved past —
 * would otherwise post an id that resolves anyway, and the visitor would jump
 * to a step nothing on screen offered. An id the current step does not own
 * reaches `fallback`, which is Baldrick failing to follow, and is in character.
 */
function quickReplyTarget(state: Conversation, id: string, script: Script): string {
  if (state.step === null) return "fallback";
  const offer = script[state.step]?.quickReplies?.find((reply) => reply.id === id);
  return offer?.goes ?? "fallback";
}

/**
 * The quick replies on offer now.
 *
 * Read from the state rather than remembered by the caller, so a widget cannot
 * show a button the conversation has moved past — the defect where a stale
 * button posts an id the current step does not own.
 */
export function offered(state: Conversation, script: Script): readonly QuickReply[] {
  if (state.step === null) return [];
  return script[state.step]?.quickReplies ?? [];
}
