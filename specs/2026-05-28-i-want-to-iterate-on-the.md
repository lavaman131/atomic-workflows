---
title: "High-Value PR/Branch Validation Workflow"
status: Approved
intended_path: "specs/2026-05-28-i-want-to-iterate-on-the.md"
research_artifact: "research/docs/2026-05-28-i-want-to-iterate-on-the.md"
---

# High-Value PR/Branch Validation Workflow

## Metadata / Status

- **Status:** Approved
- **Research source:** `research/docs/2026-05-28-i-want-to-iterate-on-the.md`
- **Scope:** Replace the current behavior of `issue-test-lab` with a practical PR/branch validation workflow for real-world software engineers.
- **Review gate:** Human-in-the-loop review required before implementation.

## Summary

The current `issue-test-lab` workflow is an issue-oriented testing analysis workflow. It has useful building blocks — target inference, repository detection, risk-based test selection, safe validation execution, and final reporting — but it does not currently behave like a concrete merge-readiness gate.

This spec proposes replacing the current behavior with an evidence-based PR/branch validation workflow that answers:

> “Is this change safe to merge, based on the repository evidence available?”

The workflow should inspect the target diff, affected files, existing test commands, CI/test framework signals, coverage gaps, and UI validation paths where available. It should produce a concise Markdown report plus compact structured metadata including a normalized recommendation:

- `pass`
- `warn`
- `block`
- `unknown`

The first iteration should not split into separate frontend-only and backend-only workflows. Instead, it should infer affected areas and choose relevant validation strategies, including frontend/UI validation when the repository provides enough evidence.

The workflow remains analysis/reporting-only: it should validate, explain, and recommend; it should not edit code, generate tests, remediate failures, mutate repository state, or post PR comments.

## Goals

1. **Make testing workflow output actionable for real developers**
   - Provide a clear merge recommendation.
   - Explain what evidence was used.
   - Identify risks and next steps.

2. **Shift from issue-oriented testing analysis to PR/branch validation**
   - Support PR numbers/URLs, branches, commit ranges, current diffs, paths, or full-repo scope.
   - Use affected files and target diff as first-class inputs.

3. **Use repository evidence**
   - Detect package managers, scripts, CI config, test frameworks, test files, coverage commands, and UI/e2e tooling.
   - Prefer existing project commands over invented commands.

4. **Run only safe, high-signal validation commands**
   - Preserve the current safe-command posture from `issue-test-lab`.
   - Avoid destructive commands, dependency installation surprises, and long-running commands unless explicitly justified.

5. **Produce a normalized recommendation**
   - Return a compact machine-readable field in addition to the saved Markdown report.
   - Follow the precedent from `security-gate`, which parses a final decision line into returned metadata.

6. **Report validation gaps clearly**
   - Distinguish “tests passed” from “no relevant tests found.”
   - Surface skipped validation, environment blockers, missing coverage, and unavailable UI paths.

## Non-Goals

1. **No code implementation in this spec**
   - This document defines behavior and design only.

2. **No generated tests or product fixes**
   - The workflow validates and reports.
   - It should not edit application code, add tests, or fix failures.

3. **No frontend/backend split as the first design move**
   - The workflow should infer affected areas instead of requiring separate frontend/backend workflows initially.
   - A future specialization can be considered if evidence shows the generic workflow is too broad.

4. **No requirement to run every available test**
   - The workflow should prioritize relevant, high-signal validation based on changed files and repo evidence.

5. **No unconditional Playwright execution**
   - UI validation should be used when the repo exposes Playwright/Cypress/e2e configuration or runnable scripts.
   - If no UI path exists, the report should explain the gap.

6. **No dependence on unavailable external services**
   - Optional `gh` CLI or CI evidence may be used when available, but the workflow should still operate from local git state.

7. **No automatic PR comments or remote mutations**
   - The workflow may draft human-readable output, but it should not post comments, push commits, update PR state, or call write APIs.

## Current State

The research artifact identifies `workflows/issue-test-lab/index.ts` as the workflow directly in scope.

Existing useful capabilities:

