import { defineWorkflow } from "@bastani/workflows";
import { reportSummaryText, writeWorkflowReport } from "./report-output.js";

function text(value: unknown, fallback = ""): string {
  const result = String(value ?? fallback).trim();
  return result.length > 0 ? result : fallback;
}

const CANONICAL_REVIEWERS = ["correctness", "architecture", "testing", "security", "performance"] as const;

type ReviewerRole = (typeof CANONICAL_REVIEWERS)[number];

const REVIEWER_ALIASES: Record<string, ReviewerRole> = {
  correctness: "correctness",
  "correctness-review": "correctness",
  architecture: "architecture",
  "architecture-review": "architecture",
  testing: "testing",
  "testing-review": "testing",
  test: "testing",
  tests: "testing",
  security: "security",
  "security-review": "security",
  sec: "security",
  performance: "performance",
  "performance-review": "performance",
  perf: "performance",
};

function listLabel(items: string[], emptyLabel: string): string {
  return items.length > 0 ? items.join(", ") : emptyLabel;
}

function reviewerSelection(value: unknown): {
  requested: string[];
  roles: ReviewerRole[];
  ignored: string[];
  defaulted: boolean;
  selectedLabel: string;
  requestedLabel: string;
  ignoredLabel: string;
  summary: string;
} {
  const requested = text(value)
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  const selected = new Set<ReviewerRole>();
  const ignored: string[] = [];

  for (const item of requested) {
    const key = item.toLowerCase().replace(/\s+/g, "-");
    const role = REVIEWER_ALIASES[key];

    if (role) {
      selected.add(role);
    } else {
      ignored.push(item);
    }
  }

  const defaulted = requested.length === 0 || selected.size === 0;
  const roles = defaulted
    ? [...CANONICAL_REVIEWERS]
    : CANONICAL_REVIEWERS.filter((role) => selected.has(role));
  const selectedLabel = roles.join(", ");
  const requestedLabel = listLabel(requested, "(none provided)");
  const ignoredLabel = listLabel(ignored, "(none)");
  const defaultNote = defaulted
    ? "Defaulted to all reviewers because no valid reviewer roles were provided."
    : "Using requested valid reviewers only.";

  return {
    requested,
    roles,
    ignored,
    defaulted,
    selectedLabel,
    requestedLabel,
    ignoredLabel,
    summary: `${defaultNote} Selected reviewers: ${selectedLabel}. Requested: ${requestedLabel}. Ignored unsupported: ${ignoredLabel}.`,
  };
}

