import { defineWorkflow } from "@bastani/workflows";
import { reportSummaryText, writeWorkflowReport } from "./report-output.js";

function text(value: unknown, fallback = ""): string {
  const result = String(value ?? fallback).trim();
  return result.length > 0 ? result : fallback;
}

export default defineWorkflow("issue-test-lab")
  .description("Analyze issues, select risk-based tests, and report validation evidence without applying changes.")
  .input("issues", {
    type: "text",
    default: "",
    description: "Optional issue IDs, bug reports, acceptance criteria, or failing behaviors to investigate.",
  })
  .input("pr", {
    type: "text",
    default: "",
    description: "Optional pull request number, URL, branch, or diff reference.",
  })
  .input("base_ref", {
    type: "text",
    default: "main",
    description: "Base branch, tag, or commit to compare against.",
  })
  .input("head_ref", {
    type: "text",
    default: "",
    description: "Head branch, tag, or commit under test.",
  })
  .input("task", {
    type: "text",
    default: "",
    description: "Optional testing objective, constraint, or acceptance focus.",
  })
  .input("profile", {
    type: "select",
    choices: ["quick", "balanced", "deep"],
    default: "balanced",
    description: "How broadly to inspect and validate the issue risk.",
  })
  .input("run_commands", {
    type: "boolean",
    default: true,
    description: "Run safe local read-only discovery and validation commands when available.",
  })
  .input("environment", {
    type: "select",
    choices: ["auto", "local", "docker", "devcontainer"],
    default: "auto",
    description: "Preferred execution environment for validation planning.",
  })
  .input("output_path", {
    type: "text",
    default: "",
    description: "Optional destination file path for the final report. When blank, the report is saved under ./issue-test-lab/.",
  })
  .run(async (ctx) => {
    const issues = text(ctx.inputs.issues);
    const pr = text(ctx.inputs.pr);
    const baseRef = text(ctx.inputs.base_ref, "main");
    const headRef = text(ctx.inputs.head_ref);
    const task = text(ctx.inputs.task);
    const profile = text(ctx.inputs.profile, "balanced");
    const runCommands = ctx.inputs.run_commands !== false;
    const environment = text(ctx.inputs.environment, "auto");
    const outputPath = text(ctx.inputs.output_path);
    const commandPolicy = runCommands
      ? "Run only safe local read-only commands when useful, such as git status/diff/log, rg/grep, package-manager script discovery, and targeted test dry-runs. If git metadata, package managers, test CLIs, Docker, or devcontainer support are missing, record the limitation and continue from file evidence."
      : "Do not run shell commands. Inspect files directly and list the commands a human should run.";
    const commandBranch = runCommands
      ? "true means run only safe high-signal read-only feasible commands."
      : "false means command plan only/no shell commands.";

    const intake = await ctx.task("A-intake", {
      prompt: `You are stage A (intake) for the Atomic issue-test-lab workflow.

Issues:
${issues || "(not provided; infer target from PR/task/current diff when available)"}

PR or diff reference: ${pr || "(not provided)"}
Base ref: ${baseRef}
Head ref: ${headRef || "(not provided)"}
Task focus: ${task || "(none provided)"}
Profile: ${profile}
Environment preference: ${environment}

Create an issue intake only. Identify expected behavior, observed/failing behavior, acceptance criteria, unknowns, and likely affected user flows. Inspect the repository directly. ${commandPolicy}

Default to analysis and reporting. Do not modify files, create tests, apply fixes, or post comments. Cite file paths, commands, outputs, and confidence where available.`,
    });

    const repoDetection = await ctx.task("B-repo-detection", {
      previous: intake,
      prompt: `You are stage B (repo detection) for issue-test-lab.

Previous stage:
{previous}

Detect repository shape, languages, package managers, test frameworks, CI configuration, existing test conventions, fixtures, and likely implementation surfaces for the issues. Prefer local evidence. ${commandPolicy}

If tools or environment features are unavailable, degrade gracefully and explain the fallback. Do not modify files.`,
    });

    const testSelection = await ctx.task("C-risk-based-test-selection", {
      previous: [intake, repoDetection],
      prompt: `You are stage C (risk-based test selection) for issue-test-lab.

Previous stages:
{previous}

Select tests based on issue risk and profile (${profile}). Separate smoke, focused regression, integration/e2e, edge-case, and negative-path checks. For each recommended check include target files, setup, assertion, risk reduced, priority, and confidence.

Do not write tests or change source files.`,
    });

    const environmentPlan = await ctx.task("D-environment-planning", {
      previous: [repoDetection, testSelection],
      prompt: `You are stage D (environment planning) for issue-test-lab.

Previous stages:
{previous}

Plan how validation should run for environment preference ${environment}. Detect whether local, Docker, or devcontainer execution appears supported. Include prerequisites, safe commands, expected runtime, skipped/unsafe commands, and fallback instructions when CLIs or containers are unavailable.

${commandPolicy} Do not modify files or start long-running services unless clearly safe and necessary for read-only validation.`,
    });

    const validation = await ctx.task("E-validation-execution", {
      previous: [testSelection, environmentPlan],
      prompt: `You are stage E (validation execution) for issue-test-lab.

Previous stages:
{previous}

Resolved run_commands: ${runCommands}
Command policy: ${commandPolicy}
Execution branch: ${commandBranch}

Follow the resolved run_commands branch exactly: false means command plan only/no shell commands; true means run only safe high-signal read-only feasible commands. If commands cannot run because tools, dependencies, containers, network, or context are missing, record that clearly. Capture exact commands, exit status, important output, and interpretation.

Do not edit files, generate tests, apply fixes, or post comments.`,
    });

    const finalReport = await ctx.task("F-final-report", {
      previous: [intake, repoDetection, testSelection, environmentPlan, validation],
      prompt: `You are stage F (final report) for issue-test-lab.

Previous stages:
{previous}

Write a concise final report with: issue summary, scope/refs, repository evidence, risk-based test inventory, environment plan, validation performed, gaps/unknowns, recommended next human actions, and confidence. State explicitly that this workflow performed analysis/reporting only and did not apply changes.

The workflow runtime will save this report to disk after this stage. Do not include save-location boilerplate in the report body.`,
    });

    const reportSummary = await ctx.task("report-filename-summary", {
      previous: finalReport,
      prompt: `Create a short topic summary for this issue-test-lab report filename and return metadata.

Final report:
{previous}

User context:
- Issues: ${issues || "(not provided)"}
- PR/diff reference: ${pr || "(not provided)"}
- Base ref: ${baseRef}
- Head ref: ${headRef || "(not provided)"}
- Task focus: ${task || "(none provided)"}
- Profile: ${profile}
- Environment: ${environment}

Return exactly 2-5 plain words. No markdown, punctuation, quotes, dates, or workflow name.`,
    });

    const savedReport = await writeWorkflowReport({
      workflowName: "issue-test-lab",
      outputPath,
      summary: reportSummary.text,
      report: finalReport.text,
    });
    const summary = reportSummaryText(reportSummary.text, "issue test lab report");

    return {
      summary,
      report_path: savedReport.reportPath,
      output_path: savedReport.reportPath,
      filename_summary: savedReport.filenameSummary,
      profile,
      environment,
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
