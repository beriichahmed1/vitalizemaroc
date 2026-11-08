import assert from "node:assert/strict";
import { test } from "node:test";
import { formatMad, savingsVsSingles, tierTotal } from "../lib/pricing.ts";
import { products } from "../lib/catalog.ts";

const EXPECTED: Record<string, number[]> = {
  "vitality-gummies": [280, 499, 690, 970, 1189, 1380],
  "immunity-shield": [240, 440, 620, 860, 1060, 1240],
  "endurance-power": [350, 640, 690, 1040, 1330, 1380],
};

test("tier totals match the approved price table for quantities 1-6", () => {
  for (const product of products) {
    const actual = [1, 2, 3, 4, 5, 6].map((quantity) => tierTotal(product.tiers, quantity));
    assert.deepEqual(actual, EXPECTED[product.sku], product.sku);
  }
});

test("single-unit tier equals the catalog unit price", () => {
  for (const product of products) assert.equal(product.tiers[0], product.unitPrice);
});

test("savings are measured against buying single units", () => {
  const endurance = products.find((product) => product.sku === "endurance-power")!;
  assert.equal(savingsVsSingles(endurance.unitPrice, endurance.tiers, 3), 360);
  assert.equal(savingsVsSingles(endurance.unitPrice, endurance.tiers, 1), 0);
});

test("invalid quantities are rejected", () => {
  assert.throws(() => tierTotal(products[0].tiers, 0));
  assert.throws(() => tierTotal(products[0].tiers, 1.5));
});

test("formatMad groups thousands", () => {
  assert.equal(formatMad(1380), "1 380 درهم");
  assert.equal(formatMad(280), "280 درهم");
});