- Target and diff inference guidance exists in `workflows/issue-test-lab/index.ts:22-28`.
- Test framework and CI discovery exists in `workflows/issue-test-lab/index.ts:68-72`.
- Risk-based test selection exists in `workflows/issue-test-lab/index.ts:75-80`.
- Safe validation execution exists in `workflows/issue-test-lab/index.ts:89-94`.
- Final reporting with gaps, actions, and confidence exists in `workflows/issue-test-lab/index.ts:96-100`.

Current limitations:

- Public input is issue-first: required `issue`, optional `target`.
- The workflow is framed around testing an issue, not validating merge readiness.
- There is no normalized `pass | warn | block | unknown` recommendation.
- The workflow does not currently expose a structured recommendation in returned metadata.
- The local repository has no discovered test scripts, lockfile, CI config, Playwright config, Cypress config, Jest/Vitest config, or local automated test files according to `research/docs/2026-05-28-i-want-to-iterate-on-the.md`.

Relevant sibling patterns:

- `review-board` already has a broader target model for PR number/URL, branch, commit range, current diff, path, or repo scope at `workflows/review-board/index.ts:25-31`.
- `security-gate` has the strongest existing decision-output precedent with decision labels and parsing at `workflows/security-gate/index.ts:20-32` and returned metadata at `workflows/security-gate/index.ts:135-153`.

## Proposed Solution

Replace the current `issue-test-lab` behavior with an evidence-based validation workflow that evaluates a target change and produces:

1. A saved Markdown validation report.
2. Hidden intermediate artifacts.
3. Compact returned metadata including:
   - `recommendation`
   - `reportPath`
   - `artifactManifestPath`
   - `targetSummary`
   - `riskLevel`
   - `validationSummary`

For the first implementation, keep the discoverable workflow name `issue-test-lab` to minimize package/discovery churn, but update the behavior and README framing so the workflow is clearly a PR/branch validation gate rather than an issue test-planning lab. A future rename can be considered after review and usage feedback.

The workflow should answer:

> “Based on the changed files, available tests, executed validation, and observed gaps, should this change be merged?”

### Recommendation Vocabulary

The final report must begin with an exact machine-readable recommendation line:

`Recommendation: pass`

Allowed values:

- `pass`
  - The target was resolved.
  - Relevant validation passed, or the change is low-risk and does not require runnable validation, such as documentation-only changes.
  - No relevant validation command failed.
  - No material unresolved merge risk was found.
  - Known gaps are minor and clearly disclosed.

- `warn`
  - The target was resolved and some useful evidence was collected.
  - No blocking failure was found, but meaningful gaps or moderate risks remain.
  - Examples: partial test coverage, skipped UI validation, relevant tests unavailable, no coverage signal for a changed area, or non-critical flaky/limited evidence.

- `block`
  - A material failure or high-risk unresolved issue should prevent merge.
  - Examples: relevant tests failed, build/typecheck failed, a migration or critical path change has no viable validation, or the workflow finds evidence that tests were deleted/weakened without compensating validation.

- `unknown`
  - The workflow cannot make a reliable merge recommendation.
  - Examples: target cannot be resolved, repo shape cannot be detected, environment cannot run basic discovery commands, no meaningful evidence is available, or command results are too ambiguous to interpret.

This should align with the `security-gate` pattern, while using the vocabulary desired by the testing workflow.

## Detailed Design

### Inputs

Use a target-first input model while preserving compatibility with the current issue-first workflow.

Preferred public inputs:

- `target`
  - Optional string.
  - Accepts PR number/URL, branch, commit range, path, current diff, or omitted for current repository state.
  - If omitted, the workflow should inspect the current branch, working tree, and local diff.

- `focus`
  - Optional natural-language validation focus.
  - Examples: “validate checkout UI changes,” “focus on backend API regression risk,” or “confirm migration safety.”

Compatibility input:

- `issue`
  - Optional deprecated alias for `focus`.
  - If both `issue` and `focus` are provided, `focus` should be treated as the primary user intent and `issue` should be included as additional context.

This resolves the current issue-first limitation while avoiding an immediate breaking input removal.

### Workflow Stages

#### Stage A: Target Intake

Purpose:

- Resolve the validation target.
- Identify whether the target is a PR, branch, commit range, current diff, path, or whole repo.
- Capture available git evidence.

Evidence to collect:

