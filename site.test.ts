import assert from "node:assert/strict";
import test from "node:test";
import { buildWhatsappUrl } from "../lib/site.ts";

test("builds a wa.me link from a Moroccan mobile", () => {
  assert.equal(buildWhatsappUrl("0612345678"), "https://wa.me/212612345678");
  assert.equal(buildWhatsappUrl("+212 7 12 34 56 78", "سلام"), `https://wa.me/212712345678?text=${encodeURIComponent("سلام")}`);
});

test("hides WhatsApp when the number is missing or invalid", () => {
  assert.equal(buildWhatsappUrl(undefined), null);
  assert.equal(buildWhatsappUrl(""), null);
  assert.equal(buildWhatsappUrl("0512345678"), null);
});
