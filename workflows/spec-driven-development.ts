import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { defineWorkflow } from "@bastani/workflows";
import { reportFilenameSummary } from "./report-output.js";

type TaskContext = { name: string; text: string };

const DEFAULT_MAX_LOOPS = 5;
const MAX_SPEC_REVIEW_ITERATIONS = 10;

const RESEARCH_SKILL_PATH =
  "/Users/norinlavaee/.bun/install/global/node_modules/@bastani/atomic/dist/builtin/workflows/skills/research-codebase/SKILL.md";
const CREATE_SPEC_SKILL_PATH =
  "/Users/norinlavaee/.bun/install/global/node_modules/@bastani/atomic/dist/builtin/workflows/skills/create-spec/SKILL.md";
const CE_BRAINSTORM_SOURCE =
  "https://github.com/EveryInc/compound-engineering-plugin/blob/main/docs/skills/ce-brainstorm.md";

function text(value: unknown, fallback = ""): string {
  const result = String(value ?? fallback).trim();
  return result.length > 0 ? result : fallback;
}

function positiveInteger(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : fallback;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function artifactPath(directory: string, prompt: string, fallback: string): string {
  const slug = reportFilenameSummary(prompt, fallback);
  return join(directory, `${today()}-${slug}.md`);
}

async function writeArtifact(path: string, content: string): Promise<string> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${content.trimEnd()}\n`, "utf8");
  return path;
}

function stripMarkdownFence(content: string): string {
  const trimmed = content.trim();
  const match = trimmed.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/i);
  return match ? match[1].trim() : trimmed;
}

function looksVague(prompt: string): boolean {
  const words = prompt.split(/\s+/).filter(Boolean);
  const hasConcreteTechnicalSignal = /\b(api|endpoint|redis|database|schema|migration|test|bug|error|rate limit|auth|oauth|cli|config|typescript|react|sql|cache|queue|worker)\b/i.test(
    prompt,
  );
  const hasVagueProductSignal = /\b(improve|better|onboarding|activation|experience|flow|idea|explore|maybe|help users|make it easier|something|feature)\b/i.test(
    prompt,
  );

  return words.length < 8 || (hasVagueProductSignal && !hasConcreteTechnicalSignal);
}

function isProductShaping(prompt: string): boolean {
  return /\b(onboarding|activation|retention|pricing|strategy|roadmap|positioning|market|platform|user journey|product)\b/i.test(
    prompt,
  );
}

function hasSolutionAttachment(prompt: string): boolean {
  return /\b(add|build|implement|use|with|via|backed|powered|integrate|replace|migrate)\b/i.test(prompt);
}

function markApproved(content: string): string {
  let approved = content;

  if (/^---\n[\s\S]*?\n---/.test(approved)) {
    const frontmatter = approved.match(/^---\n([\s\S]*?)\n---/);
    if (frontmatter) {
      const body = frontmatter[1];
      const nextBody = /^status:/im.test(body)
        ? body.replace(/^status:.*$/im, "status: Approved")
        : `${body.trimEnd()}\nstatus: Approved`;
      approved = approved.replace(/^---\n[\s\S]*?\n---/, `---\n${nextBody}\n---`);
    }
  }

  if (/\|\s*Status\s*\|[^\n]*\|/i.test(approved)) {
    approved = approved.replace(/\|\s*Status\s*\|[^\n]*\|/i, "| Status | Approved |");
  } else if (!/^status:\s*Approved\s*$/im.test(approved)) {
    const withHeadingStatus = approved.replace(/^(# .+\n)/, `$1\nStatus: Approved\n`);
    approved = withHeadingStatus === approved ? `Status: Approved\n\n${approved}` : withHeadingStatus;
  }

  return approved;
}

function stageTools(extra: string[] = []): string[] {
  return [
    "read",
    "bash",
    "todo",
    "subagent",
    "web_search",
    "code_search",
    "fetch_content",
    "get_search_content",
    ...extra,
  ];
}

export default defineWorkflow("spec-driven-development")
  .description("Spec Driven Development wrapper: brainstorm/direct intake → research → spec → HIL approval → Ralph handoff.")
  .input("mode", {
    type: "select",
    choices: ["brainstorm", "direct", "auto"],
    default: "auto",
    description: "brainstorm asks CE-style product questions; direct skips them; auto chooses based on prompt specificity.",
  })
  .input("prompt", {
    type: "text",
    required: true,
    description: "Feature idea, implementation intent, or problem statement to turn into an approved spec.",
  })
  .input("max_loops", {
    type: "number",
    default: DEFAULT_MAX_LOOPS,
    description: "Maximum Ralph implementation loop count after spec approval.",
  })
  .run(async (ctx) => {
    const initialPrompt = text(ctx.inputs.prompt);
    const requestedMode = text(ctx.inputs.mode, "auto") as "brainstorm" | "direct" | "auto";
    const resolvedMode = requestedMode === "auto"
      ? looksVague(initialPrompt)
        ? "brainstorm"
        : "direct"
      : requestedMode;
    const maxLoops = positiveInteger(ctx.inputs.max_loops, DEFAULT_MAX_LOOPS);

    let implementationIntent: TaskContext;
    let brainstormBriefPath = "";

    if (resolvedMode === "brainstorm") {
      const specificity = await ctx.ui.input(
        `Specificity gap lens: who is the primary actor or beneficiary for this work, and what concrete outcome should change for them?\n\nOriginal prompt: ${initialPrompt}`,
      );
      const evidence = await ctx.ui.input(
        "Evidence gap lens: what observation, signal, user behavior, support issue, metric, or stakeholder feedback tells us this is worth solving now?",
      );
      const counterfactual = await ctx.ui.input(
        "Counterfactual gap lens: what do people do today, and what happens if we do not ship anything?",
      );
      const attachment = hasSolutionAttachment(initialPrompt)
        ? await ctx.ui.input(
            "Attachment gap lens: if the proposed solution shape changed, what user-visible outcome or constraint must still remain true?",
          )
        : "No strong solution attachment detected in the opening prompt.";
      const durability = isProductShaping(initialPrompt)
        ? await ctx.ui.input(
            "Durability gap lens: what assumption about users, the market, or the product context must remain true for this to still matter later?",
          )
        : "Not classified as deep/product-shaping; durability lens not required.";

      const approachExploration = await ctx.task("brainstorm-approaches", {
        prompt: `Adapt Compound Engineering ce-brainstorm principles from ${CE_BRAINSTORM_SOURCE}.

Original prompt:
${initialPrompt}

User answers:
- Specificity: ${specificity}
- Evidence: ${evidence}
- Counterfactual: ${counterfactual}
- Attachment: ${attachment}
- Durability: ${durability}

Explore 2-3 concrete product/requirements approaches before recommending one. Include at least one non-obvious approach when useful. Keep implementation details out unless the user's brainstorm is explicitly technical.

Return concise Markdown with:
1. Approach A
2. Approach B
3. Approach C if genuinely useful
4. Recommendation
5. Synthesis Summary draft`,
        tools: [],
      });

      const preferredApproach = await ctx.ui.input(
        `Approach exploration and recommendation:\n\n${approachExploration.text}\n\nWhich approach should the requirements brief optimize for, and what correction (if any) should be applied before writing it?`,
      );

      const brainstormBrief = await ctx.task("requirements-brief", {
        previous: approachExploration,
        prompt: `Create the final right-sized requirements brief from this CE-style brainstorm.

Original prompt:
${initialPrompt}

Pressure-test answers:
- Specificity: ${specificity}
- Evidence: ${evidence}
- Counterfactual: ${counterfactual}
- Attachment: ${attachment}
- Durability: ${durability}

Approach exploration:
{previous}

User approach preference/correction:
${preferredApproach}

Requirements:
- Start with a Synthesis Summary.
- Then write a right-sized requirements brief.
- Use stable IDs where useful: R-IDs for requirements, A-IDs for actors, F-IDs for key flows, AE-IDs for acceptance examples.
- Keep implementation details out unless explicitly technical.
- Make scope boundaries and non-goals clear.
- Output only the Markdown artifact content, no code fences and no commentary outside the brief.`,
        tools: [],
      });

      brainstormBriefPath = artifactPath("docs/brainstorms", initialPrompt, "requirements-brief");
      await writeArtifact(brainstormBriefPath, stripMarkdownFence(brainstormBrief.text));
      implementationIntent = {
        name: "requirements-brief",
        text: `Brainstorm mode requirements brief written to ${brainstormBriefPath}.\n\n${stripMarkdownFence(brainstormBrief.text)}`,
      };
    } else {
      implementationIntent = {
        name: "direct-implementation-intent",
        text: `Direct mode: skip product brainstorming. Treat the following prompt as implementation intent and proceed to codebase research.\n\n${initialPrompt}`,
      };
    }

    const researchPath = artifactPath("research/docs", initialPrompt, "spec-driven-development-research");
    const research = await ctx.task("codebase-research", {
      previous: implementationIntent,
      prompt: `Faithfully follow the built-in research-codebase skill at ${RESEARCH_SKILL_PATH}, with this wrapper adaptation: do not write files yourself; return the complete research Markdown so the workflow wrapper can write it to ${researchPath}.

Implementation intent / requirements input:
{previous}

Hard constraints:
- Do not implement anything.
- Optimize/refine the research question before investigating.
- Inspect the live codebase as the source of truth.
- Use codebase-locator, codebase-analyzer, and codebase-pattern-finder subagents for live code research.
- Use codebase-research-locator and codebase-research-analyzer for prior research/spec history.
- Use online research only when external dependencies or docs materially matter.
- Document what exists, not recommendations.
- Include concrete file paths and line references.
- Produce a self-contained research document with frontmatter matching the research-codebase convention.

Output only the final Markdown content for ${researchPath}; no code fences and no commentary outside the artifact.`,
      tools: stageTools(),
    });
    const researchContent = stripMarkdownFence(research.text);
    await writeArtifact(researchPath, researchContent);

    const specPath = artifactPath("specs", initialPrompt, "spec-driven-development-spec");
    const specDraft = await ctx.task("create-spec", {
      previous: [implementationIntent, { name: "research-artifact", text: `Research artifact path: ${researchPath}\n\n${researchContent}` }],
      prompt: `Faithfully follow the built-in create-spec skill at ${CREATE_SPEC_SKILL_PATH}, with this wrapper adaptation: do not write files yourself and do not ask the user questions during this stage; put unresolved decisions in Open Questions for the HIL review gate.

Input and research:
{previous}

Hard constraints:
- Do not implement anything.
- Consume and cite the research artifact path: ${researchPath}.
- Write a technical spec intended for ${specPath}.
- Include goals, non-goals, proposed solution, detailed design, alternatives, risks, rollout/testing, and open questions.
- Cite research paths and code references.
- Include a metadata/status section with Status initially Draft or In Review.
- Do not include concrete dates/timelines for implementation duration.

Output only the final Markdown spec content for ${specPath}; no code fences and no commentary outside the spec.`,
      tools: stageTools(),
    });

    let specContent = stripMarkdownFence(specDraft.text);
    await writeArtifact(specPath, specContent);

    let reviewIterations = 0;
    while (reviewIterations < MAX_SPEC_REVIEW_ITERATIONS) {
      reviewIterations += 1;
      const editedSpec = await ctx.ui.editor(specContent);
      specContent = text(editedSpec, specContent);
      await writeArtifact(specPath, specContent);

      const reviewDecision = await ctx.ui.select(
        `Review generated spec at ${specPath}. Choose how to proceed.`,
        ["approve", "request changes", "reject"] as const,
      );

      if (reviewDecision === "approve") {
        specContent = markApproved(specContent);
        await writeArtifact(specPath, specContent);
        break;
      }

      if (reviewDecision === "reject") {
        return {
          status: "rejected",
          mode: resolvedMode,
          brainstorm_brief_path: brainstormBriefPath,
          research_path: researchPath,
          spec_path: specPath,
          message: "Spec rejected by human reviewer; Ralph was not called.",
        };
      }

      const feedback = await ctx.ui.input(
        "What needs to change in the spec before it can be approved? Provide concrete feedback; the workflow will revise and present it again.",
      );
      const revised = await ctx.task(`spec-revision-${reviewIterations}`, {
        previous: [
          { name: "current-spec", text: specContent },
          { name: "review-feedback", text: feedback },
          { name: "research-artifact", text: `Research path: ${researchPath}` },
        ],
        prompt: `Revise the spec using the human review feedback.

Context:
{previous}

Constraints:
- Do not implement anything.
- Preserve the spec's structure and evidence citations.
- Resolve feedback directly where possible.
- Keep unresolved decisions in Open Questions.
- Keep Status as Draft/In Review until explicit approval.

Output only the complete revised Markdown spec for ${specPath}; no code fences and no extra commentary.`,
        tools: stageTools(),
      });
      specContent = stripMarkdownFence(revised.text);
      await writeArtifact(specPath, specContent);
    }

    if (!/^status:\s*Approved\s*$/im.test(specContent) && !/\|\s*Status\s*\|\s*Approved\s*\|/i.test(specContent)) {
      return {
        status: "stopped",
        mode: resolvedMode,
        brainstorm_brief_path: brainstormBriefPath,
        research_path: researchPath,
        spec_path: specPath,
        message: `Spec was not approved within ${MAX_SPEC_REVIEW_ITERATIONS} review iterations; Ralph was not called.`,
      };
    }

    const ralphPrompt = `Implement ${specPath}`;
    const ralphHandoff = await ctx.task("ralph-handoff", {
      prompt: `The spec has been approved and marked Approved at ${specPath}.

You must now hand off to Atomic's built-in Ralph workflow. Do not implement anything yourself in this stage.

Call the workflow tool exactly once with:
- action: "run"
- workflow: "ralph"
- inputs: { "prompt": ${JSON.stringify(ralphPrompt)}, "max_loops": ${maxLoops} }

After the tool call returns, summarize the Ralph run id/status and the approved spec path.`,
      tools: ["workflow"],
    });

    return {
      status: "approved-and-handed-to-ralph",
      mode: resolvedMode,
      brainstorm_brief_path: brainstormBriefPath,
      research_path: researchPath,
      spec_path: specPath,
      approved_spec_path: specPath,
      ralph_prompt: ralphPrompt,
      max_loops: maxLoops,
      ralph_handoff: ralphHandoff.text,
    };
  })
  .compile();
