# `spec-driven-development`

Turn a brainstorm or direct implementation intent into research, an approved spec, and a guarded Ralph implementation handoff.

> **Important Ralph handoff behavior:** this workflow does not implement code itself. After human approval it finishes with `approved-ready-for-ralph`, returns a `/workflow ralph ...` command plus machine-readable launch metadata, and a parent chat/agent may then start Ralph as a separate top-level workflow. If that happens, the spec-driven run can look finished while Ralph is still running. Use `/workflow status`, `/workflow connect <ralph-run-id>` or F2, and `/workflow attach <ralph-run-id> <stage>` to monitor the follow-on Ralph run. If Ralph or a worker uses tmux, read the Ralph stage/worker output for the exact tmux attach command; this workflow cannot know it before Ralph starts.

- **Source:** [`./index.ts`](./index.ts)
- **Posture:** no implementation before human spec approval.
- **Generated artifacts:** `docs/brainstorms/`, `research/docs/`, and `specs/`

## Run examples

The user-facing entry point is `spec-driven-development`. In Atomic workflow command syntax, pass `mode` and `prompt` as inputs:

```text
/workflow spec-driven-development mode=brainstorm prompt="I want to improve onboarding" max_loops=5
```

```text
/workflow spec-driven-development mode=direct prompt="Add Redis-backed API rate limiting" max_loops=5
```

```text
/workflow spec-driven-development mode=auto prompt="Make activation better" max_loops=5
```

## Inputs

| Input | Type | Default | Description |
| --- | --- | --- | --- |
| `mode` | `select` | `auto` | `brainstorm`, `direct`, or `auto`. Auto uses brainstorm for vague/product-shaped prompts and direct for concrete implementation intent. |
| `prompt` | `text` | required | Feature idea, implementation intent, or problem statement. |
| `max_loops` | `number` | `5` | Ralph implementation loop cap after human spec approval. Used by the follow-on Ralph workflow; this workflow ends at handoff. |

## Modes

### `brainstorm`

Use for prompts that need clarification before research/spec creation. The workflow now does silent triage and a lightweight repo/context scout before asking anything, so it avoids questions the codebase can answer.

Brainstorm behavior:

1. `brainstorm-context-scout` — quickly checks existing specs/docs, similar features, and obvious architecture/product constraints. This is intentionally smaller than full research.
2. `brainstorm-silent-triage` — classifies ambiguity as product-shaped, technical/design-shaped, too vague, or concrete enough.
3. One-question-at-a-time clarification — asks only top unresolved questions, usually 0-2 and at most 3 by default. If the user chooses to brainstorm more, reserve questions can go up to 6.
4. Compact direction check — presents:
   - User/problem
   - Desired outcome
   - Key behavior
   - Important constraints
   - Non-goals
   - Assumptions carried into research/spec
5. Optional saved brief — if brainstorm proceeds, writes `docs/brainstorms/<YYYY-MM-DD>-<slug>.md` with original prompt, clarified intent, decisions, non-goals, assumptions/open questions, and research focus.

Product-shaped prompts use CE-inspired probes: specificity, outcome, evidence/current pain, counterfactual, and scope boundary. Technical-shaped prompts use grill-style probes: ambiguous behavior, rollout/backcompat, existing pattern, failure mode, and explicit non-goals. Technical questions include a recommendation tied to the repo scout when possible.

At the direction check, the user can choose `Proceed`, `Adjust scope`, `Ask me another question`, or `Skip brainstorm / use original prompt`.

### `direct`

Use for concrete implementation intent. The workflow skips product brainstorming and treats `prompt` as the implementation request.

### `auto`

The workflow chooses between `brainstorm` and `direct`. Short or vague product-shaped prompts tend toward `brainstorm`; concrete technical prompts tend toward `direct`.

## Research and spec flow

After intake, both modes create:

1. Workflow-native codebase research — ports the built-in `research-codebase` process into visible workflow stages instead of asking one inner agent to launch nested subagents. The workflow runs explicit intake/refinement, live locator, prior-research locator, external relevance scout, codebase analyzer, pattern finder, prior-research analyzer, online research, and synthesis stages. Intermediate branch outputs are saved under a hidden run artifact directory such as `.spec-driven-development-research-<run-id>/`; the final self-contained research document is written to `research/docs/<YYYY-MM-DD>-<slug>.md`.
2. `create-spec` — uses the built-in `create-spec` document structure/output contract as a template, consumes and cites the research, and writes a technical spec to `specs/<YYYY-MM-DD>-<slug>.md` without launching helper agents.
3. Human spec review — writes the spec as a Markdown file under `specs/` and shows one review input screen with the repo-relative spec path. The user reads the file, then replies in that same input box with approval, rejection, or revision feedback.

## Human review loop

The workflow only prepares a Ralph handoff after approval; it does not run Ralph itself.

Each review round uses one human-input screen instead of a tiny embedded editor plus separate decision prompts. The screen shows the stable repo-relative spec path, for example `specs/<YYYY-MM-DD>-<slug>.md`, and asks the user to open/read that Markdown file in the repo.

The user then replies in the same input box:

- `approve`, `approved`, `lgtm`, `looks good`, `looks good to me`, `ship`, or `ship it` marks the same spec file as `Approved` and returns Ralph launch metadata.
- `reject`, `rejected`, `cancel`, or `stop` stops the workflow and does not call Ralph.
- Any other non-empty reply is treated as revision feedback. The workflow runs `spec-revision-N`, overwrites the same spec file in place, and returns to the same one-screen review prompt with the same path.

If the spec is not approved within the review-iteration limit, the workflow stops and does not prepare a Ralph handoff.

## Ralph handoff

After approval, the workflow completes with status `approved-ready-for-ralph` and returns machine-readable launch metadata for Atomic's built-in `ralph` workflow. Immediately before the final `ralph-ready` stage, it creates a `ralph-handoff-notice` graph stage with monitoring instructions, so users see the handoff behavior at the moment it becomes relevant.

```json
{
  "ralph_workflow": "ralph",
  "ralph_inputs": {
    "prompt": "Implement <approved-spec-path>",
    "max_loops": 5
  }
}
```

A parent chat/agent can then start Ralph as a separate top-level workflow using the returned `ralph_workflow` and `ralph_inputs`. That preserves normal Ralph visibility in `/workflow status`, F2 graph connect, attach, pause, interrupt, and resume. The workflow also returns a user-copyable `ralph_command` for manual fallback.

If a parent chat/agent auto-starts Ralph, treat the completed spec-driven run as the handoff point, not the end of the larger implementation effort. Look for the new `ralph` run in `/workflow status`, connect to that run, and inspect Ralph's active stage output for any worker/tmux attach details.

## Output

Possible return statuses include:

- `rejected` — the user rejected the spec; Ralph was not called.
- `stopped` — the review loop reached its limit without approval; Ralph was not called.
- `approved-ready-for-ralph` — the spec was approved and Ralph launch metadata is ready for the parent chat/agent.

Returned metadata can include:

- `mode`
- `brainstorm_brief_path`
- `research_path`
- `research_artifact_dir`
- `research_manifest_path`
- `spec_path`
- `approved_spec_path`
- `ralph_workflow`
- `ralph_prompt`
- `ralph_inputs`
- `ralph_command`
- `max_loops`
- `message`
