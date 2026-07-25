/**
 * Unit tests for Problem 1 `sum_to_n` implementations.
 *
 * Uses Node's built-in test runner (`node:test`) and assertions
 * (`node:assert/strict`) so there are zero external dependencies.
 *
 * Run with:  node --test   (Node 20+)
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { sum_to_n_a, sum_to_n_b, sum_to_n_c } from "./sum_to_n.js";

// Shared table of (input, expected) pairs covering the spec example, the
// boundary cases (0, 1), a couple of large values, and the documented
// negative-n convention (sum of n..-1).
const cases = [
  [5, 15], // spec example
  [0, 0], // empty sum
  [1, 1], // smallest positive
  [10, 55],
  [100, 5050], // large-ish
  [1000, 500500], // large
  [-1, -1],
  [-3, -6], // negative convention: (-3)+(-2)+(-1)
  [-100, -5050],
];

// Each implementation is exercised against the same table so behaviour is
// verified to be identical from the caller's point of view.
const implementations = [
  ["sum_to_n_a (iterative loop)", sum_to_n_a],
  ["sum_to_n_b (closed-form Gauss)", sum_to_n_b],
  ["sum_to_n_c (recursion)", sum_to_n_c],
];

for (const [name, fn] of implementations) {
  describe(name, () => {
    for (const [n, expected] of cases) {
      test(`sum_to_n(${n}) === ${expected}`, () => {
        assert.equal(fn(n), expected);
      });
    }
  });
}

describe("three-way agreement", () => {
  // Parametrized cross-check: every implementation must return an identical
  // result for each input across a contiguous range spanning negatives,
  // zero, and positives.
  for (let n = -50; n <= 50; n++) {
    test(`all three agree at n=${n}`, () => {
      const a = sum_to_n_a(n);
      const b = sum_to_n_b(n);
      const c = sum_to_n_c(n);
      assert.equal(a, b, `a and b disagree at n=${n}`);
      assert.equal(b, c, `b and c disagree at n=${n}`);
    });
  }
});
