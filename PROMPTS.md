# Prompts used

AI tool: Claude Code (Claude Sonnet 5.5).

The prompts below are paraphrased and shortened from the real conversation, in the
order they happened. Each one led to a change or a decision in the project.

## 1. Initial build

> Build this technical challenge using best practices; explain it to me and show everything
> you do. *(Full challenge statement: full-stack calculator, React frontend + Go REST
> microservice, basic + optional operations, validation, unit tests, README, optional Dockerfile.)*

Result: backend, frontend, tests, README and Dockerfile.

## 2. Understanding the code

> Explain all the code to me, file by file, and show how the pieces connect.

Result: walkthrough of the backend, the frontend and the infrastructure files.

## 3. Readability of the domain code

> In `calculator.go`, use more descriptive variable names.
> Is the unary/binary split really needed? It looks too complicated.

Result: parameters renamed (`firstOperand`, `secondOperand`) and the operation tables
replaced by a single `switch`. `IsUnary` was removed because only its own test used it.

## 4. Reviewing the tests

> Explain what the handler tests and the calculator tests do, in depth.

Result: a detailed explanation of the table-driven tests. While reviewing the simplified
`Calculate`, I noticed that `sqrt` skipped the final finite-result check. It was fixed and
tests for `NaN` and `Inf` were added.

## 5. Edge cases

> Help me with edge-case tests: what happens with an unknown operation and no second operand?

Result: a new test that fixes the order of the checks (`unknown_operation` before
`missing_operand`), verified by breaking the order on purpose and seeing the test fail.

## 6. Scope and structure

> Are there too many files? Is this structure fine from a best-practices point of view?
> Compare the project with the challenge statement and tell me what is extra and what is missing.

Result: the structure was kept. Logging and `/healthz` were judged extras, then kept by
choice. The comparison showed that the coverage report and this file are real deliverables.

## 7. Coverage

> What does coverage do? Is it really necessary? Where can I see the result?

Result: an explanation of what coverage measures and what it does not prove, plus how to
open the HTML reports. Coverage was removed, then restored once it turned out to be a
deliverable of the challenge.

## 8. Docker

> Help me with Docker: how do I install it from the terminal and how do I run it?

Result: install steps for macOS, an explanation of the multi-stage `Dockerfile`, and a
build-and-run check of the final image (API, UI and `/healthz` answered from one container).
