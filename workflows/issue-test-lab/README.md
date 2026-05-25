# `issue-test-lab`

Turn an issue, bug report, acceptance criteria, failing behavior, or validation objective into a risk-based test plan and safe validation report.

- **Source:** [`./index.ts`](./index.ts)
- **Posture:** analysis/reporting only. The workflow does not modify files, create tests, apply fixes, or post comments.
- **Final report folder:** `./issue-test-lab/`
- **Artifact folder:** hidden run directory `./.issue-test-lab-<run-id>/`

## Run examples

```text
/workflow issue-test-lab issue="Password reset fails after email changes"
/workflow issue-test-lab issue="Validate checkout regression risk" target="feature/checkout"
/workflow issue-test-lab issue="BUG-123 acceptance criteria" target=123
/workflow issue-test-lab issue="Release smoke validation for billing" target="repo"
```

## Inputs

| Input | Type | Required | Description |
| --- | --- | --- | --- |
| `issue` | `text` | yes | Issue ID, bug report, acceptance criteria, failing behavior, or validation objective. |
| `target` | `text` | no | Optional PR number/URL, branch, commit range, current diff, or repo scope. |

Internal defaults are intentionally not exposed in the workflow UI: balanced risk-based profile, safe commands enabled, environment auto-detected, and auto-generated report path.

## Command policy

The workflow may run only safe local read-only commands when useful, such as:

- `git status`, `git diff`, and `git log`
- `rg`/`grep` repository searches
- package-manager script discovery
- targeted test dry-runs when they are safe and high-signal

It never edits files, installs dependencies, generates tests, applies fixes, or posts comments.

## Execution stages

1. `A-intake` — identifies expected behavior, observed behavior, acceptance criteria, unknowns, and likely affected user flows.
2. `B-repo-detection` — detects repository shape, languages, package managers, test frameworks, CI configuration, test conventions, fixtures, environment options, and likely implementation surfaces.
3. `C-risk-based-test-selection` — selects smoke, focused regression, integration/e2e, edge-case, and negative-path checks based on risk.
4. `D-environment-planning` — auto-detects validation environment support and records prerequisites, safe commands, expected runtime, skipped/unsafe commands, and fallbacks.
5. `E-validation-execution` — runs safe feasible validation and captures command evidence where available.
6. `F-final-report` — writes the issue summary, target/scope, repository evidence, test inventory, environment plan, validation performed, gaps, next actions, and confidence.
7. `report-filename-summary` — creates the short AI-generated filename topic.

## Output and artifacts

The final Markdown report is saved under:

```text
./issue-test-lab/YYYY-MM-DD-<ai-generated-topic>.md
```

Intermediate stage outputs are saved as markdown artifacts under a hidden run directory so the final report can read files instead of receiving large inline transcripts:

```text
./.issue-test-lab-<run-id>/
  00-intake.md
  01-repo-detection.md
  02-risk-based-test-selection.md
  03-environment-planning.md
  04-validation-execution.md
  manifest.json
```

The workflow returns compact metadata including `summary`, `report_path`, `filename_summary`, `artifact_dir`, `manifest_path`, and `stages`.