- Current branch.
- Git status.
- Diff summary.
- Changed files.
- Commit range, if available.
- Optional PR metadata if `gh` CLI is available and safe to use.

Resolution policy:

- Prefer local git evidence.
- Use `gh` CLI only when it is already available and can provide read-only PR metadata.
- Do not require external services for the workflow to run.
- If the target cannot be resolved reliably, continue only far enough to produce an `unknown` report with the target-resolution evidence.

Output artifact:

- `A-target-intake.md`

#### Stage B: Repository Detection

Purpose:

- Detect project shape and available validation surfaces.

Evidence to collect:

- Package manager files.
- `package.json` scripts.
- CI configuration.
- Test framework configs.
- Test files.
- Coverage configuration or coverage scripts.
- Playwright/Cypress/e2e configuration.
- Backend framework indicators.
- Frontend framework indicators.
- Monorepo/package layout.

Output artifact:

- `B-repo-detection.md`

Research references:

- Current repo detection stage: `workflows/issue-test-lab/index.ts:68-73`.
- Research artifact: `research/docs/2026-05-28-i-want-to-iterate-on-the.md`.

#### Stage C: Affected-Area and Risk Analysis

Purpose:

- Map changed files to likely affected areas and validation needs.

Classifications:

- Frontend/UI
- Backend/API
- Data/persistence
- Auth/security-sensitive
- Build/tooling
- Tests only
- Documentation only
- Workflow/CI
- Unknown/mixed

Risk signals:

- Critical path changes.
- Files without nearby tests.
- Config or dependency changes.
- Public API changes.
- Test deletion or weakening.
- Large diff size.
- Missing runnable validation path.

Output artifact:

- `C-risk-analysis.md`

#### Stage D: Validation Plan

Purpose:

- Select high-signal validation commands based on repository evidence.

Plan should include:

- Commands to run.
- Why each command is relevant.
- Expected signal.
- Safety assessment.
- Commands skipped and why.
- Fallbacks if primary commands are unavailable.

Command selection rules:

1. Prefer existing repository scripts.
2. Prefer targeted tests over full suites when reliable.
3. Run lint/typecheck/build only when scripts exist and are relevant.
4. Use UI/e2e commands only when config/scripts/dev-server path are discoverable.
5. Do not use `npx` to install missing tools implicitly unless explicitly allowed by workflow policy.
6. Do not run broad full-suite commands by default when a targeted, reliable command exists.
7. Broad full-suite commands may be selected only when they are the safest available signal, appear bounded enough for local execution, and are justified in the plan.

Output artifact:

- `D-validation-plan.md`

Research references:

- Safe command policy: `workflows/issue-test-lab/index.ts:55`.
- Playwright CLI capabilities from research: `research/docs/2026-05-28-i-want-to-iterate-on-the.md`.

#### Stage E: Validation Execution

Purpose:

- Execute feasible, safe validation commands.
- Capture command, exit status, output summary, and interpretation.

Execution report must distinguish:

- Passed command.
- Failed command.
- Skipped command.
- Not runnable because dependencies/config are missing.
- Not attempted because unsafe or too ambiguous.

Execution policy:

- Run only commands selected in Stage D.
- Prefer commands already defined by the repository.
- Avoid implicit package installation.
- Stop early only when a blocking failure makes later commands redundant or unsafe.
- Preserve enough command output to support the recommendation without overwhelming the final report.

Output artifact:

- `E-validation-execution.md`

Research reference:

- Current validation execution stage: `workflows/issue-test-lab/index.ts:89-94`.

#### Stage F: Coverage and Gap Analysis

Purpose:

- Assess whether validation meaningfully covers the change.

Signals:

- Existing coverage command output, if available.
- Static source-to-test proximity.
- Changed files with matching tests.
- Affected area with no runnable tests.
- UI path without e2e coverage.
- Backend/API path without integration coverage.
- CI unavailable locally.

Coverage policy:

- Prefer explicit repository coverage commands when available.
- Use static source-to-test mapping as a weaker signal, not as proof of coverage.
- Treat “no relevant tests found” as a gap, not as success.
- For UI-facing changes without a runnable app/dev-server path, recommend `warn` when other meaningful validation exists and `unknown` when no meaningful validation exists.
- For critical-path changes with no viable validation, recommend `block` only when the risk is concrete and material; otherwise use `warn` or `unknown` depending on evidence quality.

