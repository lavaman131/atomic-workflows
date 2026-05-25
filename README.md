<h1 align="center">Atomic Workflows Registry</h1>

<p align="center">
  <img alt="Atomic workflow demo" src="./assets/atomic-promo.gif" width="760">
</p>

<p align="center"><b>Installable workflow recipes for Atomic.</b></p>

<p align="center">
  <a href="https://docs.bastani.ai/"><img alt="Docs" src="https://img.shields.io/badge/docs-bastani.ai-111827?style=flat-square" /></a>
  <a href="https://github.com/flora131/atomic"><img alt="Atomic" src="https://img.shields.io/badge/Atomic-workflows-2563EB?style=flat-square" /></a>
  <a href="https://www.typescriptlang.org/"><img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-ready-3178C6?style=flat-square&logo=typescript&logoColor=white" /></a>
</p>

<p align="center">
  <a href="#get-started">Get started</a>
  &nbsp;·&nbsp;
  <a href="#registry-workflows">Workflows</a>
  &nbsp;·&nbsp;
  <a href="#built-into-atomic">Built into Atomic</a>
  &nbsp;·&nbsp;
  <a href="#use-these-as-starting-points">Customize</a>
  &nbsp;·&nbsp;
  <a href="https://docs.bastani.ai/workflows#package-setup">Docs</a>
</p>

---

