import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { classifyReply, type ReplyKind } from "./confirmation-reply.ts";

function expectKind(kind: ReplyKind, replies: string[]) {
  for (const reply of replies) assert.equal(classifyReply(reply), kind, `"${reply}"`);
}

describe("classifyReply", () => {
  test("clear yes → affirmative", () => {
    expectKind("affirmative", [
      "Yes",
      "Yes.",
      "yeah",
      "Yep!",
      "Yup",
      "Correct.",
      "That's correct.",
      "That’s right",
      "That is right.",
      "Exactly.",
      "Absolutely",
      "Yes, that's correct, thank you.",
      "Yes please.",
      "Um, yes.",
      "Yes it is.",
    ]);
  });

  test("a bare no → negative", () => {
    expectKind("negative", ["No", "No.", "Nope.", "No, that's wrong.", "That's not right.", "Not quite.", "Incorrect."]);
  });

  test("a no with new details → correction", () => {
    expectKind("correction", [
      "No, I said 20 tablets.",
      "No, 20 tablets.",
      "No, twenty tablets",
      "Nope, it's 250 milligrams.",
      "Actually, capsules.",
      "Not quite, I meant amoxicillin 250 mg.",
      "Yes, but 20 tablets.",
      "No, I think it was 20.",
    ]);
  });

  test("hedged or uncertain → ambiguous, never a yes", () => {
    expectKind("ambiguous", ["I think so.", "Hmm.", "Hmm, yes.", "Probably.", "Maybe", "Yes, I think so.", "I guess", "I'm not sure."]);
  });

  test("unrelated or unclear → ambiguous", () => {
    expectKind("ambiguous", [
      "Is that right?",
      "Thank you.",
      "Okay.",
      "It's for my mother.",
      "20 tablets",
      "Nothing else.",
      "Yes no",
    ]);
  });

  test("nothing said → empty", () => {
    expectKind("empty", ["", "   ", "…", "."]);
  });
});
