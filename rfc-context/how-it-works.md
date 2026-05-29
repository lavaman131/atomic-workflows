## Analysis: PR/Branch Validation Workflows and Report/Artifact Helpers

### Overview
The three workflows are default exports built with `defineWorkflow(...).compile()` and are oriented around PR/branch/diff/repo targets by prompt-level target inference rather than explicit base/head inputs. Each run creates a hidden per-workflow artifact directory, writes intermediate task outputs as markdown artifacts using `outputMode: "file-only"`, saves one final markdown report under a workflow-named report directory, writes a JSON manifest, and returns metadata paths plus stage names.

### Entry Points and Exported Symbols
- `workflows/issue-test-lab/index.ts:31-142` - default export for `issue-test-lab`; accepts required `issue` text and optional `target` text.
- `workflows/security-gate/index.ts:43-156` - default export for `security-gate`; accepts required `target` text and optional `focus` text.
- `workflows/review-board/index.ts:51-177` - default export for `review-board`; accepts required `target` text and optional `focus` text.
- `src/report-output.ts:4-15` - exports `SavedWorkflowReport` and `WriteWorkflowReportOptions` interfaces.
- `src/report-output.ts:17-72` - exports `reportSummaryText()`, `reportFilenameSummary()`, `resolveReportPath()`, and `writeWorkflowReport()`.
- `src/workflow-artifacts.ts:4-16` - exports `WorkflowArtifactRun` and `WorkflowArtifactManifest` interfaces.
- `src/workflow-artifacts.ts:18-82` - exports `displayPath()`, `timestampRunId()`, `createWorkflowArtifactRun()`, `manifestArtifactPaths()`, `writeWorkflowManifest()`, and `markdownArtifact()`.

### Core Implementation

#### 1. Common run setup and input normalization
- Each workflow has a local `text(value, fallback)` helper that stringifies, trims, and falls back when the trimmed value is empty: issue-test-lab at `workflows/issue-test-lab/index.ts:12-15`, security-gate at `workflows/security-gate/index.ts:12-15`, and review-board at `workflows/review-board/index.ts:12-15`.
- `issue-test-lab` normalizes `ctx.inputs.issue` and `ctx.inputs.target` at `workflows/issue-test-lab/index.ts:44-45`; `security-gate` normalizes `target` with fallback `repo` and `focus` at `workflows/security-gate/index.ts:56-57`; `review-board` does the same at `workflows/review-board/index.ts:64-65`.
- All three capture `startedAt = new Date()` and call `createWorkflowArtifactRun(WORKFLOW_NAME, startedAt)` to create an artifact run directory: `workflows/issue-test-lab/index.ts:46-47`, `workflows/security-gate/index.ts:58-59`, `workflows/review-board/index.ts:66-67`.

#### 2. PR/branch target inference posture
- `issue-test-lab` declares optional `target` as “PR number/URL, branch, commit range, current diff, or repo scope” at `workflows/issue-test-lab/index.ts:38-42`; its `targetGuidance()` tells stages to infer whether a target is a PR, branch, commit range, diff, path, or repo scope and derive base/head guidance from target plus repo state at `workflows/issue-test-lab/index.ts:22-29`.
- `security-gate` requires `target` with the same PR/branch/range/diff/path/repo shape at `workflows/security-gate/index.ts:45-49`; its `targetGuidance()` uses `User target: ${target || "repo"}` and instructs inference of PR/branch/range/current diff/path/whole repo plus base/head guidance at `workflows/security-gate/index.ts:34-41`.
- `review-board` requires `target` with the same validation target vocabulary at `workflows/review-board/index.ts:53-57`; its `targetGuidance()` has matching PR/branch/range/diff/path/repo inference language at `workflows/review-board/index.ts:25-32`.

#### 3. Artifact creation convention
- Each workflow stores artifact paths in a `Map<string, string>` and registers artifacts through a local `addArtifact(name, filename)` that calls `markdownArtifact(artifactDir, filename)` and saves the result by logical name: issue-test-lab at `workflows/issue-test-lab/index.ts:48-53`, security-gate at `workflows/security-gate/index.ts:60-65`, review-board at `workflows/review-board/index.ts:68-73`.
- `markdownArtifact()` is a simple `join(artifactDir, filename)` wrapper at `src/workflow-artifacts.ts:80-82`.
- `createWorkflowArtifactRun()` creates directories named `.<workflowName>-<runId>` in the current working directory, where `runId` is derived from an ISO timestamp with `:` and `.` replaced by `-`; on `EEXIST` it retries with `-2`, `-3`, etc. (`src/workflow-artifacts.ts:30-57`).
- `displayPath()` normalizes backslashes to forward slashes for prompt/manifest display at `src/workflow-artifacts.ts:18-20`.