Output artifact:

- `F-coverage-gaps.md`

#### Stage G: Final Recommendation Report

Purpose:

- Produce the final merge-readiness report from artifacts.

Required report structure:

1. `Recommendation: pass|warn|block|unknown`
2. Executive summary
3. Target reviewed
4. Changed/affected areas
5. Validation performed
6. Results
7. Risks and gaps
8. Actionable next steps
9. Evidence appendix

Recommendation rules:

- Use `pass` only when the target is resolved, relevant evidence is available, no relevant command failed, and remaining gaps are minor.
- Use `warn` when evidence is useful but incomplete and no blocking failure was observed.
- Use `block` when an observed failure or concrete high-risk unvalidated change should prevent merge.
- Use `unknown` when target, environment, or repository evidence is insufficient for a reliable merge recommendation.
- Never treat missing tests or unavailable validation as `pass` for code changes.

Output artifact/report:

- Saved Markdown report under the workflow output directory.
- Hidden artifact manifest using existing artifact helper conventions.

Research references:

- Report helper: `src/report-output.ts:46-72`.
- Artifact helper: `src/workflow-artifacts.ts:38-82`.
- Current final report stage: `workflows/issue-test-lab/index.ts:96-100`.

### Returned Metadata

The workflow should return compact metadata, not the full report body.

Proposed return fields:

- `recommendation`: `"pass" | "warn" | "block" | "unknown"`
- `reportPath`: string
- `artifactManifestPath`: string
- `targetSummary`: string
- `riskLevel`: `"low" | "medium" | "high" | "unknown"`
- `validationSummary`: string

The metadata field should be named `recommendation` because the workflow is making a testing/merge-readiness recommendation, not a broader security decision. The parser should follow the precedent from `security-gate`, which extracts a decision from the final report and returns it as metadata.

References:

- `workflows/security-gate/index.ts:20-32`
- `workflows/security-gate/index.ts:135-153`

## Report Quality Bar

The report should be useful even when validation cannot run.

A high-quality report:

- Names the exact target reviewed.
- Lists changed files or affected areas.
- Identifies the tests/scripts/configs found.
- Explains why commands were or were not run.
- Separates evidence from inference.
- Gives a clear recommendation.
- Provides concrete next steps.
- States explicitly that no code changes, test generation, remediation, or PR posting occurred.

A low-quality report:

- Says “run tests” without identifying which tests.
- Claims confidence without evidence.
- Treats missing tests as a pass.
- Ignores frontend/backend/UI implications.
- Produces a recommendation without explaining risk.
- Recommends unsafe or invented commands without explaining repository evidence.

## Alternatives Considered

### Alternative 1: Keep `issue-test-lab` as-is

Pros:

- Minimal change.
- Existing workflow already has useful stages.

Cons:

- Does not solve the core product problem.
- Remains issue-oriented instead of merge-oriented.
- Does not return a normalized recommendation.

Decision:

- Reject.
- Replace the behavior with PR/branch validation.

### Alternative 2: Create separate frontend and backend testing workflows

Pros:

- More specialized validation prompts.
- Could provide stronger domain-specific advice.

Cons:

- Premature for this repository because no frontend/backend test infrastructure was discovered.
- Users may not know which workflow to choose.
- Many real-world changes cross frontend/backend boundaries.

Decision:

- Do not split initially.
- Infer affected areas inside one workflow.
- Revisit specialization only after the generic validation gate has real usage evidence.

### Alternative 3: Reuse `review-board`

Pros:

- Already supports broad target inference.
- Already includes testing-review concepts.

Cons:

- `review-board` is broader than testing validation.
- It may dilute the concrete merge-gate experience.
- It does not provide the proposed `pass | warn | block | unknown` testing recommendation.

Decision:

- Do not repurpose `review-board`.
- Reuse its target-inference pattern where helpful.

### Alternative 4: Model directly after `security-gate`

Pros:

- Strong precedent for machine-readable decision output.
- Clear gate behavior.

Cons:

- Security decision labels differ from desired testing labels.
- Testing validation needs richer command/test/coverage evidence.

Decision:

- Reuse the decision-line/parser pattern, not the exact labels.

