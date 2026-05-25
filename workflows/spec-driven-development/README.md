# `spec-driven-development`

Turn a brainstorm or direct implementation intent into research, an approved spec, and a guarded Ralph implementation handoff.

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
| `max_loops` | `number` | `5` | Ralph implementation loop cap after human spec approval. |

## Modes

### `brainstorm`

Use for vague or product-shaped prompts. The workflow asks CE-style one-question-at-a-time prompts, then writes a requirements brief before codebase research and spec creation.

The brainstorm path may ask about:

- specificity
- evidence
- counterfactuals
- attachment to a proposed solution
- durability of the product direction

It then creates:

1. `brainstorm-approaches` — 2-3 approaches, a recommendation, and a synthesis summary draft.
2. `requirements-brief` — final Markdown brief with synthesis summary, requirements, stable IDs, boundaries, and non-goals.
3. A saved brief at `docs/brainstorms/<YYYY-MM-DD>-<slug>.md`.

### `direct`

Use for concrete implementation intent. The workflow skips product brainstorming and treats `prompt` as the implementation request.

### `auto`

The workflow chooses between `brainstorm` and `direct`. Short or vague product-shaped prompts tend toward `brainstorm`; concrete technical prompts tend toward `direct`.

## Research and spec flow

After intake, both modes create:

1. `codebase-research` — follows the built-in research-codebase skill, inspects the live codebase, cites paths and line references, and writes self-contained research to `research/docs/<YYYY-MM-DD>-<slug>.md`.
2. `create-spec` — follows the built-in create-spec skill, consumes and cites the research, and writes a technical spec to `specs/<YYYY-MM-DD>-<slug>.md`.
3. Human spec review — opens the spec for review/editing and asks the user to approve, request changes, or reject.

## Human review loop

The workflow only prepares a Ralph handoff after approval; it does not run Ralph itself.

- `approve` marks the spec as `Approved` and returns Ralph launch metadata.
- `request changes` runs a `spec-revision-N` stage and repeats review.
- `reject` stops the workflow and does not call Ralph.

If the spec is not approved within the review-iteration limit, the workflow stops and does not prepare a Ralph handoff.

## Ralph handoff

After approval, the workflow completes with status `approved-ready-for-ralph` and returns machine-readable launch metadata for Atomic's built-in `ralph` workflow:

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

## Output

Possible return statuses include:

- `rejected` — the user rejected the spec; Ralph was not called.
- `stopped` — the review loop reached its limit without approval; Ralph was not called.
- `approved-ready-for-ralph` — the spec was approved and Ralph launch metadata is ready for the parent chat/agent.

Returned metadata can include:

- `mode`
- `brainstorm_brief_path`
- `research_path`
- `spec_path`
- `approved_spec_path`
- `ralph_workflow`
- `ralph_prompt`
- `ralph_inputs`
- `ralph_command`
- `max_loops`
- `message`
