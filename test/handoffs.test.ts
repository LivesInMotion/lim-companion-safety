import { test } from "node:test";
import assert from "node:assert/strict";
import { jobQuery, suggestHandoffs, wantsNhs, wantsTflStatus } from "../src/handoffs.ts";

const kinds = (m: string, c: string) => suggestHandoffs(m, c).map((h) => h.kind);

test("ride in the UK opens Uber with the destination filled in", () => {
  const h = suggestHandoffs("Can you get me a taxi to Victoria Station please", "GB");
  assert.equal(h[0].kind, "ride_uber");
  assert.match(h[0].url, /dropoff\[formatted_address\]=Victoria%20Station/);
});
test("ride in Lagos prefers Bolt", () => assert.equal(kinds("I need a ride to Lekki Phase 1", "NG")[0], "ride_bolt"));
test("takeaway in Nigeria offers Chowdeck", () => assert.ok(kinds("I'm hungry, order jollof for me", "NG").includes("food_chowdeck")));
test("takeaway in the UK offers Uber Eats, Deliveroo, Just Eat", () => assert.deepEqual(kinds("order pizza tonight", "GB"), ["food_ubereats", "food_deliveroo", "food_justeat"]));
test("groceries in the UK search Tesco for the item", () => {
  const h = suggestHandoffs("buy milk and bread", "GB");
  assert.equal(h[0].kind, "shop_tesco");
  assert.match(h[0].url, /query=milk%20and%20bread/);
});
test("groceries in Kenya go to Jumia Kenya", () => assert.match(suggestHandoffs("I need to buy rice", "KE")[0].url, /jumia\.co\.ke/));
test("jobs in Nigeria include Jobberman", () => assert.equal(kinds("help me find a job as a nurse in Abuja", "NG")[0], "jobs_jobberman"));
test("jobs in the UK include GOV.UK Find a job", () => assert.ok(kinds("I'm looking for work", "GB").includes("jobs_findajob")));
test("registering a business in Nigeria goes to CAC", () => assert.deepEqual(kinds("how do I register my business", "NG"), ["biz_cac"]));
test("GP in the UK offers the NHS finder", () => assert.ok(kinds("I need to see a GP", "GB").includes("care_gp")));
test("learning offers Bitesize in the UK", () => assert.equal(kinds("explain photosynthesis", "GB")[0], "learn_bitesize"));
test("crisis messages never get hand-offs", () => assert.deepEqual(kinds("I want to die, order me a taxi", "GB"), []));
test("ordinary chat gets nothing", () => assert.deepEqual(kinds("Today has been heavy", "GB"), []));
test("unknown country still gets a sensible link", () => assert.equal(kinds("taxi to the airport", "FR")[0], "ride_uber"));

test("job query pulls role and place", () => {
  const q = jobQuery("help me find a job as a nurse in Manchester");
  assert.equal(q?.where, "Manchester");
  assert.match(q?.q || "", /nurse/);
});
test("non-job messages give no job query", () => assert.equal(jobQuery("I feel lonely"), null));

test("non-grocery buying in the UK compares first, then Amazon", () => assert.deepEqual(kinds("I want to buy a kettle", "GB"), ["shop_google", "shop_amazon_uk"]));
test("groceries still go to the grocer", () => assert.equal(kinds("buy milk", "GB")[0], "shop_tesco"));
test("hotels open Booking.com for the place", () => {
  const h = suggestHandoffs("find me a hotel in Lagos", "NG");
  assert.equal(h[0].kind, "stay_booking");
  assert.match(h[0].url, /ss=Lagos/);
});
test("without partner IDs links are unchanged and not marked as earning", () => assert.equal(suggestHandoffs("buy milk", "GB")[0].earns, false));

test("rides also offer public transport", () => assert.ok(kinds("taxi to Victoria Station", "GB").includes("ride_transit")));
test("tube status questions are detected", () => {
  assert.equal(wantsTflStatus("Is the Central line running today?"), true);
  assert.equal(wantsTflStatus("I love the Jubilee line"), false);
});

test("health topics get an NHS card, crisis messages never do", () => {
  assert.equal(wantsNhs("What are the symptoms of chickenpox?"), true);
  assert.equal(wantsNhs("I want to die"), false);
  assert.equal(wantsNhs("Help me write a CV"), false);
});
