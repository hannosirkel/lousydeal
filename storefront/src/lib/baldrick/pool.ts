/**
 * Choosing a line, the same way twice.
 *
 * §8 asks for "deterministic/randomized response pools", which sounds like a
 * contradiction and is not: the pool is varied, the choice is reproducible.
 * `Math.random()` would give the variety and lose the reproducibility, and this
 * slice cannot afford that — LD-05's acceptance is a transcript a human reads,
 * and a transcript nobody can replay is an anecdote.
 *
 * **What feeds the seed, exactly.** The visitor's typed messages and the ids of
 * quick replies they pressed, in order, and nothing else. Not Baldrick's own
 * replies: those are derived from the seed, so feeding them back would make the
 * seed depend on itself.
 *
 * **Nothing is normalised on the way in.** `intents.ts` lower-cases and
 * collapses whitespace for matching; this does not. Reproducing a reported
 * conversation needs the exact characters that were typed, so the hash takes
 * them exactly and the transcript records them exactly. The two files
 * disagreeing about normalisation is the point rather than an oversight.
 *
 * **The consequence, stated rather than discovered.** Every visitor whose
 * conversation begins the same way gets the same lines, for as long as it
 * stays the same — variety arrives only when conversations diverge, and most
 * begin with a greeting. That is on character: §8 asks for "completely
 * predictable", and an assistant who cannot be bothered to vary his greeting
 * is exactly the one `brand.md` describes.
 *
 * Both functions are written out rather than imported. They are a dozen lines
 * between them, and the storefront's six runtime dependencies are six because
 * each one was argued for.
 */

/**
 * FNV-1a, 32-bit.
 *
 * Chosen because it is short enough to read, has no dependency, and is stable
 * across runtimes — which matters, because a seed that differed between Node
 * and a browser would make a test agree with itself and disagree with
 * production. Not a cryptographic hash and not used as one: nothing here is a
 * secret, and an attacker who predicts which pre-written line they get has
 * predicted a pre-written line.
 */
export function hashUtterances(utterances: readonly string[]): number {
  // The separator matters: without it, ["ab", "c"] and ["a", "bc"] hash alike,
  // and two different conversations would share a seed. A NUL is chosen
  // because it cannot appear in a typed message.
  //
  // Written as an escape and not as a literal: a literal NUL in the source
  // makes git treat this file as binary, which costs the diff every reviewer
  // would otherwise read. Caught by `git diff --stat` reporting `Bin`.
  const joined = utterances.join("\u0000");
  let hash = 0x811c9dc5;
  for (let index = 0; index < joined.length; index += 1) {
    hash ^= joined.charCodeAt(index);
    // The FNV prime, as a shift-and-add so the intermediate stays in 32 bits.
    hash = (hash + ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) >>> 0;
  }
  return hash >>> 0;
}

/**
 * mulberry32: a seeded generator, in five lines.
 *
 * Returns a function rather than a number so a single turn can draw more than
 * once — one line from a pool of openings and another from a pool of
 * sign-offs — without the two draws colliding or needing a second seed.
 */
export function generator(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let drawn = Math.imul(state ^ (state >>> 15), 1 | state);
    drawn = (drawn + Math.imul(drawn ^ (drawn >>> 7), 61 | drawn)) ^ drawn;
    return ((drawn ^ (drawn >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * One line from a pool.
 *
 * Throws on an empty pool rather than returning `undefined`. A pool with
 * nothing in it is a copy defect — B4 wrote an intent and gave it no words —
 * and the honest failure is loud at the first draw rather than a blank message
 * that looks like Baldrick declining to speak.
 */
export function draw<T>(pool: readonly T[], next: () => number): T {
  if (pool.length === 0) throw new Error("Baldrick was asked to say something from an empty pool");
  const chosen = pool[Math.floor(next() * pool.length)];
  // `Math.floor` of a value in [0, 1) cannot reach `pool.length`, but a
  // generator that ever returned exactly 1 would index past the end and hand a
  // reader `undefined`. The guard costs nothing and the alternative is a blank
  // message nobody can explain.
  return chosen ?? pool[pool.length - 1]!;
}

/**
 * The seed for a conversation, from what the visitor put into it.
 *
 * Named rather than inlined so that "what feeds the seed" is one function a
 * reader can find, and so a test can assert the answer instead of inferring it
 * from a call site.
 */
export function conversationSeed(utterances: readonly string[]): () => number {
  return generator(hashUtterances(utterances));
}
