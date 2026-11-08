import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeMoroccanMobile } from "../lib/phone.ts";

test("accepts local and international Moroccan mobiles", () => {
  assert.equal(normalizeMoroccanMobile("0612345678"), "+212612345678");
  assert.equal(normalizeMoroccanMobile("07 12 34 56 78"), "+212712345678");
  assert.equal(normalizeMoroccanMobile("+212 6-12-34-56-78"), "+212612345678");
  assert.equal(normalizeMoroccanMobile("+212712345678"), "+212712345678");
});

test("accepts Arabic-Indic digits", () => {
  assert.equal(normalizeMoroccanMobile("٠٦١٢٣٤٥٦٧٨"), "+212612345678");
});

test("rejects landlines, wrong lengths and foreign numbers", () => {
  for (const value of ["0512345678", "061234567", "06123456789", "+33612345678", "+21261234567", "abc", "", "0012 612345678"]) {
    assert.equal(normalizeMoroccanMobile(value), null, value);
  }
});
