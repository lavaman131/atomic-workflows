<h1 align="center">Atomic Workflows Registry</h1>

<p align="center">
  <img alt="Atomic workflow demo" src="./assets/atomic-promo.gif" width="760">
</p>

<p align="center"><b>Installable workflow recipes for Atomic.</b></p>

<p align="center">
  <a href="https://docs.bastani.ai/"><img src="https://img.shields.io/badge/docs-atomic-blue" alt="Docs"></a>
  <a href="https://github.com/flora131/atomic"><img src="https://img.shields.io/badge/original%20repo-Atomic-181717?logo=github&logoColor=white" alt="Original Atomic repo"></a>
  <a href="https://discord.gg/9CvdXUGXR4"><img src="https://img.shields.io/badge/join%20community-discord-5865F2?logo=discord&logoColor=white" alt="Discord"></a>
  <a href="./package.json"><img src="https://img.shields.io/badge/TypeScript-6.x-3178C6?logo=typescript&logoColor=white" alt="TypeScript"></a>
  <a href="./package.json"><img src="https://img.shields.io/badge/Bun-Runtime-f9f1e1?logo=bun&logoColor=black" alt="Bun"></a>
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
  <a href="#contributing-workflows">Contribute</a>
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

The workflows here are concrete developer-job recipes for analysis, review, security validation, implementation planning, reporting, and workflow chaining. Some are intentionally read-only; others demonstrate how one workflow can hand off to another workflow for active implementation.

Use this repository out of the box to run focused code reviews, gate security risk, turn implementation intent into approved specs, and study the same patterns as starting points for your own Atomic workflows.

## Get started

Download/install the registry globally for your user:

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
| `review-board` | Run a parallel specialist board for correctness, architecture, testing, security, and performance review. | No edits and no auto-posting. | [`workflows/review-board/`](./workflows/review-board/) |
| `security-gate` | Gate a PR, branch, diff, or repository scope with local security scope detection, scans, secure review, and decision output. | No remediation and no auto-posting. | [`workflows/security-gate/`](./workflows/security-gate/) |
| `spec-driven-development` | Turn a brainstorm or direct implementation intent into research, an approved spec, and a Ralph implementation handoff. | Active chain after approval: spec-driven prepares the approved spec; Ralph applies code changes in the follow-on workflow. | [`workflows/spec-driven-development/`](./workflows/spec-driven-development/) |

## What these workflows demonstrate

### Active implementation chaining

`spec-driven-development` is the active, spec-first path. It can clarify vague ideas, research the codebase, write a spec, loop on human review, and then return launch metadata plus a copyable command for Atomic's built-in `ralph` workflow. The spec-driven workflow does not edit code before approval; the follow-on Ralph workflow is where implementation work happens. Together, they show how to chain workflows cleanly instead of hiding every step inside one opaque run.

After approval, monitor the Ralph run separately with `/workflow status` and `/workflow connect <ralph-run-id>`.

### Read-only review and security workflows

`review-board` and `security-gate` are examples of solid read-only workflows. They inspect targets, collect evidence, run safe local analysis where appropriate, write durable reports, and avoid mutating code or auto-posting comments. Use them when you want high-signal output that a human can review, copy, or act on.

### Templates for your own workflows

All workflows in this registry can be used as-is or treated as templates. Copy one into your project or package, then tune the prompts, stages, specialist roles, output format, artifact strategy, safety posture, and token usage for your team's needs.

## Workflow details

Workflow-specific command examples, inputs, execution behavior, and report output notes live with the workflow docs under [`workflows/`](./workflows/):

- [`workflows/README.md`](./workflows/README.md) — registry workflow index, list/inspect commands, report output behavior, and package filters.
- [`workflows/review-board/README.md`](./workflows/review-board/README.md) — specialist review board configuration and reviewer roles.
- [`workflows/security-gate/README.md`](./workflows/security-gate/README.md) — security scope detection, scan policy, and gate decisions.
- [`workflows/spec-driven-development/README.md`](./workflows/spec-driven-development/README.md) — brainstorm/direct modes, spec approval loop, and Ralph handoff.

From an Atomic chat session:

```text
/workflow list
/workflow inputs review-board        # target, focus
/workflow inputs security-gate       # target, focus
/workflow inputs spec-driven-development
```

The reporting workflows auto-save final reports to `./review-board/` and `./security-gate/`. Intermediate evidence is preserved in hidden run artifact directories with manifests.

## Use these as starting points

These workflows are deliberately readable TypeScript recipes, not black boxes. Copy one into your project or your own workflow package and adapt the inputs, prompts, stages, parallel specialists, validation policy, and output format.

Good starting points:

- Triage: issue routers, repro scouts, ownership maps.
- Testing gates: flake labs, migration plans, release smoke matrices.
- Review boards: domain-specific reviewers, API councils, cross-repo checks.
- Security: service-specific threat deltas, release gates, dependency review.
- Release/incident: changelog checks, rollout readiness, timeline reconstruction.

## Contributing workflows

Have a workflow that could help others? Community submissions are welcome. Official contribution guidance for this registry:

1. **Explain the value.** Start with the developer job the workflow solves, why it should be a workflow instead of a one-off prompt, and where the workflow creates leverage.
2. **Be explicit about posture.** State whether the workflow is read-only, report-only, approval-gated, or code-changing through another workflow such as Ralph.
3. **Design for clarity and token usage.** Prefer focused stages, compact handoffs, saved artifacts, and concise final metadata over large inline transcripts.
4. **Document inputs and outputs.** Include command examples, required inputs, generated files, artifact folders, status values, and any safety or failure behavior.
5. **Make it a useful template.** Keep the TypeScript readable enough that another developer can copy it, trim it, extend it, or optimize it for their own team.

Recommended workflow directory shape:

```text
workflows/<workflow-name>/
  index.ts      # defineWorkflow entrypoint discovered by the package manifest
  README.md     # user-facing usage, posture, inputs, stages, and outputs
  helpers.ts    # optional local helpers for this workflow
```

When adding a workflow, update the registry tables in this README and [`workflows/README.md`](./workflows/README.md). The package manifest already discovers `./workflows/*/index.ts`, so new workflow folders become installable through the same registry download/install commands above.

## Useful authoring references:

- Atomic: <https://github.com/flora131/atomic>
- Docs: <https://docs.bastani.ai/>
- Workflow package setup: <https://docs.bastani.ai/workflows#package-setup>