export default defineWorkflow("review-board")
  .description("Run a parallel specialist review board and synthesize an evidence-backed code review without posting comments.")
  .input("pr", {
    type: "text",
    default: "",
    description: "Optional pull request number, URL, branch, commit range, or diff reference to review.",
  })
  .input("base_ref", {
    type: "text",
    default: "main",
    description: "Base branch, tag, or commit to compare against.",
  })
  .input("head_ref", {
    type: "text",
    default: "",
    description: "Head branch, tag, commit, or working tree reference to review.",
  })
  .input("scope", {
    type: "text",
    default: "",
    description: "Optional file paths, packages, risk areas, or review boundaries.",
  })
  .input("depth", {
    type: "select",
    choices: ["quick", "standard", "deep"],
    default: "standard",
    description: "Review depth and evidence threshold.",
  })
  .input("reviewers", {
    type: "text",
    default: "",
    description: "Optional comma- or newline-separated reviewer focus areas to emphasize.",
  })
  .input("include_pr_comment", {
    type: "boolean",
    default: true,
    description: "Draft a PR comment for humans to copy; never auto-post it.",
  })
  .input("model_strategy", {
    type: "select",
    choices: ["default", "diverse", "fast"],
    default: "default",
    description: "Guidance for reviewer style and trade-offs.",
  })
  .input("output_path", {
    type: "text",
    default: "",
    description: "Optional destination file path for the final review report. When blank, the report is saved under ./review-board/.",
  })
  .run(async (ctx) => {
    const pr = text(ctx.inputs.pr);
    const baseRef = text(ctx.inputs.base_ref, "main");
    const headRef = text(ctx.inputs.head_ref);
    const scope = text(ctx.inputs.scope);
    const depth = text(ctx.inputs.depth, "standard");
    const reviewerPlan = reviewerSelection(ctx.inputs.reviewers);
    const reviewerSummary = reviewerPlan.summary;
    const selectedReviewerLabel = reviewerPlan.selectedLabel;
    const includePrComment = ctx.inputs.include_pr_comment !== false;
    const modelStrategy = text(ctx.inputs.model_strategy, "default");
    const outputPath = text(ctx.inputs.output_path);

    const target = await ctx.task("review-target-collection", {
      prompt: `You are collecting the target for an Atomic review-board run.

PR, branch, or diff reference: ${pr || "(not provided; use head_ref/scope/current diff if available)"}
Base ref: ${baseRef}
Head ref: ${headRef || "(not provided)"}
Scope: ${scope || "(none provided)"}
Depth: ${depth}
Reviewer selection: ${reviewerSummary}
Model strategy: ${modelStrategy}

Inspect the repository directly. Use git/gh/local files when available to identify changed files, commits, risk areas, and missing context. If git, gh, network, or provider CLI access is unavailable, degrade gracefully and continue from local diff/files.

Do not modify files, apply patches, or post comments. Cite file paths, commands, outputs, and confidence.`,
    });

    const packet = await ctx.task("review-packet", {
      previous: target,
      prompt: `Prepare the shared review packet for specialist reviewers.

Target collection:
{previous}

Reviewer selection: ${reviewerSummary}

Summarize changed behavior, affected files, architecture context, tests touched/missing, operational risk, and open questions. Include exact paths, relevant symbols, and safe validation commands. Note any unavailable tools, incomplete PR metadata, and ignored unsupported reviewer inputs (${reviewerPlan.ignoredLabel}). Do not modify files.`,
    });

    const reviewerSteps = {
      correctness: {
        name: "correctness-review",
        previous: packet,
        prompt: `Review functional correctness, state transitions, edge cases, error handling, compatibility, and user-visible behavior.

Shared review packet:
{previous}

Honor reviewer focus where relevant: ${selectedReviewerLabel}. Depth: ${depth}. Model strategy: ${modelStrategy}. Inspect files directly. Provide severity-ranked findings with evidence, affected paths, validation steps, confidence, and prose-only remediation suggestions. Do not edit files or post comments.`,
      },
      architecture: {
        name: "architecture-review",
        previous: packet,
        prompt: `Review architecture, maintainability, API boundaries, coupling, migrations, data flow, and consistency with repository patterns.

Shared review packet:
{previous}

Honor reviewer focus where relevant: ${selectedReviewerLabel}. Depth: ${depth}. Model strategy: ${modelStrategy}. Provide evidence-backed findings and recommendations. Do not edit files or post comments.`,
      },
      testing: {
        name: "testing-review",
        previous: packet,
        prompt: `Review test coverage, fixtures, CI impact, regression gaps, and validation quality.

Shared review packet:
{previous}

Honor reviewer focus where relevant: ${selectedReviewerLabel}. Run only safe local read-only or targeted validation commands if useful. If tools or dependencies are missing, say so and continue. Provide evidence, confidence, and concrete test recommendations. Do not edit files.`,
      },
      security: {
        name: "security-review",
        previous: packet,
        prompt: `Review security, privacy, auth/authz, secrets handling, input validation, dependency/supply-chain signals, and sensitive data exposure.

Shared review packet:
{previous}

Honor reviewer focus where relevant: ${selectedReviewerLabel}. Use local evidence only and do not call external services. Provide severity, evidence, confidence, and prose-only remediation suggestions. Do not edit files or post comments.`,
      },
      performance: {
        name: "performance-review",
        previous: packet,
        prompt: `Review performance, scalability, concurrency, caching, resource usage, latency, memory, and operational risk.

Shared review packet:
{previous}

Honor reviewer focus where relevant: ${selectedReviewerLabel}. Provide evidence-backed findings with file paths, validation ideas, confidence, and practical recommendations. Do not edit files or post comments.`,
      },
    };
    const selectedReviewerSteps = reviewerPlan.roles.map((role) => reviewerSteps[role]);

    const specialistReports = await ctx.parallel(
      selectedReviewerSteps,
      { concurrency: modelStrategy === "fast" ? 5 : 3, failFast: false },
    );

    const consensus = await ctx.task("consensus-judge", {
      previous: specialistReports,
      prompt: `Judge and synthesize the specialist review reports.

Specialist reports:
{previous}

Board composition: ${reviewerPlan.selectedLabel}. Ignored unsupported reviewer inputs: ${reviewerPlan.ignoredLabel}.

Deduplicate findings, resolve disagreements, discard unsupported claims, and rank issues as blocking, recommended, or informational. For each retained finding include evidence, affected files, validation status, severity, owner-friendly explanation, and confidence. Do not modify files.`,
    });

    const prComment = includePrComment
      ? await ctx.task("pr-comment-draft", {
          previous: consensus,
          prompt: `Draft a PR review comment for humans to copy manually.

Consensus:
{previous}

Keep it concise and actionable. Include blocking findings first, then recommendations and validation notes. Do not auto-post, call PR APIs, or modify files.`,
        })
      : undefined;

    const reviewMaterial = prComment
      ? [target, packet, ...specialistReports, consensus, prComment]
      : [target, packet, ...specialistReports, consensus];

    const finalOutput = await ctx.task("final-output", {
      previous: reviewMaterial,
      prompt: `Write the final review-board output.

Review material:
{previous}

Include review target, base/head refs, scope, depth, board composition (${reviewerSummary}), ignored unsupported reviewer inputs (${reviewerPlan.ignoredLabel}), evidence summary, blocking findings, non-blocking recommendations, testing/validation notes, gaps/unknowns, and next steps. State explicitly that no changes were applied and no PR comments were posted.`,
    });

    const reportSummary = await ctx.task("report-filename-summary", {
      previous: finalOutput,
      prompt: `Create a short topic summary for this review-board report filename and return metadata.

Final review report:
{previous}

User context:
- PR/diff reference: ${pr || "(not provided)"}
- Base ref: ${baseRef}
- Head ref: ${headRef || "(not provided)"}
- Scope: ${scope || "(none provided)"}
- Depth: ${depth}
- Reviewers: ${selectedReviewerLabel}

Return exactly 2-5 plain words. No markdown, punctuation, quotes, dates, or workflow name.`,
    });

    const savedReport = await writeWorkflowReport({
      workflowName: "review-board",
      outputPath,
      summary: reportSummary.text,
      report: finalOutput.text,
    });
    const summary = reportSummaryText(reportSummary.text, "review board report");

    return {
      summary,
      report_path: savedReport.reportPath,
      output_path: savedReport.reportPath,
      filename_summary: savedReport.filenameSummary,
      depth,
      model_strategy: modelStrategy,
      include_pr_comment: includePrComment,
      reviewers: selectedReviewerLabel,
      requested_reviewers: reviewerPlan.requested,
      ignored_reviewers: reviewerPlan.ignored,
      defaulted_reviewers: reviewerPlan.defaulted,
      stages: [
        target.stageName,
        packet.stageName,
        ...specialistReports.map((review) => review.stageName),
        consensus.stageName,
        ...(prComment ? [prComment.stageName] : []),
        finalOutput.stageName,
        reportSummary.stageName,
      ],
    };
  })
  .compile();
