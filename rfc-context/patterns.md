# Pattern Examples for RFC Context

## 1) Normalized decision parsing / metadata

### Pattern: explicit decision token + normalization fallback
**Found in**: `workflows/security-gate/index.ts:20-31, 109-136`

```ts
const GATE_DECISIONS = ["pass", "pass-with-warnings", "fail", "inconclusive"] as const;

type GateDecision = (typeof GATE_DECISIONS)[number];

function normalizeGateDecision(output: string): GateDecision {
  const match = output.match(/^\s*Decision:\s*(pass|pass-with-warnings|fail|inconclusive)\s*$/im);
  const decision = match?.[1];
  if (!decision) {
    return "inconclusive";
  }

  return decision.toLowerCase() as GateDecision;
}
```

Prompt contract and return metadata:

```ts
Begin with a line exactly: Decision: <one of pass, pass-with-warnings, fail, inconclusive>.
...
const decision = normalizeGateDecision(gateDecision.text);
...
return { ..., decision };
```

**Found in**: `workflows/security-gate/README.md:20-23, 43-45, 70-71`

- decision labels are constrained to four values
- workflow returns compact metadata including `decision`

## 2) Target-first inputs

### Pattern: target is primary input; prompt infers comparison scope from it
**Found in**: `workflows/security-gate/index.ts:34-39, 45-54, 75-77`

```ts
function targetGuidance(target: string): string {
  return [
    `User target: ${target || "repo"}`,
    "Infer whether the target is a PR number/URL, branch, commit range, current diff, path, or whole repo.",
    "Derive base/head comparison guidance from the target and repository state instead of requiring explicit base/head fields.",
    "If the target is ambiguous, prefer safe local evidence: git status, current diff, recent commits, mentioned paths, and repository metadata.",
  ].join("\n");
}
```

```ts
.input("target", {
  type: "text",
  required: true,
  description: "PR number/URL, branch, commit range, current diff, path, or repo.",
})
```

**Found in**: `workflows/review-board/index.ts:25-30, 53-62, 88-90`

```ts
.input("target", {
  type: "text",
  required: true,
  description: "PR number/URL, branch, commit range, current diff, path, or repo.",
})
```

**Found in**: `workflows/issue-test-lab/index.ts:22-27, 33-42, 63-65`

```ts
function targetGuidance(target: string): string {
  return [
    `Target/scope: ${target || "(not provided; infer from issue and repository state)"}`,
    "If a target is provided, infer whether it is a PR number/URL, branch, commit range, current diff, path, or repo scope.",
    "Derive base/head comparison guidance from the target and repository state instead of requiring explicit base/head fields.",
    "If the target is absent or ambiguous, prefer safe local evidence: issue text, git status, current diff, recent commits, mentioned paths, and repository metadata.",
  ].join("\n");
}
```

## 3) Artifact manifest usage

### Pattern: hidden run dir + manifest with artifact path map
**Found in**: `src/workflow-artifacts.ts:9-16, 38-82`

```ts
export interface WorkflowArtifactManifest {
  runId: string;
  startedAt: string;
  completedAt?: string;
  input: Record<string, unknown>;
  finalReportPath: string;
  artifacts: Record<string, string>;
}
```

```ts
const artifactDir = join(cwd, `.${workflowName}-${runId}`);
...
export function manifestArtifactPaths(
  artifactPathsByName: ReadonlyMap<string, string>,
  manifestPath?: string,
): Record<string, string> {
  const artifacts: Record<string, string> = {};
  for (const [name, path] of artifactPathsByName) {
    artifacts[name] = displayPath(path);
  }
  if (manifestPath !== undefined) {
    artifacts.manifest = displayPath(manifestPath);
  }
  return artifacts;
}
```

**Found in**: `workflows/security-gate/index.ts:59-73, 125-135`

```ts
const { runId, artifactDir } = await createWorkflowArtifactRun(WORKFLOW_NAME, startedAt);
const artifactPathsByName = new Map<string, string>();
const addArtifact = (name: string, filename: string): string => {
  const path = markdownArtifact(artifactDir, filename);
  artifactPathsByName.set(name, path);
  return path;
};
...
const manifestPath = join(artifactDir, "manifest.json");
await writeWorkflowManifest(manifestPath, {
  runId,
  startedAt: startedAt.toISOString(),
  completedAt: completedAt.toISOString(),
  input: { target: targetInput, focus },
  finalReportPath: displayPath(savedReport.reportPath),
  artifacts: manifestArtifactPaths(artifactPathsByName, manifestPath),
});
```

## 4) Hidden intermediate outputs

### Pattern: stage outputs saved to hidden run-specific markdown files
**Found in**: `src/workflow-artifacts.ts:38-57, 80-82`

```ts
const artifactDir = join(cwd, `.${workflowName}-${runId}`);
```

