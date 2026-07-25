# Problem 1 — `sum_to_n`

Three unique implementations of a function that returns the summation to `n`,
e.g. `sum_to_n(5) === 1 + 2 + 3 + 4 + 5 === 15`.

## Problem statement

> Provide 3 unique implementations of the following function.
>
> **Input**: `n` — any integer. _Assuming this input will always produce a
> result lesser than `Number.MAX_SAFE_INTEGER`._
>
> **Output**: `return` — summation to `n`, i.e.
> `sum_to_n(5) === 1 + 2 + 3 + 4 + 5 === 15`.

The module (`sum_to_n.js`) is a side-effect-free ES module that exports all
three functions (`sum_to_n_a`, `sum_to_n_b`, `sum_to_n_c`), so it can be
imported cleanly from tests or other code.

## The three approaches

| Fn           | Approach                     | Time   | Space        |
| ------------ | ---------------------------- | ------ | ------------ |
| `sum_to_n_a` | Iterative `for` loop         | `O(n)` | `O(1)`       |
| `sum_to_n_b` | Closed-form Gauss formula    | `O(1)` | `O(1)`       |
| `sum_to_n_c` | Recursion (functional style) | `O(n)` | `O(n)` stack |

### a) Iterative loop

Accumulates a running total, walking `1..n` for positive `n` or `n..-1` for
negative `n`.

### b) Closed-form (Gauss)

Uses the triangular-number identity. Important detail: the bare
`n*(n+1)/2` does **not** satisfy the negative convention — for `n = -3` it
returns `3`, not `-6`. The sum of `n..-1` for `n < 0` equals the triangular
number of `|n|`, negated. The implementation therefore uses the sign-aware
closed form:

```
sign(n) * |n| * (|n| + 1) / 2
```

which gives `15` for `n=5`, `0` for `n=0`, and `-6` for `n=-3`, all in constant
time.

### c) Recursion

Peels one term off toward `0` per call: `f(n) = n + f(n ∓ 1)`. Clear and
functional, but uses `O(n)` call-stack space (so very large `|n|` can overflow
the stack — a trade-off documented here for completeness).

## Negative-`n` assumption

Since `n` may be any integer, the three implementations agree on the following
consistent behaviour:

| `n`  | result | meaning                            |
| ---- | ------ | ---------------------------------- |
| `5`  | `15`   | sum of `1..5`                      |
| `0`  | `0`    | empty sum                          |
| `-3` | `-6`   | sum of `-3, -2, -1` (i.e. `n..-1`) |

## Run the demo

```bash
node sum_to_n.js
# or
npm start
```

A clean run prints `all checks passed`. The file contains `console.assert`
sanity checks (behind an `import.meta` main-module guard) that stay silent on
success and log a message on failure.

## How to run tests

Tests use Node's built-in test runner (`node:test`) and assertions
(`node:assert/strict`) — **no dependencies to install**. Requires **Node 20+**.

```bash
node --test
# or
npm test
```

The suite (`sum_to_n.test.js`) covers:

- the spec example (`sum_to_n(5) === 15`), zero, and one;
- large values (`n=100 → 5050`, `n=1000 → 500500`);
- negatives (`-1`, `-3`, `-100`) per the convention above;
- a parametrized **three-way-agreement** check asserting all three
  implementations return identical results for every `n` in `-50..50`.