#### 4. issue-test-lab stage pipeline
- Inputs: required `issue` text (`workflows/issue-test-lab/index.ts:33-37`) and optional `target` text defaulting to empty (`workflows/issue-test-lab/index.ts:38-42`).
- Constants set workflow name, profile, environment, and file-only output mode: `WORKFLOW_NAME = "issue-test-lab"`, `PROFILE = "balanced risk-based"`, `ENVIRONMENT = "auto-detected"`, and `FILE_ONLY_OUTPUT = "file-only"` at `workflows/issue-test-lab/index.ts:17-20`.
- Validation command posture is prompt-enforced through `commandPolicy`: safe local read-only commands only, including `git status/diff/log`, `rg/grep`, package-manager script discovery, and targeted test dry-runs; missing tooling is recorded; edits, installs, test generation, fixes, and comments are disallowed (`workflows/issue-test-lab/index.ts:55`).
- Artifact filenames are `00-intake.md`, `01-repo-detection.md`, `02-risk-based-test-selection.md`, `03-environment-planning.md`, and `04-validation-execution.md` with manifest names `intake`, `repo-detection`, `risk-based-test-selection`, `environment-planning`, and `validation-execution` (`workflows/issue-test-lab/index.ts:57-61`).
- The sequential stages are `A-intake` (`workflows/issue-test-lab/index.ts:63-66`), `B-repo-detection` reading intake (`workflows/issue-test-lab/index.ts:68-73`), `C-risk-based-test-selection` reading intake and repo detection (`workflows/issue-test-lab/index.ts:75-80`), `D-environment-planning` reading repo detection and test selection (`workflows/issue-test-lab/index.ts:82-87`), `E-validation-execution` reading test selection and environment plan (`workflows/issue-test-lab/index.ts:89-94`), `F-final-report` reading all five artifacts (`workflows/issue-test-lab/index.ts:96-101`), and `report-filename-summary` (`workflows/issue-test-lab/index.ts:103-106`).
- The final report prompt requires issue summary, target/scope and inferred refs, repository evidence, risk-based test inventory, environment plan, validation performed, gaps/unknowns, next actions, confidence, and an explicit statement that only analysis/reporting was performed (`workflows/issue-test-lab/index.ts:97-100`).

#### 5. security-gate stage pipeline
- Inputs: required `target` text (`workflows/security-gate/index.ts:45-49`) and optional `focus` text defaulting to empty (`workflows/security-gate/index.ts:50-54`).
- Constants set workflow name, profile, output mode, and canonical decision labels: `security-gate`, `deep risk-based`, `file-only`, and `pass`, `pass-with-warnings`, `fail`, `inconclusive` at `workflows/security-gate/index.ts:17-22`.
- Gate decision extraction is done by `normalizeGateDecision(output)`, which matches a line `Decision: <label>` case-insensitively/multiline for the four labels and falls back to `inconclusive` if absent (`workflows/security-gate/index.ts:24-32`).
- Validation command posture is prompt-enforced through `scanPolicy`: safe local read-only security scans such as git diff/status, rg secret/config searches, dependency audits that do not require risky network access, existing lint/security scripts, or installed language analyzers; no installs, file changes, lockfile mutation, or external services (`workflows/security-gate/index.ts:67`).
- Artifact filenames are `00-scope-detection.md`, `01-tooling-discovery.md`, `02-automated-scans.md`, `03-secure-code-review.md`, and `04-threat-model-delta.md` with corresponding logical names at `workflows/security-gate/index.ts:69-73`.
- The sequential stages are `security-scope-detection` (`workflows/security-gate/index.ts:75-78`), `tooling-discovery` reading scope (`workflows/security-gate/index.ts:80-85`), `automated-scans` reading scope and tooling (`workflows/security-gate/index.ts:87-92`), `contextual-secure-code-review` reading scope/tooling/scans (`workflows/security-gate/index.ts:94-99`), `threat-model-delta` reading scope and review (`workflows/security-gate/index.ts:101-106`), `gate-decision` reading all five gate artifacts (`workflows/security-gate/index.ts:108-113`), and `report-filename-summary` (`workflows/security-gate/index.ts:115-118`).
- The gate decision prompt requires the first line to be exactly `Decision: <one of pass, pass-with-warnings, fail, inconclusive>` and asks for target, inferred refs/comparison scope, focus, profile, tooling, scans run/skipped, review findings, threat model delta, severity buckets, evidence, remediation guidance, false positives/unverified items, residual risk, and next human actions (`workflows/security-gate/index.ts:109-112`).

