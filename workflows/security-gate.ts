import { defineWorkflow } from "@bastani/workflows";
import { reportSummaryText, writeWorkflowReport } from "./report-output.js";

function text(value: unknown, fallback = ""): string {
  const result = String(value ?? fallback).trim();
  return result.length > 0 ? result : fallback;
}

const GATE_DECISIONS = ["pass", "pass-with-warnings", "fail", "inconclusive"] as const;

type GateDecision = (typeof GATE_DECISIONS)[number];

function normalizeGateDecision(output: string): GateDecision {
  const match = output.match(/^\s*Decision:\s*(pass|pass-with-warnings|fail|inconclusive)\s*$/im);
  if (!match) {
    return "inconclusive";
  }

  return match[1].toLowerCase() as GateDecision;
}

export default defineWorkflow("security-gate")
  .description("Run a local evidence-backed security gate for a PR or repository scope without applying fixes.")
  .input("pr", {
    type: "text",
    default: "",
    description: "Optional pull request number, URL, branch, commit range, or diff reference to gate.",
  })
  .input("base_ref", {
    type: "text",
    default: "main",
    description: "Base branch, tag, or commit to compare against.",
  })
  .input("head_ref", {
    type: "text",
    default: "",
    description: "Head branch, tag, commit, or working tree reference to gate.",
  })
  .input("scope", {
    type: "text",
    default: "",
    description: "Optional security-sensitive paths, services, assets, or assumptions.",
  })
  .input("profile", {
    type: "select",
    choices: ["quick", "standard", "deep"],
    default: "standard",
    description: "Security gate depth and evidence threshold.",
  })
  .input("run_scans", {
    type: "boolean",
    default: true,
    description: "Run safe local read-only security scans when tools are available.",
  })
  .input("include_threat_model", {
    type: "boolean",
    default: true,
    description: "Include a threat model delta in the gate output.",
  })
  .input("output_path", {
    type: "text",
    default: "",
    description: "Optional destination file path for the final gate report. When blank, the report is saved under ./security-gate/.",
  })
  .run(async (ctx) => {
    const pr = text(ctx.inputs.pr);
    const baseRef = text(ctx.inputs.base_ref, "main");
    const headRef = text(ctx.inputs.head_ref);
    const scope = text(ctx.inputs.scope);
    const profile = text(ctx.inputs.profile, "standard");
    const runScans = ctx.inputs.run_scans !== false;
    const includeThreatModel = ctx.inputs.include_threat_model !== false;
    const outputPath = text(ctx.inputs.output_path);
    const scanPolicy = runScans
      ? "Run only safe local read-only scans where useful, such as git diff/status, rg-based secret/config searches, dependency audit commands that do not require risky network access, lint/security scripts, or language-specific analyzers already installed. If a tool, lockfile, dependency install, container, or network access is missing, record the limitation and continue from file evidence."
      : "Do not run shell scans. Inspect files directly and list recommended scan commands for a human to run.";
    const scanBranch = runScans
      ? "true means run only safe high-signal read-only feasible scans."
      : "false means scan plan only/no shell scans.";

    const scopeDetection = await ctx.task("security-scope-detection", {
      prompt: `You are detecting scope for an Atomic security-gate run.

PR, branch, or diff reference: ${pr || "(not provided; use head_ref/scope/current diff if available)"}
Base ref: ${baseRef}
Head ref: ${headRef || "(not provided)"}
Scope: ${scope || "(none provided)"}
Profile: ${profile}
Threat model delta requested: ${includeThreatModel}

Inspect the repository directly. Identify changed files, sensitive components, trust boundaries, data classes, auth/authz paths, input surfaces, secrets/config areas, dependency surfaces, and security-relevant unknowns. ${scanPolicy}

Do not modify files, apply remediations, or post comments. Use local evidence and cite paths, commands, outputs, and confidence.`,
    });

    const tooling = await ctx.task("tooling-discovery", {
      previous: scopeDetection,
      prompt: `Discover security tooling and validation options.

Security scope:
{previous}

Inspect package manifests, lockfiles, CI, scripts, linters, SAST/secret scanning configs, container/devcontainer files, language-specific security tools, and audit commands. Explain what can run safely in this environment and what is unavailable. ${scanPolicy}

Do not install dependencies, change config, or edit files.`,
    });

    const automatedScans = await ctx.task("automated-scans", {
      previous: [scopeDetection, tooling],
      prompt: `Run or plan automated scans for the security gate.

Scope and tooling:
{previous}

Resolved run_scans: ${runScans}
Scan policy: ${scanPolicy}
Execution branch: ${scanBranch}

Follow the resolved run_scans branch exactly: false means scan plan only/no shell scans; true means run only safe high-signal read-only feasible scans. Capture exact commands, exit status, relevant output, false-positive caveats, and skipped scans. If scans are disabled or tools are missing, produce a clear scan plan for a human.

Do not remediate, install packages, mutate lockfiles, or call external services.`,
    });

    const secureCodeReview = await ctx.task("contextual-secure-code-review", {
      previous: [scopeDetection, tooling, automatedScans],
      prompt: `Perform contextual secure code review.

Gate context:
{previous}

Review auth/authz, input validation, injection, secrets handling, logging, data exposure, serialization, file/process/network boundaries, dependency/supply-chain risk, CI/release hardening, and operational controls relevant to the PR/scope. Profile: ${profile}.

For each finding include severity, exploitability, evidence, affected files, validation status, confidence, and remediation guidance in prose only. Do not change files.`,
    });

    const threatModelDelta = includeThreatModel
      ? await ctx.task("threat-model-delta", {
          previous: [scopeDetection, secureCodeReview],
          prompt: `Create the optional threat model delta for this gate.

Scope and secure code review:
{previous}

Summarize assets, actors, entry points, trust boundaries, changed assumptions, abuse cases, new or reduced risks, and residual risk. Keep it evidence-backed and scoped to the PR/change. Do not modify files.`,
        })
      : undefined;

    const gateEvidence = threatModelDelta
      ? [scopeDetection, tooling, automatedScans, secureCodeReview, threatModelDelta]
      : [scopeDetection, tooling, automatedScans, secureCodeReview];

    const gateDecision = await ctx.task("gate-decision", {
      previous: gateEvidence,
      prompt: `Write the final security-gate decision.

Gate evidence:
{previous}

Begin with a line exactly: Decision: <one of pass, pass-with-warnings, fail, inconclusive>. Use only those four decision labels, with these meanings: pass means no blocking findings; pass-with-warnings means non-blocking risks or notable caveats remain; fail means blocking security risk; inconclusive means evidence is insufficient to decide.

Include target refs, scope, profile, tooling discovered, scans run/skipped, contextual secure-code-review findings, threat model delta if present, severity buckets (critical, high, medium, low, informational), evidence for each finding, remediation guidance, false positives/unverified items, residual risk, and next human actions. Be explicit that no remediation was applied and no PR comment was posted.

The workflow runtime will save this report to disk after this stage. Do not include save-location boilerplate in the report body.`,
    });

    const reportSummary = await ctx.task("report-filename-summary", {
      previous: gateDecision,
      prompt: `Create a short topic summary for this security-gate report filename and return metadata.

Gate report:
{previous}

User context:
- PR/diff reference: ${pr || "(not provided)"}
- Base ref: ${baseRef}
- Head ref: ${headRef || "(not provided)"}
- Scope: ${scope || "(none provided)"}
- Profile: ${profile}

Return exactly 2-5 plain words. No markdown, punctuation, quotes, dates, or workflow name.`,
    });

    const savedReport = await writeWorkflowReport({
      workflowName: "security-gate",
      outputPath,
      summary: reportSummary.text,
      report: gateDecision.text,
    });
    const decision = normalizeGateDecision(gateDecision.text);
    const summary = reportSummaryText(reportSummary.text, "security gate report");

    return {
      summary,
      report_path: savedReport.reportPath,
      output_path: savedReport.reportPath,
      filename_summary: savedReport.filenameSummary,
      profile,
      run_scans: runScans,
      include_threat_model: includeThreatModel,
      decision,
      stages: [
        scopeDetection.stageName,
        tooling.stageName,
        automatedScans.stageName,
        secureCodeReview.stageName,
        ...(threatModelDelta ? [threatModelDelta.stageName] : []),
        gateDecision.stageName,
        reportSummary.stageName,
      ],
    };
  })
  .compile();
