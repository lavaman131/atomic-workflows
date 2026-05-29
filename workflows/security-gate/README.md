# `security-gate`

Gate a PR, branch, diff, path, or repository scope with local security scope detection, safe scans, secure review, threat-model delta, and decision output.

- **Source:** [`./index.ts`](./index.ts)
- **Posture:** no remediation and no auto-posting.
- **Final report folder:** `./security-gate/`
- **Artifact folder:** hidden run directory `./.security-gate-<run-id>/`

## Run examples

```text
/workflow security-gate target=123
/workflow security-gate target="https://github.com/org/repo/pull/123" focus="auth sessions secrets"
/workflow security-gate target="main..feature/auth" focus="token storage and admin routes"
/workflow security-gate target="repo" focus="release security readiness"
```

## Inputs

| Input | Type | Required | Description |
| --- | --- | --- | --- |
| `target` | `text` | yes | PR number/URL, branch, commit range, current diff, path, or `repo`. |
| `focus` | `text` | no | Optional security-sensitive areas, assets, services, or assumptions. |

Internal defaults are intentionally not exposed in the workflow UI: deep risk-based profile, safe local read-only scans enabled, threat model delta enabled, and auto-generated report path.

## Scan policy

The workflow may run only safe local read-only scans, including:

- git diff/status inspection
- `rg` secret/config searches
- dependency audit commands that do not require risky network access
- lint/security scripts
- installed language analyzers

It never installs dependencies, mutates lockfiles, applies remediations, or calls external services.

## Execution stages

1. `security-scope-detection` — identifies changed files, sensitive components, trust boundaries, data classes, auth/authz paths, input surfaces, secrets/config, dependency surfaces, and unknowns.
2. `tooling-discovery` — inspects manifests, lockfiles, CI, scripts, linters, SAST/secret scanning configs, containers/devcontainers, and audit commands.
3. `automated-scans` — runs safe feasible scans or records a human scan plan; captures commands, exit status, output, caveats, and skipped scans.
4. `contextual-secure-code-review` — reviews auth/authz, validation, injection, secrets, logging, data exposure, serialization, file/process/network boundaries, dependency/supply-chain, CI/release hardening, and operational controls.
5. `threat-model-delta` — summarizes assets, actors, entry points, boundaries, changed assumptions, abuse cases, risks, and residual risk.
6. `gate-decision` — writes the final gate report and starts with `Decision: pass | pass-with-warnings | fail | inconclusive`.
7. `report-filename-summary` — creates the short AI-generated filename topic.

## Output and artifacts

The final Markdown report is saved under:

```text
./security-gate/YYYY-MM-DD-<ai-generated-topic>(-N).md
```

The optional `-N` suffix is added only when a same-day default report with the same generated topic already exists.

Intermediate stage outputs are saved as markdown artifacts under a hidden run directory so the final decision can read files instead of receiving large inline transcripts:

```text
./.security-gate-<run-id>/
  00-scope-detection.md
  01-tooling-discovery.md
  02-automated-scans.md
  03-secure-code-review.md
  04-threat-model-delta.md
  manifest.json
```

The workflow returns compact metadata including `summary`, `report_path`, `filename_summary`, `artifact_dir`, `manifest_path`, `stages`, and `decision`.