#### 6. review-board stage pipeline
- Inputs: required `target` text (`workflows/review-board/index.ts:53-57`) and optional `focus` text defaulting to empty (`workflows/review-board/index.ts:58-62`).
- Constants define `WORKFLOW_NAME = "review-board"`, `REVIEW_DEPTH = "deep"`, `MODEL_STRATEGY = "default best available multi-model strategy"`, `FILE_ONLY_OUTPUT = "file-only"`, and canonical reviewers `correctness`, `architecture`, `testing`, `security`, `performance` (`workflows/review-board/index.ts:17-23`).
- `rolePrompt()` maps each canonical reviewer role to a role-specific prompt and appends shared instructions to inspect files/artifacts, provide severity-ranked evidence, include validation steps and confidence, and not edit or post comments (`workflows/review-board/index.ts:34-49`). The testing role explicitly allows only safe local read-only or targeted validation commands when useful (`workflows/review-board/index.ts:42-43`), and the security role uses local evidence only and disallows external services (`workflows/review-board/index.ts:44-45`).
- Artifact filenames include `00-review-target.md`, `01-review-packet.md`, role-specific review markdown files, `consensus.md`, and `pr-comment-draft.md` (`workflows/review-board/index.ts:76-86`).
- The initial target collection stage uses git/gh/local files when available, degrades when git/gh/network/provider access is unavailable, and disallows modifications, patches, or posting comments (`workflows/review-board/index.ts:88-91`).
- `review-packet` reads the target artifact and summarizes changed behavior, affected files, inferred base/head comparison, architecture context, tests touched/missing, operational risk, open questions, relevant symbols, and safe validation commands (`workflows/review-board/index.ts:93-98`).
- Specialist reviews run via `ctx.parallel()` over all canonical reviewers with `concurrency: 3` and `failFast: false`; each reads the target and packet artifacts and writes to its role artifact in file-only mode (`workflows/review-board/index.ts:100-109`).
- `consensus-judge` reads all reviewer artifacts, deduplicates findings, resolves disagreements, discards unsupported claims, and ranks issues as blocking/recommended/informational (`workflows/review-board/index.ts:111-116`).
- `pr-comment-draft` reads consensus and drafts a copyable manual PR comment without auto-posting or PR API calls (`workflows/review-board/index.ts:118-123`).
- `final-output` reads target, packet, all reviewer reports, consensus, and PR comment draft, then writes final output containing target, inferred refs/comparison scope, review depth, board composition, evidence summary, findings/recommendations, validation notes, gaps, next steps, and the copyable PR comment draft (`workflows/review-board/index.ts:125-136`).

