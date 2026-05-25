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
  <a href="#workflow-details">Details</a>
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
    "workflows": ["./workflows/*/index.ts"]
  }
}
```

The workflows here are analysis, review, validation, and reporting recipes. They inspect the repository, collect evidence, and save human-readable reports. They do **not** apply code changes, auto-remediate findings, or auto-post PR comments unless a specific workflow explicitly says otherwise.

Use this repository as a set of concrete developer-job workflows you can run out of the box: turn bugs into test plans, run focused code reviews, gate security risk, and use the same patterns as examples to build your own Atomic workflows.

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

| Workflow | Use it when | Default posture | Details |
| --- | --- | --- | --- |
| `issue-test-lab` | Turn issues or bug reports into a risk-based test plan and validation report. | Analysis/reporting only. | [`workflows/issue-test-lab/`](./workflows/issue-test-lab/) |
| `review-board` | Run a parallel specialist board for correctness, architecture, testing, security, and performance review. | No edits and no auto-posting. | [`workflows/review-board/`](./workflows/review-board/) |
| `security-gate` | Gate a PR, branch, diff, or repository scope with local security scope detection, scans, secure review, and decision output. | No remediation and no auto-posting. | [`workflows/security-gate/`](./workflows/security-gate/) |
| `spec-driven-development` | Turn a brainstorm or direct implementation intent into research, an approved spec, and a guarded Ralph implementation handoff. | No implementation before human spec approval. | [`workflows/spec-driven-development/`](./workflows/spec-driven-development/) |

## Workflow details

Workflow-specific command examples, inputs, execution behavior, and report output notes now live with the workflow docs under [`workflows/`](./workflows/):

- [`workflows/README.md`](./workflows/README.md) — registry workflow index, list/inspect commands, report output behavior, and package filters.
- [`workflows/issue-test-lab/README.md`](./workflows/issue-test-lab/README.md) — issue intake, risk-based test selection, and validation reporting.
- [`workflows/review-board/README.md`](./workflows/review-board/README.md) — specialist review board configuration and reviewer roles.
- [`workflows/security-gate/README.md`](./workflows/security-gate/README.md) — security scope detection, scan policy, and gate decisions.
- [`workflows/spec-driven-development/README.md`](./workflows/spec-driven-development/README.md) — brainstorm/direct modes, spec approval loop, and Ralph handoff.

From an Atomic chat session:

```text
/workflow list
/workflow inputs issue-test-lab      # issue, target
/workflow inputs review-board        # target, focus
/workflow inputs security-gate       # target, focus
/workflow inputs spec-driven-development
```

The simplified reporting workflows auto-save final reports to `./issue-test-lab/`, `./review-board/`, and `./security-gate/` with `YYYY-MM-DD-<ai-generated-topic>.md` filenames. Intermediate evidence is preserved in hidden run artifact directories with manifests.

## Built into Atomic

Atomic also ships built-in workflows that do **not** come from this registry and do **not** require installing `atomic-workflows`:

| Built-in | Use it when |
| --- | --- |
| `ralph` | You want an implementation loop that plans, orchestrates workers, simplifies, and reviews. |
| `open-claude-design` | You want design-system onboarding, generation, refinement, and handoff. |

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
