## Prior docs for `issue-test-lab` → PR/branch validation

### Specs
- 🟢 `specs/2026-05-28-i-want-to-iterate-on-the.md` — High-Value PR/Branch Validation Workflow; approved spec for replacing `issue-test-lab` with PR/branch validation. *(Likely supersedes the brainstorm and older context-build notes.)*

### Research artifacts
- 🟢 `.spec-driven-development-research-2026-05-28T02-10-34-844Z/06-research-history-analyzer.md` — Research summary tying the brainstorm to current workflow behavior, decision labels, and sibling patterns. *(Superseded by the approved spec for implementation intent.)*
- 🟢 `.spec-driven-development-research-2026-05-28T02-10-34-844Z/04-codebase-analyzer.md` — Codebase behavior map for `issue-test-lab`, `review-board`, and `security-gate`, including current inputs/stages and decision gaps.
- 🟢 `.spec-driven-development-research-2026-05-28T02-10-34-844Z/02-research-history-locator.md` — Ranked locator for the most relevant docs and historical notes around the workflow replacement.
- 🟢 `.spec-driven-development-research-2026-05-28T02-10-34-844Z/00-research-intake.md` — Original research question framing the replacement as PR/branch validation using diffs, affected files, coverage, and UI validation.
- 🟢 `.spec-driven-development-research-2026-05-28T02-10-34-844Z/07-online-research.md` — External research notes supporting a normalized recommendation output and security-gate precedent.

### Brainstorms
- 🟢 `docs/brainstorms/2026-05-28-i-want-to-iterate-on-the.md` — Original brainstorm: make testing workflow practical for real engineers, replace `issue-test-lab`, and emit `pass|warn|block|unknown`. *(Superseded by the approved spec.)*

### Context-build docs
- 🟡 `context-build/atomic-workflows-current-behavior.md` — Snapshot of current `issue-test-lab` behavior, stages, and safe-command posture. *(Useful background, but stale versus the new PR/branch validation goal.)*
- 🟡 `context-build/atomic-workflows-patterns.md` — Pattern catalog for workflow shapes and decision/reporting conventions; useful for choosing a merge-gate structure.
- 🟡 `context-build/workflow-discovery-debug.md` — Notes on workflow/package discovery and registry layout; relevant to preserving or changing the `issue-test-lab` name and packaging.
- 🟡 `context-build/atomic-workflows-file-map.md` — File map for the workflow package, including current workflow entrypoints and registry docs.

### Possible supersession
- The approved spec (`specs/2026-05-28-i-want-to-iterate-on-the.md`) appears to be the primary replacement plan.
- It supersedes the brainstorm and most research notes for implementation direction.
- The context-build docs are still useful for current behavior and packaging, but they are background context rather than the new target design.