### Report Output Conventions
- `reportSummaryText(value, fallback)` removes markdown/control punctuation `` ` * _ # [ ] ( ) > ``, collapses whitespace, trims, falls back when empty, and limits the summary to 12 words (`src/report-output.ts:17-28`). Workflows use it for returned human summary labels: issue-test-lab at `workflows/issue-test-lab/index.ts:123`, security-gate at `workflows/security-gate/index.ts:136`, and review-board at `workflows/review-board/index.ts:158`.
- `reportFilenameSummary(value, fallback)` normalizes with NFKD, strips combining marks, lowercases, replaces non-alphanumerics with hyphens, trims hyphens, limits to six slug tokens, and falls back to a slugified fallback or `report` (`src/report-output.ts:30-44`).
- `resolveReportPath()` uses optional `cwd` or `process.cwd()`, computes `filenameSummary`, and honors an explicit `outputPath` by resolving relative paths against `cwd`; otherwise it writes to `<cwd>/<workflowName>/<YYYY-MM-DD>-<filenameSummary>.md` (`src/report-output.ts:46-64`).
- `writeWorkflowReport()` creates the report directory recursively and writes the trimmed report plus a trailing newline as UTF-8 (`src/report-output.ts:66-72`).
- The three workflows currently call `writeWorkflowReport()` without `outputPath`, so they use the default dated report path convention: issue-test-lab at `workflows/issue-test-lab/index.ts:108-112`, security-gate at `workflows/security-gate/index.ts:120-124`, and review-board at `workflows/review-board/index.ts:143-147`.

### Manifest and Returned Metadata
- `WorkflowArtifactManifest` contains `runId`, `startedAt`, optional `completedAt`, `input`, `finalReportPath`, and `artifacts` (`src/workflow-artifacts.ts:9-16`).
- `manifestArtifactPaths()` converts each logical artifact path through `displayPath()` and optionally adds a `manifest` entry (`src/workflow-artifacts.ts:59-71`).
- `writeWorkflowManifest()` writes pretty-printed JSON plus newline as UTF-8 (`src/workflow-artifacts.ts:73-78`).
- Each workflow writes `manifest.json` in the artifact directory after the final report is saved, using ISO timestamps, normalized input metadata, `finalReportPath`, and artifact map including the manifest: issue-test-lab at `workflows/issue-test-lab/index.ts:113-122`, security-gate at `workflows/security-gate/index.ts:125-134`, and review-board at `workflows/review-board/index.ts:148-157`.
- Returned metadata from all three includes `summary`, `report_path`, `filename_summary`, `artifact_dir`, `manifest_path`, and `stages`; `security-gate` additionally returns `decision` (`workflows/issue-test-lab/index.ts:125-140`, `workflows/security-gate/index.ts:138-154`, `workflows/review-board/index.ts:160-175`).

### Data Flow
1. User inputs enter each compiled workflow through `ctx.inputs` and are normalized with the local `text()` helper (`workflows/issue-test-lab/index.ts:44-45`, `workflows/security-gate/index.ts:56-57`, `workflows/review-board/index.ts:64-65`).
2. A per-run artifact directory is created through `createWorkflowArtifactRun()`, producing `runId` and `artifactDir` (`src/workflow-artifacts.ts:38-57`).
3. Stage artifact paths are registered with logical names, and most stage tasks are configured with `{ output, outputMode: "file-only" }` so detailed outputs are saved to markdown artifacts (`workflows/issue-test-lab/index.ts:54-65`, `workflows/security-gate/index.ts:66-77`, `workflows/review-board/index.ts:74-90`).
4. Later stages pass previous compact task output through `previous` and read saved markdown artifacts through `reads`, making artifact files the detailed evidence source (for example, issue-test-lab final report at `workflows/issue-test-lab/index.ts:96-100`, security-gate decision at `workflows/security-gate/index.ts:108-112`, review-board final output at `workflows/review-board/index.ts:125-135`).
5. A short `report-filename-summary` task produces 2-5 plain words for filename metadata in each workflow (`workflows/issue-test-lab/index.ts:103-106`, `workflows/security-gate/index.ts:115-118`, `workflows/review-board/index.ts:138-141`).
6. `writeWorkflowReport()` saves the final report, `writeWorkflowManifest()` records the run manifest, and the workflow returns report/artifact/manifest paths plus stage names (`workflows/issue-test-lab/index.ts:108-140`, `workflows/security-gate/index.ts:120-154`, `workflows/review-board/index.ts:143-175`).

### Validation Command Posture
- Across these workflows, validation is prompt-governed and intentionally local/read-only. `issue-test-lab` permits safe local read-only commands and targeted test dry-runs while disallowing edits, installs, generated tests, fixes, and comments (`workflows/issue-test-lab/index.ts:55`, `workflows/issue-test-lab/index.ts:89-93`).
- `security-gate` permits safe local read-only security scans and installed tooling, records unavailable tools/network/dependencies, and disallows dependency installs, file changes, lockfile mutation, remediation, and external services (`workflows/security-gate/index.ts:67`, `workflows/security-gate/index.ts:87-91`).
- `review-board` uses git/gh/local files opportunistically for target collection, degrades when metadata providers are unavailable, disallows modifications and comment posting, and lets testing/security specialists use only safe local evidence/commands (`workflows/review-board/index.ts:88-90`, `workflows/review-board/index.ts:42-45`, `workflows/review-board/index.ts:118-122`).
