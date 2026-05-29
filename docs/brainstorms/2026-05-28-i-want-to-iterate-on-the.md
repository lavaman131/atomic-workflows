## Original prompt

Improve the repo’s testing workflow so it is genuinely valuable for real-world software engineers, potentially by making it more targeted to frontend or backend validation.

## Clarified intent

Create a practical PR/branch validation workflow that helps developers decide whether changes are safe to merge, based on evidence from relevant tests, diffs, coverage signals, and UI validation where appropriate.

## User / actor

Software developers validating implementation changes before merge.

## Desired outcome

A concise validation report with a recommendation:

- `pass`
- `warn`
- `block`
- `unknown`

The report should include evidence, risks, and actionable next steps.

## Decisions made

- Replace the existing `issue-test-lab` workflow.
- Prioritize PR implementation validation over broad testing strategy.
- Inspect the diff or issue to infer affected areas.
- Run relevant repo tests instead of defaulting to all tests.
- Use Playwright for UI-facing changes.
- Identify obvious coverage gaps and untested risk areas.
- Keep conclusions evidence-based, not speculative.

## Non-goals

- Generic test planning.
- Broad release readiness checks.
- CI infrastructure or flaky test triage.
- Automatic test generation, unless added explicitly later.
- Full frontend/backend testing framework redesign.

## Assumptions / open questions

- The workflow can execute repo test commands.
- The workflow can inspect diffs and infer affected systems.
- Need to confirm existing test structure and available commands.
- Need to determine whether frontend/backend distinction is useful in this repo.
- Need to understand current `issue-test-lab` behavior before replacing it.

## Research focus

- Locate and analyze the existing `issue-test-lab` workflow.
- Inventory available test commands, frameworks, and conventions.
- Identify how workflows currently inspect issues, branches, diffs, or repo state.
- Determine whether frontend/backend/UI-specific validation paths are feasible.
- Find seams for producing a structured recommendation report.
- Identify minimal changes needed to make the workflow practically useful.
