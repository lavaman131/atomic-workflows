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

`atomic-workflows` is a small registry package for [Atomic](https://github.com/flora131/atomic). It ships TypeScript workflow definitions.

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

### Update this registry only

To update `atomic-workflows` without updating any other Atomic packages you have installed, run:

```bash
atomic update git:github.com/lavaman131/atomic-workflows
```

If you installed a pinned ref such as `git:github.com/lavaman131/atomic-workflows@v1.0.0`, Atomic skips it during package updates. Remove the ref or reinstall with an unpinned source to follow the latest version.

To enable only certain workflows from this registry, edit your Atomic settings after installation. Use project settings (`.atomic/settings.json`) for one repository, or user settings (`~/.atomic/settings.json`) for your global Atomic configuration, and add a workflow filter to the package entry:

```json
{
  "packages": [
    {
      "source": "git:github.com/lavaman131/atomic-workflows",
      "workflows": [
        "workflows/review-board/index.ts",
        "workflows/security-gate/index.ts"
      ]
    }
  ]
}
```

You can also exclude specific workflows with `!workflows/<name>/index.ts`. See [`workflows/README.md`](./workflows/README.md#settingsjson-filters) for more filter examples.

## Registry workflows

These workflows are provided by this registry package after installation. See [`workflows/README.md`](./workflows/README.md) for the current workflow index, details, and settings filter examples.

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

Have a workflow that could help others? Community submissions are welcome. See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for workflow contribution guidelines, directory structure, testing expectations, and authoring references.