`atomic-workflows` is a small registry package for [Atomic](https://github.com/flora131/atomic). It ships TypeScript workflow definitions that Atomic can discover from package metadata:

```json
{
  "atomic": {
    "workflows": ["./workflows"]
  }
}
```

The workflows here are analysis, review, validation, and reporting recipes. They inspect the repository, collect evidence, and save human-readable reports. They do **not** apply code changes, auto-remediate findings, or auto-post PR comments.

Use this repository as a set of concrete developer-job workflows you can run out of the box: turn bugs into test plans, run focused code reviews, gate security risk, and use the same patterns as examples to build your own Atomic workflows—from simpler local checklists to more complex flows that call tools, CLIs, APIs, and other integrations.

## Get started

Install globally for your user:

```bash
atomic install git:github.com/lavaman131/atomic-workflows
```

Install locally for one project:

```bash
atomic install git:github.com/lavaman131/atomic-workflows -l
```

`-l` writes the package entry to project settings (`.atomic/settings.json`). Without `-l`, Atomic writes to user settings (`~/.atomic/agent/settings.json`).

## Registry workflows

These workflows are provided by this registry package after installation:

| Workflow | Use it when | Default posture |
| --- | --- | --- |
| `issue-test-lab` | Turn issues or bug reports into a risk-based test plan and validation report. | Analysis/reporting only. |
| `review-board` | Run a parallel specialist board for correctness, architecture, testing, security, and performance review. | No edits and no auto-posting. |
| `security-gate` | Gate a PR, branch, diff, or repository scope with local security scope detection, scans, secure review, and decision output. | No remediation and no auto-posting. |
| `spec-driven-development` | Turn a brainstorm or direct implementation intent into research, an approved spec, and a guarded Ralph implementation handoff. | No implementation before human spec approval. |

### List and inspect

From an Atomic chat session:

```text
/workflow list
/workflow inputs issue-test-lab
/workflow inputs review-board
/workflow inputs security-gate
/workflow inputs spec-driven-development
```

### Run examples

```text
/workflow issue-test-lab issues="Password reset fails after email changes" pr=123 base_ref=main head_ref=fix/password-reset profile=balanced run_commands=true environment=auto
```

```text
/workflow review-board pr=123 base_ref=main head_ref=feature/billing scope="packages/billing" depth=standard reviewers="correctness, testing, security" include_pr_comment=true model_strategy=default
```

```text
/workflow security-gate pr=123 base_ref=main head_ref=feature/auth scope="auth, sessions, secrets" profile=standard run_scans=true include_threat_model=true
```

The user-facing entry point is `spec-driven-development`; in Atomic workflow command syntax, pass `mode` and `prompt` as inputs:

```text
/workflow spec-driven-development mode=brainstorm prompt="I want to improve onboarding" max_loops=5
```

```text
/workflow spec-driven-development mode=direct prompt="Add Redis-backed API rate limiting" max_loops=5
```

```text
/workflow spec-driven-development mode=auto prompt="Make activation better" max_loops=5
```

PR-less branch/scope runs are also supported when you want Atomic to inspect local refs, scopes, or the current diff:

```text
/workflow issue-test-lab task="Validate checkout regression risk" head_ref=feature/checkout profile=quick run_commands=true
```

```text
/workflow review-board head_ref=feature/billing scope="packages/billing" depth=standard reviewers="sec, perf, tests" include_pr_comment=false
```

```text
/workflow security-gate scope="auth, sessions, secrets" profile=standard run_scans=true include_threat_model=true
```

### Final reports

Each reporting workflow writes its final Markdown report to disk and returns a compact result with `summary`, `report_path`, and metadata instead of returning the full report inline. If `output_path` is provided, the report is written there. If it is blank, the workflow creates a project-root folder named after the workflow and writes `YYYY-MM-DD-UTC-<summary>.md`.

## Inputs

### `issue-test-lab`

| Input | Type | Default | Description |
| --- | --- | --- | --- |
| `issues` | `text` | `""` | Optional issue IDs, bug reports, acceptance criteria, or failing behaviors. Empty means infer from PR/task/current diff when available. |
| `pr` | `text` | `""` | Optional PR number, URL, branch, or diff reference. |
| `base_ref` | `text` | `main` | Base branch, tag, or commit. |
| `head_ref` | `text` | `""` | Head branch, tag, or commit. |
| `task` | `text` | `""` | Optional testing objective or constraint. |
| `profile` | `select` | `balanced` | `quick`, `balanced`, or `deep`. |
| `run_commands` | `boolean` | `true` | Run safe local read-only commands when available. |
| `environment` | `select` | `auto` | `auto`, `local`, `docker`, or `devcontainer`. |
| `output_path` | `text` | `""` | Optional destination file path for the final report. When blank, saves under `./issue-test-lab/YYYY-MM-DD-UTC-<summary>.md`. |

### `review-board`

| Input | Type | Default | Description |
| --- | --- | --- | --- |
| `pr` | `text` | `""` | Optional PR number, URL, branch, commit range, or diff reference. Empty means use `head_ref`, `scope`, or current diff when available. |
| `base_ref` | `text` | `main` | Base branch, tag, or commit. |
| `head_ref` | `text` | `""` | Head branch, tag, or commit. |
| `scope` | `text` | `""` | Optional paths, packages, risk areas, or boundaries. |
| `depth` | `select` | `standard` | `quick`, `standard`, or `deep`. |
| `reviewers` | `text` | `""` | Optional comma/newline reviewer roles. Valid groups: `correctness`/`correctness-review`, `architecture`/`architecture-review`, `testing`/`testing-review`/`test`/`tests`, `security`/`security-review`/`sec`, and `performance`/`performance-review`/`perf`. Empty or no valid roles runs all five. |
| `include_pr_comment` | `boolean` | `true` | Draft a copyable PR comment; never auto-post. |
| `model_strategy` | `select` | `default` | `default`, `diverse`, or `fast`. |
| `output_path` | `text` | `""` | Optional destination file path for the final report. When blank, saves under `./review-board/YYYY-MM-DD-UTC-<summary>.md`. |

### `security-gate`

| Input | Type | Default | Description |
| --- | --- | --- | --- |
| `pr` | `text` | `""` | Optional PR number, URL, branch, commit range, or diff reference. Empty means use `head_ref`, `scope`, or current diff when available. |
| `base_ref` | `text` | `main` | Base branch, tag, or commit. |
| `head_ref` | `text` | `""` | Head branch, tag, or commit. |
| `scope` | `text` | `""` | Optional security-sensitive paths, services, assets, or assumptions. |
| `profile` | `select` | `standard` | `quick`, `standard`, or `deep`. |
| `run_scans` | `boolean` | `true` | Run safe local read-only security scans when available. |
| `include_threat_model` | `boolean` | `true` | Include a threat model delta. |
| `output_path` | `text` | `""` | Optional destination file path for the final report. When blank, saves under `./security-gate/YYYY-MM-DD-UTC-<summary>.md`. |

### `spec-driven-development`

| Input | Type | Default | Description |
| --- | --- | --- | --- |
| `mode` | `select` | `auto` | `brainstorm`, `direct`, or `auto`. Auto uses brainstorm for vague/product-shaped prompts and direct for concrete implementation intent. |
| `prompt` | `text` | required | Feature idea, implementation intent, or problem statement. |
| `max_loops` | `number` | `5` | Ralph implementation loop cap after human spec approval. |

`brainstorm` asks CE-style one-question-at-a-time prompts, writes a requirements brief under `docs/brainstorms/`, then creates research under `research/docs/` and a spec under `specs/`. `direct` skips product brainstorming and treats `prompt` as implementation intent. `auto` chooses between those paths. The workflow pauses for human spec review with approve/request-changes/reject choices; Ralph is only called after approval and the spec is marked `Approved`.

## `settings.json` filters

Atomic installs workflow packages as a whole package. If a package contains multiple workflows, install the package once and filter which workflows load in `settings.json`.

Load every workflow from this package:

```json
{
  "packages": [
    "git:github.com/lavaman131/atomic-workflows"
  ]
}
```

Load only `review-board` and `security-gate`:

```json
{
  "packages": [
    {
      "source": "git:github.com/lavaman131/atomic-workflows",
      "workflows": [
        "workflows/review-board.ts",
        "workflows/security-gate.ts"
      ]
    }
  ]
}
```

Exclude one workflow while keeping the rest:

```json
{
  "packages": [
    {
      "source": "git:github.com/lavaman131/atomic-workflows",
      "workflows": [
        "!workflows/security-gate.ts"
      ]
    }
  ]
}
```

Disable all workflows from this package while keeping the package entry:

```json
{
  "packages": [
    {
      "source": "git:github.com/lavaman131/atomic-workflows",
      "workflows": []
    }
  ]
}
```

See the workflow package setup docs: <https://docs.bastani.ai/workflows#package-setup>.

## Built into Atomic

Atomic also ships built-in workflows that do **not** come from this registry and do **not** require installing `atomic-workflows`:

| Built-in | Use it when |
| --- | --- |
| `ralph` | You want an implementation loop that plans, orchestrates workers, simplifies, and reviews. |
| `open-claude-design` | You want design-system onboarding, generation, refinement, and handoff. |

Examples:

```text
/workflow ralph prompt="Implement specs/rate-limit.md" max_loops=5
```

```text
/workflow open-claude-design prompt="Design a billing page" output_type=page
```

## Use these as starting points

These workflows are deliberately readable TypeScript recipes, not black boxes. Copy one into your project or your own workflow package and adapt the inputs, prompts, stages, parallel specialists, validation policy, and output format.

Good starting points:

- Triage: issue routers, repro scouts, ownership maps.
- Testing gates: flake labs, migration plans, release smoke matrices.
- Review boards: domain-specific reviewers, API councils, cross-repo checks.
- Security: service-specific threat deltas, release gates, dependency review.
- Release/incident: changelog checks, rollout readiness, timeline reconstruction.

## Links

- Atomic: <https://github.com/flora131/atomic>
- Docs: <https://docs.bastani.ai/>
- Workflow package setup: <https://docs.bastani.ai/workflows#package-setup>
