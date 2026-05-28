import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { defineWorkflow } from "@bastani/workflows";
import { reportSummaryText, writeWorkflowReport } from "../../src/report-output.js";
import {
  createWorkflowArtifactRun,
  displayPath,
  manifestArtifactPaths,
  markdownArtifact,
  writeWorkflowManifest,
} from "../../src/workflow-artifacts.js";

function text(value: unknown, fallback = ""): string {
  const result = String(value ?? fallback).trim();
  return result.length > 0 ? result : fallback;
}

const WORKFLOW_NAME = "issue-test-lab";
const PROFILE = "target-first merge-readiness validation";
const FILE_ONLY_OUTPUT = "file-only" as const;
const TARGET_SUMMARY_LABEL = "Target summary";
const RISK_LEVEL_LABEL = "Risk level";
const VALIDATION_SUMMARY_LABEL = "Validation summary";
const TARGET_RESOLUTION_LABEL = "Target resolution";
const RECOMMENDATIONS = ["pass", "warn", "block", "unknown"] as const;
const RISK_LEVELS = ["low", "medium", "high", "unknown"] as const;
const TARGET_RESOLUTIONS = ["resolved", "unresolved"] as const;
const RECOMMENDATION_FIRST_LINE_PATTERN = new RegExp(`^Recommendation: (${RECOMMENDATIONS.join("|")})$`);
const COMMAND_POLICY = [
  "Run only safe high-signal local validation commands selected from repository evidence.",
  "Allowed read-only discovery includes git status/diff/log, rg/grep searches, manifest/script inspection, and already-configured validation commands when they are feasible.",
  "Do not edit source files, generate tests, apply remediations, install dependencies, mutate lockfiles, start unbounded services, push changes, or post PR comments.",
  "Avoid implicit installs, including npx commands that may download packages. Use existing package scripts or local binaries only when their no-install behavior is clear.",
  "If tools, dependencies, test CLIs, git metadata, containers, network, or provider access are missing, record the limitation and continue from file evidence.",
  "Never recommend pass merely because no tests or validation surfaces were found.",
].join(" ");

type Recommendation = (typeof RECOMMENDATIONS)[number];
type RiskLevel = (typeof RISK_LEVELS)[number];
type TargetResolution = (typeof TARGET_RESOLUTIONS)[number];

function escapedRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractEnumLine<T extends string>(
  output: string,
  label: string,
  allowedValues: readonly T[],
  fallback: T,
): T {
  const valuesPattern = allowedValues.map(escapedRegExp).join("|");
  const match = output.match(new RegExp(`^\\s*${escapedRegExp(label)}:\\s*(${valuesPattern})\\s*$`, "im"));
  const value = match?.[1];
  if (!value) {
    return fallback;
  }

  return value.toLowerCase() as T;
}

function normalizeRecommendation(output: string): Recommendation {
  const firstLine = output.split(/\r?\n/, 1)[0] ?? "";
  const match = firstLine.match(RECOMMENDATION_FIRST_LINE_PATTERN);
  return (match?.[1] as Recommendation | undefined) ?? "unknown";
}

function normalizeRiskLevel(output: string): RiskLevel {
  return extractEnumLine(output, RISK_LEVEL_LABEL, RISK_LEVELS, "unknown");
}

function parseTargetResolution(output: string): TargetResolution {
  return extractEnumLine(output, TARGET_RESOLUTION_LABEL, TARGET_RESOLUTIONS, "unresolved");
}

async function readArtifactText(path: string, fallback = ""): Promise<string> {
  try {
    return await readFile(path, "utf8");
  } catch {
    return fallback;
  }
}

async function readTargetResolution(path: string): Promise<TargetResolution> {
  return parseTargetResolution(await readArtifactText(path));
}

function extractLabeledLine(output: string, label: string, fallback: string): string {
  const match = output.match(new RegExp(`^\\s*${escapedRegExp(label)}:\\s*(.+?)\\s*$`, "im"));
  return text(match?.[1], fallback);
}

function targetGuidance(target: string): string {
  return [
    `Target/scope: ${target || "(not provided; infer from local branch, working tree, and repository state)"}`,
    "Infer whether the target is a PR number/URL, branch, commit range, current diff, path, or whole repo.",
    "Derive base/head comparison guidance from the target and repository state instead of requiring explicit base/head fields.",
    "If the target is absent or ambiguous, prefer safe local evidence: git status, current diff, recent commits, mentioned paths, and repository metadata.",
    "Optional gh usage must be read-only and only when already available; do not require network or provider access.",
  ].join("\n");
}

