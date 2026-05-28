# `issue-test-lab`

Validate whether a PR, branch, commit range, local diff, path, or repository scope is safe to merge based on available repository evidence.

- **Source:** [`./index.ts`](./index.ts)
- **Posture:** analysis/reporting only. The workflow does not modify source files, generate tests, apply fixes, install dependencies, mutate lockfiles, or post PR comments.
- **Final report folder:** `./issue-test-lab/`
- **Artifact folder:** hidden run directory `./.issue-test-lab-<run-id>/`
- **Final recommendation:** first report line is exactly `Recommendation: pass`, `Recommendation: warn`, `Recommendation: block`, or `Recommendation: unknown`; the first non-empty content after it is `## Executive summary`.

## Run examples

```text
/workflow issue-test-lab target="feature/checkout" focus="checkout regression risk"
/workflow issue-test-lab target=123 focus="billing validation before merge"
/workflow issue-test-lab target="main...feature/auth" focus="auth and session risk"
/workflow issue-test-lab target="current diff"
/workflow issue-test-lab target="workflows/issue-test-lab"
```

Deprecated compatibility example:

```text
/workflow issue-test-lab issue="Validate checkout regression risk"
```

`issue` remains accepted for older callers, but it is deprecated and treated as supplemental validation context. Use `focus` for new invocations. If both `focus` and `issue` are supplied, `focus` is primary.

## Inputs

| Input | Type | Required | Description |
| --- | --- | --- | --- |
| `target` | `text` | no | Optional PR number/URL, branch, commit range, current diff, path, or repo. If omitted, the workflow inspects local branch and working-tree evidence. |
| `focus` | `text` | no | Optional validation focus, affected area, risk area, or human guidance. |
| `issue` | `text` | no | Deprecated compatibility alias for focus/additional context. |

## Recommendation semantics

| Recommendation | Meaning |
| --- | --- |
| `pass` | Target resolved; relevant validation passed or the change is low-risk/docs-only; no relevant command failed; remaining gaps are minor and disclosed. |
| `warn` | Useful evidence exists and no blocker was observed, but meaningful validation gaps or moderate risk remain. |
| `block` | Observed validation failure or concrete high-risk unvalidated change should prevent merge. |
| `unknown` | Target, environment, repository evidence, or command results are insufficient for a reliable recommendation. |

The workflow must not recommend `pass` for code changes solely because no tests or validation surfaces were found.

## Command policy

The workflow may run only safe, high-signal local validation commands selected from repository evidence, such as:

- `git status`, `git diff`, and `git log`
- `rg`/`grep` repository searches
- manifest, script, test, coverage, CI, and framework discovery
- existing package scripts or local validation binaries when already available and clearly safe

It never edits source files, generates tests, applies remediations, installs dependencies, mutates lockfiles, starts unbounded services, pushes changes, or posts PR comments. It avoids implicit installs, including `npx` commands that may download packages. Missing tests or unavailable tooling are reported as gaps rather than success.

## Execution stages

1. `A-target-intake` — resolves the target type/scope, inferred refs, changed files, current git/worktree evidence, optional read-only PR metadata, unresolved target questions, and internal `Target summary:` metadata.
2. `B-repo-detection` — detects validation surfaces: package managers, scripts, test frameworks, test files, coverage, CI, UI/e2e tooling, frontend/backend indicators, and environment constraints.
3. `C-risk-analysis` — classifies affected areas and risk signals, then assigns an overall internal `Risk level:` of `low`, `medium`, `high`, or `unknown`.
4. `D-validation-plan` — selects safe high-signal commands from repository evidence and records skipped/unsafe commands with reasons.
5. `E-validation-execution` — runs only feasible planned commands and captures exact command, working directory, exit status, output summary, and interpretation.
6. `F-coverage-gaps` — evaluates whether the validation evidence meaningfully covers the change, identifies missing coverage or tooling gaps, and records internal `Validation summary:` metadata.
7. `G-final-recommendation` — writes the final report with the required recommendation line followed by `## Executive summary`, required sections, and analysis-only statement. Return-metadata prelude lines are not included in the saved report.
8. `report-filename-summary` — creates the short AI-generated filename topic.

## Output and artifacts

The final Markdown report is saved under:

```text
./issue-test-lab/YYYY-MM-DD-<ai-generated-topic>(-N).md
```

The optional `-N` suffix is added only when a same-day default report with the same generated topic already exists.

Intermediate stage outputs are saved as markdown artifacts under a hidden run directory so the final report can read files instead of receiving large inline transcripts.

Resolved-target runs create the full validation artifact set:

```text
./.issue-test-lab-<run-id>/
  A-target-intake.md
  B-repo-detection.md
  C-risk-analysis.md
  D-validation-plan.md
  E-validation-execution.md
  F-coverage-gaps.md
  manifest.json
```

Unresolved-target runs short-circuit after target intake and intentionally skip validation stages `B` through `F`:

```text
./.issue-test-lab-<run-id>/
  A-target-intake.md
  manifest.json
```

The workflow returns compact metadata including:

- `summary`
- `recommendation`
- `reportPath`
- `artifactManifestPath`
- `targetSummary`
- `riskLevel`
- `validationSummary`
- compatibility fields: `report_path`, `filename_summary`, `artifact_dir`, `manifest_path`, and `stages`

For resolved runs, returned metadata is read from internal artifacts: `targetSummary` from Stage A `Target summary:`, `riskLevel` from Stage C `Risk level:`, and `validationSummary` from Stage F `Validation summary:`. The saved report only carries the first-line recommendation plus the human-readable report sections. For unresolved runs, validation stages are skipped and metadata is returned from deterministic short-circuit values.
