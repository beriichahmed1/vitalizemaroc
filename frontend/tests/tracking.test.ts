import assert from "node:assert/strict";
import { test } from "node:test";
import { apiErrorMessage, GENERIC_ERROR } from "../lib/errors.ts";
import { PLATFORM_EVENT_NAMES, snapParams } from "../lib/tracking/events.ts";

test("maps backend error codes to Arabic messages", () => {
  assert.match(apiErrorMessage("invalid_moroccan_mobile"), /06 أو 07/);
  assert.equal(apiErrorMessage("something_unknown"), GENERIC_ERROR);
});

test("maps validation errors by field", () => {
  assert.match(apiErrorMessage([{ loc: ["body", "customer", "phone"] }]), /رقم الهاتف/);
  assert.match(apiErrorMessage([{ loc: ["body", "customer", "name"] }]), /الاسم/);
});

test("purchase event names match backend/app/tracking/capi.py", () => {
  assert.equal(PLATFORM_EVENT_NAMES.meta.Purchase, "Purchase");
  assert.equal(PLATFORM_EVENT_NAMES.tiktok.Purchase, "CompletePayment");
  assert.equal(PLATFORM_EVENT_NAMES.snap.Purchase, "PURCHASE");
});

test("snap purchase uses the order id as transaction_id", () => {
  const params = snapParams({ items: [], value: 10, orderId: "order-1" }, "order-1", true);
  assert.equal(params.transaction_id, "order-1");
  assert.equal("client_dedup_id" in params, false);
  assert.equal("client_dedup_id" in snapParams({ items: [], value: 10 }, "evt", false), true);
});