function focusGuidance(focus: string, issue: string): string {
  if (focus && issue) {
    return [
      `Primary validation focus: ${focus}`,
      `Deprecated issue compatibility context: ${issue}`,
      "Use focus as the primary instruction. Treat issue only as supplementary context.",
    ].join("\n");
  }

  if (focus) {
    return `Primary validation focus: ${focus}`;
  }

  if (issue) {
    return [
      `Deprecated issue compatibility context: ${issue}`,
      "No focus input was provided, so use issue as supplementary validation context without reverting to issue-first behavior.",
    ].join("\n");
  }

  return "Primary validation focus: (none; validate merge readiness from target and repository evidence)";
}

export default defineWorkflow(WORKFLOW_NAME)
  .description("Validate target merge readiness from repository evidence and return a pass/warn/block/unknown recommendation without applying changes.")
  .input("target", {
    type: "text",
    default: "",
    description: "Optional PR number/URL, branch, commit range, current diff, path, or repo. If omitted, inspect local branch and working tree.",
  })
  .input("focus", {
    type: "text",
    default: "",
    description: "Optional validation focus, affected area, risk area, or human guidance.",
  })
  .input("issue", {
    type: "text",
    default: "",
    description: "Deprecated compatibility alias for focus/additional context.",
  })
  .run(async (ctx) => {
    const targetInput = text(ctx.inputs.target);
    const focus = text(ctx.inputs.focus);
    const issue = text(ctx.inputs.issue);
    const startedAt = new Date();
    const { runId, artifactDir } = await createWorkflowArtifactRun(WORKFLOW_NAME, startedAt);
    const artifactPathsByName = new Map<string, string>();
    const addArtifact = (name: string, filename: string): string => {
      const path = markdownArtifact(artifactDir, filename);
      artifactPathsByName.set(name, path);
      return path;
    };
    const fileOnlyOutput = (output: string) => ({ output, outputMode: FILE_ONLY_OUTPUT });
    const runContext = [targetGuidance(targetInput), focusGuidance(focus, issue)].join("\n");

    const targetIntakePath = addArtifact("target-intake", "A-target-intake.md");

    const targetIntake = await ctx.task("A-target-intake", {
      prompt: `You are stage A (target intake) for the Atomic issue-test-lab workflow. The workflow is now target-first merge-readiness validation, not issue-first test planning.

${runContext}
Internal defaults: ${PROFILE}, safe commands enabled, auto-generated report path.

Start the artifact with exactly these two machine-readable metadata lines:
${TARGET_RESOLUTION_LABEL}: <one of ${TARGET_RESOLUTIONS.join("|")}>
${TARGET_SUMMARY_LABEL}: <compact target/scope summary>

Use resolved when a valid target scope is available, including fallback to usable local repository/worktree evidence when no explicit target was provided. Use unresolved when an explicit requested target cannot be matched, is ambiguous, is unavailable, or repository/git evidence is too incomplete to know what should be validated. Prefer unresolved for malformed or missing evidence.

Resolve the validation target and collect only local/read-only evidence. Identify target type, inferred base/head or scope, changed files, relevant commits, current worktree status, optional read-only PR metadata if already available, and unresolved target questions. ${COMMAND_POLICY}

If the target cannot be resolved, say so clearly and gather enough repository context for a final Recommendation: unknown. Cite file paths, commands, outputs, and confidence. Do not modify files, create tests, install dependencies, apply fixes, or post comments.`,
      ...fileOnlyOutput(targetIntakePath),
    });

    const targetResolution = await readTargetResolution(targetIntakePath);

    if (targetResolution !== "resolved") {
      const unresolvedValidationSummary = "validation skipped because target could not be resolved";
      const unresolvedTargetSummary = targetInput || "unresolved target scope";
      const unresolvedReport = [
        "Recommendation: unknown",
        "",
        "## Executive summary",
        "The requested validation target could not be resolved from Stage A target-intake evidence, so merge-readiness validation was intentionally short-circuited.",
        "",
        "## Target reviewed",
        `- Target input: ${targetInput || "(not provided)"}`,
        `- Focus: ${focus || "(none)"}`,
        `- Deprecated issue context: ${issue || "(none)"}`,
        `- Target-intake artifact: ${displayPath(targetIntakePath)}`,
        "",
        "## Changed/affected areas",
        "Unknown because the target was unresolved.",
        "",
        "## Validation performed",
        "No validation planning or validation execution commands were run because the target could not be resolved safely.",
        "",
        "## Results",
        "Recommendation is unknown. Validation evidence would be misleading until the target is corrected or made available.",
        "",
        "## Risks and gaps",
        "- Target resolution failed or was unparseable.",
        "- No command results were collected for merge-readiness assessment.",
        "",
        "## Actionable next steps",
        "- Re-run the workflow with a resolvable PR number/URL, branch, commit range, current diff, path, or repository scope.",
        "- Review the target-intake artifact for the specific resolution evidence and gaps.",
        "",
        "## Evidence appendix",
        `- Stage A target intake: ${displayPath(targetIntakePath)}`,
        "",
        "## Analysis-only statement",
        "No code changes, test generation, remediation, dependency installation, lockfile mutation, or PR posting occurred.",
      ].join("\n");

      const reportSummary = await ctx.task("report-filename-summary", {
        prompt: `Create a short topic summary for this issue-test-lab report filename and return metadata.

Final validation report:
${unresolvedReport}

User context:
- Target: ${targetInput || "(not provided)"}
- Focus: ${focus || "(none)"}
- Deprecated issue context: ${issue || "(none)"}

Return exactly 2-5 plain words. No markdown, punctuation, quotes, dates, or workflow name.`,
      });

      const savedReport = await writeWorkflowReport({
        workflowName: WORKFLOW_NAME,
        summary: reportSummary.text,
        report: unresolvedReport,
      });
      const manifestPath = join(artifactDir, "manifest.json");
      const completedAt = new Date();
      await writeWorkflowManifest(manifestPath, {
        runId,
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        input: { target: targetInput, focus, issue, targetResolution },
        finalReportPath: displayPath(savedReport.reportPath),
        artifacts: manifestArtifactPaths(artifactPathsByName, manifestPath),
      });
      const summary = reportSummaryText(reportSummary.text, "merge readiness validation report");

      return {
        summary,
        recommendation: "unknown" as Recommendation,
        reportPath: savedReport.reportPath,
        artifactManifestPath: displayPath(manifestPath),
        targetSummary: unresolvedTargetSummary,
        riskLevel: "unknown" as RiskLevel,
        validationSummary: unresolvedValidationSummary,
        report_path: savedReport.reportPath,
        filename_summary: savedReport.filenameSummary,
        artifact_dir: displayPath(artifactDir),
        manifest_path: displayPath(manifestPath),
        stages: [targetIntake.stageName, reportSummary.stageName],
      };
    }

    const repoDetectionPath = addArtifact("repo-detection", "B-repo-detection.md");
    const riskAnalysisPath = addArtifact("risk-analysis", "C-risk-analysis.md");
    const validationPlanPath = addArtifact("validation-plan", "D-validation-plan.md");
    const validationExecutionPath = addArtifact("validation-execution", "E-validation-execution.md");
    const coverageGapsPath = addArtifact("coverage-gaps", "F-coverage-gaps.md");

    const repoDetection = await ctx.task("B-repo-detection", {
      previous: targetIntake,
      reads: [targetIntakePath],
      prompt: `You are stage B (repository validation surface detection) for issue-test-lab.

Read target intake at ${displayPath(targetIntakePath)}. Compact saved-output reference: {previous}

Detect repository validation surfaces from local evidence: package managers and lockfiles, package.json scripts, test framework configs, test files, coverage commands/config, CI config, Playwright/Cypress/e2e tooling, frontend/backend framework indicators, monorepo layout, and environment constraints. ${COMMAND_POLICY}

If no validation infrastructure exists, record that explicitly as a gap rather than success. Do not modify files.`,
      ...fileOnlyOutput(repoDetectionPath),
    });

    const riskAnalysis = await ctx.task("C-risk-analysis", {
      previous: repoDetection,
      reads: [targetIntakePath, repoDetectionPath],
      prompt: `You are stage C (risk analysis) for issue-test-lab.

Read prior artifacts before analyzing risk:
- Target intake: ${displayPath(targetIntakePath)}
- Repo detection: ${displayPath(repoDetectionPath)}

Compact saved-output reference: {previous}

Classify affected areas from the target evidence: frontend/UI, backend/API, data/persistence, auth/security-sensitive, build/tooling, tests-only, documentation-only, workflow/CI, unknown/mixed. Identify risk signals such as critical path, public API change, config/dependency changes, test deletion or weakening, large diff, missing nearby tests, and missing runnable validation path.

Start the artifact with exactly one machine-readable risk line: ${RISK_LEVEL_LABEL}: <one of ${RISK_LEVELS.join("|")}>.

Assign an overall risk level using only ${RISK_LEVELS.join("|")} and explain evidence. ${COMMAND_POLICY} Do not modify files.`,
      ...fileOnlyOutput(riskAnalysisPath),
    });

    const validationPlan = await ctx.task("D-validation-plan", {
      previous: riskAnalysis,
      reads: [targetIntakePath, repoDetectionPath, riskAnalysisPath],
      prompt: `You are stage D (validation plan) for issue-test-lab.

Read prior artifacts before planning:
- Target intake: ${displayPath(targetIntakePath)}
- Repo detection: ${displayPath(repoDetectionPath)}
- Risk analysis: ${displayPath(riskAnalysisPath)}

Compact saved-output reference: {previous}

Select safe, high-signal validation commands that are feasible from discovered repository evidence. Prefer existing scripts and targeted validation over broad suites. Run lint/typecheck/build/test/e2e only when scripts/configuration and dependencies appear available and relevant. Do not use implicit npx installs. Do not choose commands that mutate source, generate tests, update snapshots, alter lockfiles, install packages, start unbounded services, or post comments.

For each planned command include exact command, working directory, evidence that it exists, risk it covers, expected signal, safety notes, and skip conditions. Also list skipped commands with reasons. ${COMMAND_POLICY}`,
      ...fileOnlyOutput(validationPlanPath),
    });

    const validationExecution = await ctx.task("E-validation-execution", {
      previous: validationPlan,
      reads: [validationPlanPath],
      prompt: `You are stage E (validation execution) for issue-test-lab.

Read validation plan at ${displayPath(validationPlanPath)}. Compact saved-output reference: {previous}
Resolved command policy: safe high-signal feasible validation only.

Execute only commands selected in the plan that remain safe and feasible. Before each command, re-check that it will not install dependencies, mutate lockfiles, generate tests, update snapshots, edit source, start unbounded services, push, or post comments. Skip unsafe or ambiguous commands and explain why.

For each attempted command capture exact command, working directory, exit status, key output summary, and interpretation. Categorize outcomes as passed, failed, skipped, not runnable due to missing dependencies/config, or not attempted due to safety/ambiguity. ${COMMAND_POLICY}`,
      ...fileOnlyOutput(validationExecutionPath),
    });

    const coverageGaps = await ctx.task("F-coverage-gaps", {
      previous: validationExecution,
      reads: [targetIntakePath, repoDetectionPath, riskAnalysisPath, validationPlanPath, validationExecutionPath],
      prompt: `You are stage F (coverage gaps) for issue-test-lab.

Read prior artifacts before analyzing gaps:
- Target intake: ${displayPath(targetIntakePath)}
- Repo detection: ${displayPath(repoDetectionPath)}
- Risk analysis: ${displayPath(riskAnalysisPath)}
- Validation plan: ${displayPath(validationPlanPath)}
- Validation execution: ${displayPath(validationExecutionPath)}

Compact saved-output reference: {previous}

Start the artifact with exactly one machine-readable validation summary line: ${VALIDATION_SUMMARY_LABEL}: <compact command/result/gap summary>.

Assess whether validation evidence meaningfully covers the target. Treat missing tests, no relevant tests found, unavailable tooling, ambiguous target, skipped UI/e2e paths, and static source-to-test guesses as gaps rather than success. For UI-facing changes without runnable UI validation, recommend warn when other meaningful validation exists and unknown when no meaningful evidence exists. For critical-path changes with no viable validation, explain whether concrete risk justifies block or whether evidence supports warn/unknown.

Do not modify files.`,
      ...fileOnlyOutput(coverageGapsPath),
    });

    const finalReadPaths = [
      targetIntakePath,
      repoDetectionPath,
      riskAnalysisPath,
      validationPlanPath,
      validationExecutionPath,
      coverageGapsPath,
    ];
    const finalRecommendation = await ctx.task("G-final-recommendation", {
      previous: coverageGaps,
      reads: finalReadPaths,
      prompt: `You are stage G (final recommendation) for issue-test-lab.

Use the artifact files as the source of detailed evidence instead of relying on inline transcripts:
${finalReadPaths.map((path) => `- ${displayPath(path)}`).join("\n")}

Compact saved-output reference from coverage gaps stage: {previous}

Write the final merge-readiness validation report. The first line of the report must be exactly one machine-readable line in this form: Recommendation: <one of ${RECOMMENDATIONS.join("|")}>. Do not put any text, markdown heading, or blank line before it. Do not include any other line starting with Recommendation:.

Recommendation semantics:
- pass: target resolved; relevant validation passed or the change is low-risk/docs-only; no relevant command failed; remaining gaps are minor and disclosed.
- warn: useful evidence exists and no blocker was observed, but meaningful gaps or moderate risk remain.
- block: observed validation failure or concrete high-risk unvalidated change should prevent merge.
- unknown: target, environment, repository evidence, or command results are insufficient for a reliable recommendation.
Never emit pass for code changes solely because no tests were found.

After the recommendation line, the first non-empty report content must be exactly ## Executive summary.
Do not include plain return-metadata prelude lines such as ${TARGET_SUMMARY_LABEL}:, ${RISK_LEVEL_LABEL}:, or ${VALIDATION_SUMMARY_LABEL}: in the final report body.

Then include these required sections using Markdown level-two headings: Executive summary, Target reviewed, Changed/affected areas, Validation performed, Results, Risks and gaps, Actionable next steps, Evidence appendix, and Analysis-only statement. The analysis-only statement must explicitly say that no code changes, test generation, remediation, dependency installation, lockfile mutation, or PR posting occurred.

The workflow runtime will save this report to disk after this stage. Do not include save-location boilerplate in the report body.`,
    });

    const reportSummary = await ctx.task("report-filename-summary", {
      previous: finalRecommendation,
      prompt: `Create a short topic summary for this issue-test-lab report filename and return metadata.

Final validation report:
{previous}

User context:
- Target: ${targetInput || "(not provided)"}
- Focus: ${focus || "(none)"}
- Deprecated issue context: ${issue || "(none)"}

Return exactly 2-5 plain words. No markdown, punctuation, quotes, dates, or workflow name.`,
    });

    const savedReport = await writeWorkflowReport({
      workflowName: WORKFLOW_NAME,
      summary: reportSummary.text,
      report: finalRecommendation.text,
    });
    const manifestPath = join(artifactDir, "manifest.json");
    const completedAt = new Date();
    await writeWorkflowManifest(manifestPath, {
      runId,
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      input: { target: targetInput, focus, issue, targetResolution },
      finalReportPath: displayPath(savedReport.reportPath),
      artifacts: manifestArtifactPaths(artifactPathsByName, manifestPath),
    });
    const recommendation = normalizeRecommendation(finalRecommendation.text);
    const [targetIntakeArtifact, riskAnalysisArtifact, coverageGapsArtifact] = await Promise.all([
      readArtifactText(targetIntakePath),
      readArtifactText(riskAnalysisPath),
      readArtifactText(coverageGapsPath),
    ]);
    const targetSummary = extractLabeledLine(
      targetIntakeArtifact,
      TARGET_SUMMARY_LABEL,
      targetInput || "local repository state",
    );
    const riskLevel = normalizeRiskLevel(riskAnalysisArtifact);
    const validationSummary = extractLabeledLine(
      coverageGapsArtifact,
      VALIDATION_SUMMARY_LABEL,
      "validation evidence summarized in final report",
    );
    const summary = reportSummaryText(reportSummary.text, "merge readiness validation report");

    return {
      summary,
      recommendation,
      reportPath: savedReport.reportPath,
      artifactManifestPath: displayPath(manifestPath),
      targetSummary,
      riskLevel,
      validationSummary,
      report_path: savedReport.reportPath,
      filename_summary: savedReport.filenameSummary,
      artifact_dir: displayPath(artifactDir),
      manifest_path: displayPath(manifestPath),
      stages: [
        targetIntake.stageName,
        repoDetection.stageName,
        riskAnalysis.stageName,
        validationPlan.stageName,
        validationExecution.stageName,
        coverageGaps.stageName,
        finalRecommendation.stageName,
        reportSummary.stageName,
      ],
    };
  })
  .compile();
