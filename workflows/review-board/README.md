# `review-board`

Run a full specialist board for correctness, architecture, testing, security, and performance review.

- **Source:** [`./index.ts`](./index.ts)
- **Posture:** no edits and no auto-posting. A PR comment is always drafted for humans to copy manually.
- **Final report folder:** `./review-board/`
- **Artifact folder:** hidden run directory `./.review-board-<run-id>/`

## Run examples

```text
/workflow review-board target=123
/workflow review-board target="https://github.com/org/repo/pull/123" focus="billing correctness and missing tests"
/workflow review-board target="feature/billing" focus="security and performance risk"
/workflow review-board target="repo" focus="release readiness"
```

## Inputs

| Input | Type | Required | Description |
| --- | --- | --- | --- |
| `target` | `text` | yes | PR number/URL, branch, commit range, current diff, path, or `repo`. |
| `focus` | `text` | no | Optional review emphasis, risk area, subsystem, or reviewer guidance. |

Internal defaults are intentionally not exposed in the workflow UI: deep review, all five reviewers, default best available multi-model strategy, PR comment draft enabled, and auto-generated report path.

## Execution stages

1. `review-target-collection` — infers target type, changed files, commits, base/head guidance, risk areas, and missing context.
2. `review-packet` — builds a shared packet with behavior, files, architecture context, tests, operational risk, questions, and safe validation commands.
3. Specialist reviews in parallel:
   - `correctness-review`
   - `architecture-review`
   - `testing-review`
   - `security-review`
   - `performance-review`
4. `consensus-judge` — deduplicates findings, resolves disagreements, discards unsupported claims, and ranks findings.
5. `pr-comment-draft` — creates a human-copyable PR comment; never posts it.
6. `final-output` — writes the final review report from artifact files.
7. `report-filename-summary` — creates the short AI-generated filename topic.

## Output and artifacts

The final Markdown report is saved under:

```text
./review-board/YYYY-MM-DD-<ai-generated-topic>.md
```

Intermediate stage outputs are saved as markdown artifacts under a hidden run directory so the final aggregation can read files instead of receiving large inline transcripts:

```text
./.review-board-<run-id>/
  00-review-target.md
  01-review-packet.md
  correctness-review.md
  architecture-review.md
  testing-review.md
  security-review.md
  performance-review.md
  consensus.md
  pr-comment-draft.md
  manifest.json
```

The workflow returns compact metadata including `summary`, `report_path`, `filename_summary`, `artifact_dir`, `manifest_path`, and `stages`.
