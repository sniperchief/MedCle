// How the customer answered MEDCLE's "Is that correct?". Deterministic
// patterns only: anything that is not clearly a yes is never taken as one.

export type ReplyKind =
  /** A clear yes, e.g. "Yes", "Yeah", "That's right". */
  | "affirmative"
  /** A no with nothing to change, e.g. "No", "That's wrong". */
  | "negative"
  /** A no with new details, e.g. "No, I said 20 tablets". */
  | "correction"
  /** Hedged, unrelated or unclear, e.g. "I think so", "Hmm", "Maybe". */
  | "ambiguous"
  /** Nothing was said. */
  | "empty";

// Each is a whole phrase; a yes must consist only of these and FILLERS.
const AFFIRMATIVES = [
  "yes",
  "yeah",
  "yep",
  "yup",
  "correct",
  "right",
  "exactly",
  "absolutely",
  "exactly right",
  "that is correct",
  "that is right",
  "that is exactly right",
  "that is it",
  "it is",
  "all correct",
];

// Politeness and hesitation sounds that don't change a yes.
const FILLERS = ["please", "thank you", "thanks", "um", "uh", "er", "oh"];

// Words that make an answer uncertain. They are checked after a leading no,
// so "No, I think it was 20" is still a correction.
const HEDGES =
  /\b(think|guess|maybe|probably|perhaps|possibly|suppose|believe|not sure|kind of|sort of|dunno|do not know|don't know|h+m+|m+h*m+)\b/;

// A reply starting with one of these is a no; whatever follows may correct the request.
const NEGATIVE_START =
  /^(?:no+|nope|nah|not quite|not really|not exactly|wrong|incorrect|actually|that is (?:not right|not correct|not it|wrong|incorrect)|it is (?:not|wrong)|(?:yes|yeah|yep) (?:but|except|actually))\b/;

// Words after a no that don't say what to change.
const NO_DETAILS = new Set([
  ...["no", "nope", "nah", "not", "that", "it", "is", "was", "the", "a", "i", "said", "say"],
  ...["meant", "mean", "sorry", "right", "wrong", "correct", "incorrect", "quite", "really"],
  ...["exactly", "actually", "so", "well", "please", "thanks", "thank", "you", "um", "uh", "er", "oh"],
]);

export function classifyReply(text: string): ReplyKind {
  const reply = normalize(text);
  if (!reply) return "empty";

  const negative = NEGATIVE_START.exec(reply);
  if (negative) {
    const rest = reply.slice(negative[0].length).split(" ");
    return rest.some((word) => word && !NO_DETAILS.has(word)) ? "correction" : "negative";
  }
  if (HEDGES.test(reply)) return "ambiguous";
  return isOnlyAffirmative(reply) ? "affirmative" : "ambiguous";
}

/** Lower case, words only, with "that's" → "that is" and "it's" → "it is". */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/\b(that|it)'s\b/g, "$1 is")
    .replace(/[^a-z0-9' ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Longest first, so "that is correct" is consumed before "that".
const PHRASES = [...AFFIRMATIVES, ...FILLERS].sort((a, b) => b.length - a.length);

/** Whether the reply is made only of yes-phrases and fillers, with at least one yes. */
function isOnlyAffirmative(reply: string): boolean {
  let rest = reply;
  let heardYes = false;
  while (rest) {
    const phrase = PHRASES.find((candidate) => rest === candidate || rest.startsWith(`${candidate} `));
    if (!phrase) return false;
    heardYes ||= AFFIRMATIVES.includes(phrase);
    rest = rest.slice(phrase.length).trimStart();
  }
  return heardYes;
}