```ts
export function markdownArtifact(artifactDir: string, filename: string): string {
  return join(artifactDir, filename);
}
```

**Found in**: `workflows/review-board/index.ts:76-86, 100-123`

```ts
const targetPath = addArtifact("review-target", "00-review-target.md");
const packetPath = addArtifact("review-packet", "01-review-packet.md");
const reviewerPaths = {
  correctness: addArtifact("correctness-review", "correctness-review.md"),
  architecture: addArtifact("architecture-review", "architecture-review.md"),
  testing: addArtifact("testing-review", "testing-review.md"),
  security: addArtifact("security-review", "security-review.md"),
  performance: addArtifact("performance-review", "performance-review.md"),
};
```

```ts
const specialistReports = await ctx.parallel(
  CANONICAL_REVIEWERS.map((role) => ({
    name: `${role}-review`,
    previous: packet,
    reads: [targetPath, packetPath],
    ...fileOnlyOutput(reviewerPaths[role]),
  })),
  { concurrency: 3, failFast: false },
);
```

**Found in**: `workflows/README.md:40-42`

- hidden artifact directories contain markdown stage outputs and a manifest
- final aggregation reads files instead of relying on inline transcripts

## 5) Saved markdown reports

### Pattern: final report persisted to `./<workflow>/<date>-<slug>.md`
**Found in**: `src/report-output.ts:46-71`

```ts
return {
  reportPath: join(cwd, options.workflowName, `${date}-${filenameSummary}.md`),
  filenameSummary,
};
```

```ts
await mkdir(dirname(savedReport.reportPath), { recursive: true });
await writeFile(savedReport.reportPath, `${options.report.trimEnd()}\n`, "utf8");
```

**Found in**: `workflows/README.md:32-42` and workflow READMEs

```text
./review-board/YYYY-MM-DD-<ai-generated-topic>.md
./security-gate/YYYY-MM-DD-<ai-generated-topic>.md
./issue-test-lab/YYYY-MM-DD-<ai-generated-topic>.md
```

**Found in**: `workflows/issue-test-lab/index.ts:108-123`, `workflows/security-gate/index.ts:120-136`, `workflows/review-board/index.ts:143-158`

```ts
const savedReport = await writeWorkflowReport({
  workflowName: WORKFLOW_NAME,
  summary: reportSummary.text,
  report: finalReport.text,
});
```

## 6) README documentation patterns

### Pattern: workflow README mirrors code contract and artifact layout
**Found in**: `workflows/security-gate/README.md:1-23, 43-71`

- title + one-line purpose
- source link
- posture line
- run examples
- inputs table
- execution stages list
- output/artifact layout
- compact return metadata

Example:

```md
- **Posture:** no remediation and no auto-posting.
- **Final report folder:** `./security-gate/`
- **Artifact folder:** hidden run directory `./.security-gate-<run-id>/`
```

**Found in**: `workflows/README.md:28-42`

- central registry doc explains report saving, hidden artifacts, and return shape
- workflow-specific docs are linked from the registry README and the top-level README

**Found in**: `README.md:71-91`

- top-level README points readers to per-workflow docs
- docs list the workflow inputs and the report/artifact behavior

## Cross-cutting examples

### Review-board report assembly
**Found in**: `workflows/review-board/index.ts:125-158`

```ts
const finalReadPaths = [
  targetPath,
  packetPath,
  ...CANONICAL_REVIEWERS.map((role) => reviewerPaths[role]),
  consensusPath,
  prCommentPath,
];
```

```ts
return {
  summary,
  report_path: savedReport.reportPath,
  filename_summary: savedReport.filenameSummary,
  artifact_dir: displayPath(artifactDir),
  manifest_path: displayPath(manifestPath),
  stages: [...],
};
```

### Spec-driven-development research artifact + manifest
**Found in**: `workflows/spec-driven-development/index.ts:920-928, 1015-1055` and `workflows/spec-driven-development/README.md:65-71, 83-121`

```ts
const researchManifestPath = join(researchArtifactDir, "manifest.json");
await writeWorkflowManifest(researchManifestPath, {
  runId: researchRunId,
  startedAt: researchStartedAt.toISOString(),
  completedAt: new Date().toISOString(),
  input: { mode: resolvedMode, prompt: initialPrompt, implementationIntent: implementationIntent.name },
  finalReportPath: displayPath(researchPath),
  artifacts: manifestArtifactPaths(researchArtifactPathsByName, researchManifestPath),
});
```

```ts
return {
  status: "approved-ready-for-ralph",
  research_artifact_dir: displayPath(researchArtifactDir),
  research_manifest_path: displayPath(researchManifestPath),
  spec_path: specPath,
  approved_spec_path: specPath,
  ralph_workflow: "ralph",
  ralph_inputs: ralphInputs,
  ralph_command: ralphCommand,
};
```
