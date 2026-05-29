## File Locations for `specs/2026-05-28-i-want-to-iterate-on-the.md`

### Implementation Files
- `workflows/issue-test-lab/index.ts` — current workflow implementation in scope
- `workflows/security-gate/index.ts` — sibling workflow with structured decision output
- `workflows/review-board/index.ts` — sibling workflow with target discovery and specialist review
- `workflows/spec-driven-development/index.ts` — related workflow with research/fan-out patterns
- `src/report-output.ts` — shared report writing / filename helper
- `src/workflow-artifacts.ts` — shared run-artifact / manifest helper

### Test Files
- None found in repo (`*.test.*`, `*.spec.*`, `*test*.ts`, `*spec*.ts` searches returned no files)

### Configuration / Package Discovery
- `package.json` — atomic workflow package manifest; discovers `./workflows/*/index.ts`
- `workflows/README.md` — workflow registry index, package filter examples, report/artifact conventions
- `README.md` — top-level registry overview and workflow discovery docs
- `.spec-driven-development-research-2026-05-28T02-10-34-844Z/manifest.json` — prior research run manifest with artifact paths

### Workflow Docs
- `workflows/issue-test-lab/README.md` — issue-test-lab usage, inputs, output locations
- `workflows/security-gate/README.md` — security-gate usage and decision/report conventions
- `workflows/review-board/README.md` — review-board usage and roles
- `workflows/spec-driven-development/README.md` — related workflow docs
- `docs/brainstorms/2026-05-28-i-want-to-iterate-on-the.md` — brainstorming note that motivated the spec
- `specs/2026-05-28-i-want-to-iterate-on-the.md` — target spec
- `research/docs/2026-05-28-i-want-to-iterate-on-the.md` — prior research final report

### Prior Research Artifacts
- `.spec-driven-development-research-2026-05-28T02-10-34-844Z/00-research-intake.md`
- `.spec-driven-development-research-2026-05-28T02-10-34-844Z/01-live-codebase-locator.md`
- `.spec-driven-development-research-2026-05-28T02-10-34-844Z/02-research-history-locator.md`
- `.spec-driven-development-research-2026-05-28T02-10-34-844Z/03-external-relevance-scout.md`
- `.spec-driven-development-research-2026-05-28T02-10-34-844Z/04-codebase-analyzer.md`
- `.spec-driven-development-research-2026-05-28T02-10-34-844Z/05-pattern-finder.md`
- `.spec-driven-development-research-2026-05-28T02-10-34-844Z/06-research-history-analyzer.md`
- `.spec-driven-development-research-2026-05-28T02-10-34-844Z/07-online-research.md`

### Related Directories
- `workflows/issue-test-lab/` — issue-test-lab workflow cluster (`index.ts`, `README.md`)
- `workflows/review-board/` — review-board workflow cluster (`index.ts`, `README.md`)
- `workflows/security-gate/` — security-gate workflow cluster (`index.ts`, `README.md`)
- `workflows/spec-driven-development/` — related workflow cluster (`index.ts`, `README.md`)
- `.spec-driven-development-research-2026-05-28T02-10-34-844Z/` — prior research artifact bundle
- `docs/brainstorms/` — brainstorm source docs
- `research/docs/` — stored research outputs

### Notes on Coverage
- The concrete implementation seam for the spec is `workflows/issue-test-lab/index.ts`.
- The main sibling precedents for report/artifact helpers are `workflows/review-board/index.ts` and `workflows/security-gate/index.ts`.
- No standalone automated test files were present in the repository.