### Alternative 5: Introduce a new workflow name immediately

Pros:

- A name such as `merge-test-gate`, `validation-gate`, or `pr-validation` would better describe the new behavior.
- Avoids the issue-oriented implication of `issue-test-lab`.

Cons:

- Adds package/discovery churn before the new behavior has been validated.
- Requires deciding whether to keep, remove, or alias the old workflow.
- Could create duplicate workflows with overlapping responsibilities.

Decision:

- Keep the discoverable workflow name `issue-test-lab` for the first replacement iteration.
- Revisit naming after implementation review and real usage feedback.

## Risks and Mitigations

### Risk: False confidence

The workflow may recommend `pass` when validation coverage is actually weak.

Mitigation:

- Require evidence-backed recommendations.
- Treat missing relevant validation as `warn` or `unknown`, not `pass`.

### Risk: Over-blocking merges

The workflow may recommend `block` for missing local setup even when CI would pass.

Mitigation:

- Reserve `block` for observed material failures or clearly high-risk unvalidated changes.
- Use `unknown` for insufficient evidence.

### Risk: Unsafe command execution

Validation commands could install packages, mutate files, or run destructive scripts.

Mitigation:

- Preserve the safe-command policy from `issue-test-lab`.
- Prefer read-only commands.
- Avoid implicit `npx` package installation unless policy explicitly allows it.

### Risk: Poor target resolution

PR/branch resolution may fail without `gh` CLI or remotes.

Mitigation:

- Fall back to local git evidence.
- Report target uncertainty explicitly.
- Use `unknown` when the target cannot be reliably resolved.

### Risk: Generic workflow remains too broad

A single workflow may not provide enough domain-specific value.

Mitigation:

- Classify affected areas.
- Include UI/backend-specific validation branches inside the workflow.
- Revisit frontend/backend split after observing real usage.

### Risk: Workflow name does not match new behavior

Keeping `issue-test-lab` may confuse users because the new behavior is PR/branch validation, not issue test planning.

Mitigation:

- Update README framing, examples, and input descriptions clearly.
- Present `issue` only as a deprecated compatibility alias.
- Keep workflow rename as an explicit Open Question for a future iteration.

## Rollout and Testing

### Rollout

Recommended rollout approach:

1. Update the existing `issue-test-lab` behavior in place.
2. Preserve artifact/report conventions from current workflows.
3. Add normalized recommendation parsing.
4. Change public input posture to `target` plus optional `focus`, while keeping `issue` as a deprecated compatibility alias.
5. Update README documentation with examples and recommendation semantics.
6. Update workflow registry documentation if the workflow name or inputs change in a future iteration.

### Testing Strategy

Because this repository currently has no local automated test suite or scripts, validation should focus on deterministic workflow behavior and representative fixtures.

Recommended tests/checks:

- Recommendation parser accepts only `pass`, `warn`, `block`, and `unknown`.
- Missing or malformed recommendation line returns `unknown`.
- Report metadata includes `recommendation`, `reportPath`, and `artifactManifestPath`.
- `target` and `focus` input examples are documented.
- `issue` is documented as a deprecated alias for `focus`.
- Safe-command policy is represented in prompts.
- Fixture scenarios cover:
  - docs-only change
  - frontend/UI change with Playwright config
  - frontend/UI change without runnable app/dev-server path
  - backend/API change with test script
  - failing validation command
  - no tests discovered
  - ambiguous target
  - critical-path change with no viable validation

Manual review should confirm that generated reports are concise, evidence-based, and actionable.

## Open Questions

1. Should the workflow be renamed after the first replacement iteration to something clearer, such as `merge-test-gate`, `validation-gate`, or `pr-validation`?

2. How long should the deprecated `issue` alias be retained if the workflow adopts `target` plus optional `focus`?

3. What exact threshold should distinguish `warn` from `block` for critical-path changes when relevant tests are missing but no failure is observed?

4. Should broad full-suite commands have an explicit time/output budget, and if so, what default budget should be used?

5. Should future versions add separate frontend/backend modes after real usage data, or keep affected-area inference as the only specialization mechanism?

6. Should the workflow expose any user-configurable safety knobs for command execution, or keep command policy entirely internal for the first iteration?
