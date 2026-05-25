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
const PROFILE = "balanced risk-based";
const ENVIRONMENT = "auto-detected";
const FILE_ONLY_OUTPUT = "file-only" as const;

function targetGuidance(target: string): string {
  return [
    `Target/scope: ${target || "(not provided; infer from issue and repository state)"}`,
    "If a target is provided, infer whether it is a PR number/URL, branch, commit range, current diff, path, or repo scope.",
    "Derive base/head comparison guidance from the target and repository state instead of requiring explicit base/head fields.",
    "If the target is absent or ambiguous, prefer safe local evidence: issue text, git status, current diff, recent commits, mentioned paths, and repository metadata.",
  ].join("\n");
}

export default defineWorkflow(WORKFLOW_NAME)
  .description("Analyze an issue or validation objective, select risk-based tests, and report safe validation evidence without applying changes.")
  .input("issue", {
    type: "text",
    required: true,
    description: "Issue ID, bug report, acceptance criteria, failing behavior, or validation objective.",
  })
  .input("target", {
    type: "text",
    default: "",
    description: "Optional PR number/URL, branch, commit range, current diff, or repo scope.",
  })
  .run(async (ctx) => {
    const issue = text(ctx.inputs.issue);
    const targetInput = text(ctx.inputs.target);
    const startedAt = new Date();
    const { runId, artifactDir } = await createWorkflowArtifactRun(WORKFLOW_NAME, startedAt);
    const artifactPathsByName = new Map<string, string>();
    const addArtifact = (name: string, filename: string): string => {
      const path = markdownArtifact(artifactDir, filename);
      artifactPathsByName.set(name, path);
      return path;
    };
    const fileOnlyOutput = (output: string) => ({ output, outputMode: FILE_ONLY_OUTPUT });
    const commandPolicy = "Run only safe local read-only commands when useful, such as git status/diff/log, rg/grep, package-manager script discovery, and targeted test dry-runs. If git metadata, package managers, test CLIs, Docker, or devcontainer support are missing, record the limitation and continue from file evidence. Do not edit files, install dependencies, generate tests, apply fixes, or post comments.";

    const intakePath = addArtifact("intake", "00-intake.md");
    const repoDetectionPath = addArtifact("repo-detection", "01-repo-detection.md");
    const testSelectionPath = addArtifact("risk-based-test-selection", "02-risk-based-test-selection.md");
    const environmentPlanPath = addArtifact("environment-planning", "03-environment-planning.md");
    const validationPath = addArtifact("validation-execution", "04-validation-execution.md");

    const intake = await ctx.task("A-intake", {
      prompt: `You are stage A (intake) for the Atomic issue-test-lab workflow.\n\nIssue / validation objective:\n${issue}\n\n${targetGuidance(targetInput)}\nInternal defaults: ${PROFILE} profile, safe commands enabled, environment auto-detected, auto-generated report path.\n\nCreate an issue intake only. Identify expected behavior, observed/failing behavior, acceptance criteria, unknowns, and likely affected user flows. Inspect the repository directly. ${commandPolicy}\n\nDefault to analysis and reporting. Do not modify files, create tests, apply fixes, or post comments. Cite file paths, commands, outputs, and confidence where available.`,
      ...fileOnlyOutput(intakePath),
    });

    const repoDetection = await ctx.task("B-repo-detection", {
      previous: intake,
      reads: [intakePath],
      prompt: `You are stage B (repo detection) for issue-test-lab.\n\nRead intake artifact at ${displayPath(intakePath)}. Compact saved-output reference: {previous}\n\nDetect repository shape, languages, package managers, test frameworks, CI configuration, existing test conventions, fixtures, environment options, and likely implementation surfaces for the issue. Prefer local evidence. ${commandPolicy}\n\nIf tools or environment features are unavailable, degrade gracefully and explain the fallback. Do not modify files.`,
      ...fileOnlyOutput(repoDetectionPath),
    });

    const testSelection = await ctx.task("C-risk-based-test-selection", {
      previous: repoDetection,
      reads: [intakePath, repoDetectionPath],
      prompt: `You are stage C (risk-based test selection) for issue-test-lab.\n\nRead prior artifacts before selecting tests:\n- Intake: ${displayPath(intakePath)}\n- Repo detection: ${displayPath(repoDetectionPath)}\n\nCompact saved-output reference: {previous}\n\nSelect tests based on issue risk and profile (${PROFILE}). Separate smoke, focused regression, integration/e2e, edge-case, and negative-path checks. For each recommended check include target files, setup, assertion, risk reduced, priority, and confidence.\n\nDo not write tests or change source files.`,
      ...fileOnlyOutput(testSelectionPath),
    });

    const environmentPlan = await ctx.task("D-environment-planning", {
      previous: testSelection,
      reads: [repoDetectionPath, testSelectionPath],
      prompt: `You are stage D (environment planning) for issue-test-lab.\n\nRead prior artifacts before planning:\n- Repo detection: ${displayPath(repoDetectionPath)}\n- Test selection: ${displayPath(testSelectionPath)}\n\nCompact saved-output reference: {previous}\n\nPlan how validation should run with environment ${ENVIRONMENT}. Detect whether local, Docker, or devcontainer execution appears supported. Include prerequisites, safe commands, expected runtime, skipped/unsafe commands, and fallback instructions when CLIs or containers are unavailable.\n\n${commandPolicy} Do not modify files or start long-running services unless clearly safe and necessary for read-only validation.`,
      ...fileOnlyOutput(environmentPlanPath),
    });

    const validation = await ctx.task("E-validation-execution", {
      previous: environmentPlan,
      reads: [testSelectionPath, environmentPlanPath],
      prompt: `You are stage E (validation execution) for issue-test-lab.\n\nRead prior artifacts before validation:\n- Test selection: ${displayPath(testSelectionPath)}\n- Environment plan: ${displayPath(environmentPlanPath)}\n\nCompact saved-output reference: {previous}\nResolved command policy: safe local read-only feasible commands are enabled.\n\nRun only safe high-signal read-only feasible commands. If commands cannot run because tools, dependencies, containers, network, or context are missing, record that clearly. Capture exact commands, exit status, important output, and interpretation.\n\nDo not edit files, generate tests, apply fixes, or post comments.`,
      ...fileOnlyOutput(validationPath),
    });

    const finalReadPaths = [intakePath, repoDetectionPath, testSelectionPath, environmentPlanPath, validationPath];
    const finalReport = await ctx.task("F-final-report", {
      previous: validation,
      reads: finalReadPaths,
      prompt: `You are stage F (final report) for issue-test-lab.\n\nUse the artifact files as the source of detailed evidence instead of relying on inline transcripts:\n${finalReadPaths.map((path) => `- ${displayPath(path)}`).join("\n")}\n\nCompact saved-output reference from validation stage: {previous}\n\nWrite a concise final report with: issue summary, target/scope and inferred refs, repository evidence, risk-based test inventory, environment plan, validation performed, gaps/unknowns, recommended next human actions, and confidence. State explicitly that this workflow performed analysis/reporting only and did not apply changes.\n\nThe workflow runtime will save this report to disk after this stage. Do not include save-location boilerplate in the report body.`,
    });

    const reportSummary = await ctx.task("report-filename-summary", {
      previous: finalReport,
      prompt: `Create a short topic summary for this issue-test-lab report filename and return metadata.\n\nFinal report:\n{previous}\n\nUser context:\n- Issue: ${issue}\n- Target: ${targetInput || "(not provided)"}\n\nReturn exactly 2-5 plain words. No markdown, punctuation, quotes, dates, or workflow name.`,
    });

    const savedReport = await writeWorkflowReport({
      workflowName: WORKFLOW_NAME,
      summary: reportSummary.text,
      report: finalReport.text,
    });
    const manifestPath = join(artifactDir, "manifest.json");
    const completedAt = new Date();
    await writeWorkflowManifest(manifestPath, {
      runId,
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      input: { issue, target: targetInput },
      finalReportPath: displayPath(savedReport.reportPath),
      artifacts: manifestArtifactPaths(artifactPathsByName, manifestPath),
    });
    const summary = reportSummaryText(reportSummary.text, "issue test lab report");

    return {
      summary,
      report_path: savedReport.reportPath,
      filename_summary: savedReport.filenameSummary,
      artifact_dir: displayPath(artifactDir),
      manifest_path: displayPath(manifestPath),
      stages: [
        intake.stageName,
        repoDetection.stageName,
        testSelection.stageName,
        environmentPlan.stageName,
        validation.stageName,
        finalReport.stageName,
        reportSummary.stageName,
      ],
    };
  })
  .compile();
