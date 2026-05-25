# Registry workflows

This folder contains the Atomic workflows shipped by `atomic-workflows`.

Each workflow has its own subfolder with an `index.ts` entrypoint and local documentation. The package manifest exposes only `./workflows/*/index.ts`, which keeps shared helpers out of Atomic workflow discovery while still supporting git installs via `atomic install git:github.com/lavaman131/atomic-workflows`.

| Workflow | Source | Details |
| --- | --- | --- |
| `issue-test-lab` | [`issue-test-lab/index.ts`](./issue-test-lab/index.ts) | [`issue-test-lab/README.md`](./issue-test-lab/README.md) |
| `review-board` | [`review-board/index.ts`](./review-board/index.ts) | [`review-board/README.md`](./review-board/README.md) |
| `security-gate` | [`security-gate/index.ts`](./security-gate/index.ts) | [`security-gate/README.md`](./security-gate/README.md) |
| `spec-driven-development` | [`spec-driven-development/index.ts`](./spec-driven-development/index.ts) | [`spec-driven-development/README.md`](./spec-driven-development/README.md) |

[`../src/report-output.ts`](../src/report-output.ts) is a shared helper used by reporting workflows.

## List and inspect

From an Atomic chat session:

```text
/workflow list
/workflow inputs issue-test-lab
/workflow inputs review-board
/workflow inputs security-gate
/workflow inputs spec-driven-development
```

## Final reports and artifacts

Reporting workflows write their final Markdown report to disk and return compact metadata instead of returning the full report inline.

The simplified reporting workflows save final reports under a project-root folder named after the workflow:

```text
./review-board/YYYY-MM-DD-<ai-generated-topic>.md
./security-gate/YYYY-MM-DD-<ai-generated-topic>.md
./issue-test-lab/YYYY-MM-DD-<ai-generated-topic>.md
```

Intermediate audit outputs are preserved under hidden run-specific artifact directories such as `./.review-board-<run-id>/`, `./.security-gate-<run-id>/`, and `./.issue-test-lab-<run-id>/`. Each artifact directory includes markdown stage outputs and a `manifest.json` recording the run id, timestamps, user input, final report path, and artifact paths.

The return object includes `summary`, `report_path`, `filename_summary`, `artifact_dir`, `manifest_path`, and `stages`.

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
        "workflows/review-board/index.ts",
        "workflows/security-gate/index.ts"
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
        "!workflows/security-gate/index.ts"
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
