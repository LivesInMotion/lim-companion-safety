import { test } from "node:test";
import assert from "node:assert/strict";
import { routeMessage } from "../src/lim-router.ts";

const cases: [string, string][] = [
  ["Help me write a strong CV", "elias"],
  ["I have a job interview tomorrow", "elias"],
  ["How do I start a small business selling food?", "elias"],
  ["Is this work from home offer a scam?", "elias"],
  ["I need a budget until payday", "leila"],
  ["How can I make my money last, rent is too high", "leila"],
  ["Cheapest way to do my food shop this week", "leila"],
  ["Explain photosynthesis for my biology exam", "miriama"],
  ["I have an idea for a project, help me plan it", "miriama"],
  ["Help me revise for my maths exam", "miriama"],
  ["I'm doing A-level chemistry and don't understand moles", "miriama"],
  ["WAEC past questions for physics", "miriama"],
  ["My landlord won't give my deposit back", "leila"],
  ["How do I apply for a work visa?", "adaora"],
  ["My laptop is very slow, can you help", "miriama"],
  ["I feel so lonely tonight", "adaora"],
  ["I'm stressed about my job and can't sleep", "adaora"],
  ["Today has been heavy", "adaora"],
  ["I want to kill myself", "adaora"],
  ["My partner beats me and I'm scared", "adaora"],
  ["hello", "adaora"],
  ["", "adaora"],
];

for (const [msg, want] of cases) {
  test(`routes "${msg}" to ${want}`, () => assert.equal(routeMessage(msg).who, want));
}

test("safety always wins over other topics", () => {
  const r = routeMessage("I lost my job and I want to end my life");
  assert.equal(r.who, "adaora");
  assert.equal(r.reason, "safety");
});

test("growing areas are flagged as needs", () => {
  assert.equal(routeMessage("How do I apply for a work visa?").need?.area, "immigration");
  assert.equal(routeMessage("My landlord won't give my deposit back").need?.area, "housing");
  assert.equal(routeMessage("Help me write a strong CV").need, undefined);
});
test("safety still wins inside a growing area", () => {
  assert.equal(routeMessage("I'm homeless and want to end my life").reason, "safety");
});

test("bills and airtime are counted as a need", () => {
  assert.equal(routeMessage("I want to buy airtime for my mum").need?.area, "bills");
  assert.equal(routeMessage("pay my DSTV").need?.area, "bills");
});
