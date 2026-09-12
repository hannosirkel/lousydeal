/**
 * What Baldrick looks like, with no state of its own.
 *
 * **Split from the shell so it can be rendered and looked at.** The storefront
 * Vitest project is `environment: node` and the shell returns `null` until an
 * effect has run, so a test rendering the shell would assert against an empty
 * string — and every accessibility claim in this row would be a source grep
 * instead of a fact about markup. Everything here takes props, renders
 * identically on a server, and is asserted by `renderToStaticMarkup`.
 *
 * **It is a document, not a bubble.** §6: no card, no radius, no shadow, no
 * avatar. A speaker label and text, in the same ruled register as the ledger
 * rows and the tier table. The one piece of decoration is the block cursor
 * already in `globals.css`, reused rather than reinvented.
 *
 * **He names documents and does not link them.** That is a decision this row
 * takes and not an omission: the conversation lives in React state, so
 * navigating away ends it, and a visitor who followed a link Baldrick gave them
 * would lose the exchange that produced it. Telling them where a document is
 * and leaving them to go when they are finished costs nothing, is in character
 * for somebody who cannot be bothered to fetch it, and is asserted below.
 */

import { BALDRICK_DISCLAIMER, BALDRICK_PAUSE_LABEL } from "../../content/baldrick";
import type { Message, QuickReply } from "../../lib/baldrick/conversation";

/** How much a visitor may type at him. In the shape `DEAL_GIFT_LIMITS` uses. */
export const BALDRICK_LIMITS = {
  /**
   * Long enough for a real question and short enough that the transcript stays
   * a transcript. Nothing downstream stores it, so this is not a database
   * bound — it is the point past which a message is not a question.
   */
  utterance: 200,
} as const;

export const BALDRICK_HEADING = "Sales assistance";
export const BALDRICK_INPUT_LABEL = "Ask Baldrick something";
export const BALDRICK_SEND_LABEL = "Ask";

export interface SurfaceProps {
  readonly elementRef?: import("react").Ref<HTMLElement>;
  readonly messages: readonly Message[];
  /** Whether he is between the question and the answer. */
  readonly indicating: boolean;
  /** Empty while he is still answering: a button for a step he has not reached yet is a trap. */
  readonly replies: readonly QuickReply[];
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onSubmit: () => void;
  readonly onQuickReply: (reply: QuickReply) => void;
}

export function Surface({
  elementRef,
  messages,
  indicating,
  replies,
  value,
  onChange,
  onSubmit,
  onQuickReply,
}: SurfaceProps) {
  return (
    <section ref={elementRef} className="baldrick" aria-labelledby="baldrick-heading">
      <h2 className="baldrick-heading" id="baldrick-heading">
        {BALDRICK_HEADING}
      </h2>

      {/*
        **Polite, and additions only.** A message arriving is announced without
        interrupting whatever the reader is doing, and only the new message is
        read.

        `aria-atomic` is deliberately absent, which means `false`. Setting it to
        `true` is the classic defect this row exists to avoid: the region would
        be re-read from the top every time a child is added, so a four-message
        exchange would be announced ten times and the last message would arrive
        last in a queue nobody asked for.
      */}
      <ol className="baldrick-transcript" aria-live="polite" aria-relevant="additions">
        {messages.map((message, index) => (
          <li className="baldrick-message" data-speaker={message.speaker} key={index}>
            {/*
              **The label names a turn, not a message.** A step says two things,
              which arrive as two messages, and labelling both put "BALDRICK"
              twice over two consecutive lines — found by rendering the thing
              and looking at it rather than by any assertion here. It reads as
              two people with one name, and a screen reader says the name twice
              for one answer.
            */}
            {index > 0 && messages[index - 1]?.speaker === message.speaker ? null : (
              <span className="baldrick-speaker">{message.speaker === "baldrick" ? "Baldrick" : "You"}</span>
            )}
            {message.lines.map((line, line_index) => (
              <span className="baldrick-line" key={line_index}>
                {line}
              </span>
            ))}
          </li>
        ))}
        {indicating ? (
          <li className="baldrick-message" data-speaker="baldrick">
            {messages.at(-1)?.speaker === "baldrick" ? null : <span className="baldrick-speaker">Baldrick</span>}
            {/*
              The cursor is decoration and carries the label in text, because
              a blinking block announces nothing. B4 settled what that text
              says: not "typing", since nobody is, and telling a reader who
              cannot see it that a person is at the other end is the one claim
              the disclaimer under this input exists to prevent.
            */}
            <span className="baldrick-line">
              <span aria-hidden="true" className="cursor" />
              <span className="visually-hidden">{BALDRICK_PAUSE_LABEL}</span>
            </span>
          </li>
        ) : null}
      </ol>

      {replies.length === 0 ? null : (
        <ul className="baldrick-replies">
          {replies.map((reply) => (
            <li key={reply.id}>
              {/*
                A real button, so it is in the tab order and answers to both
                Enter and Space without this file knowing that it does.
              */}
              <button className="button is-secondary" onClick={() => onQuickReply(reply)} type="button">
                {reply.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/*
        A form, so Enter submits. `onSubmit` on the form rather than a click
        handler on the button is what makes the keyboard path and the pointer
        path the same path.
      */}
      <form
        className="baldrick-ask"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <label className="visually-hidden" htmlFor="baldrick-input">
          {BALDRICK_INPUT_LABEL}
        </label>
        {/*
          `autoFocus` is deliberately absent. He is not the reason anybody came
          to this page, and taking the caret on mount would move it out of
          whatever a visitor was doing.
        */}
        <input
          autoComplete="off"
          id="baldrick-input"
          maxLength={BALDRICK_LIMITS.utterance}
          name="utterance"
          onChange={(event) => onChange(event.target.value)}
          type="text"
          value={value}
        />
        <button className="button is-secondary" type="submit">
          {BALDRICK_SEND_LABEL}
        </button>
      </form>

      {/*
        Constraint 8, and the reason this slice needs no privacy amendment. It
        is under the input always, not waiting for an intent to match: somebody
        typing "my certificate never arrived" must not walk away believing they
        have reported it.
      */}
      <p className="baldrick-disclaimer">{BALDRICK_DISCLAIMER}</p>
    </section>
  );
}
