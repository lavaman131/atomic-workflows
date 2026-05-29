import { describe, expect, test } from "bun:test";
import { renderTaskContexts } from "../workflows/spec-driven-development/helpers.ts";

describe("spec driven development helpers", () => {
  test("renders multiple task contexts into one previous payload", () => {
    expect(
      renderTaskContexts([
        { name: "current-spec", text: "# Current spec" },
        { name: "review-feedback", text: "Please add rollback guidance." },
        { name: "research-artifact", text: "Research path: research/docs/example.md" },
      ]),
    ).toBe([
      "--- current-spec ---\n# Current spec",
      "--- review-feedback ---\nPlease add rollback guidance.",
      "--- research-artifact ---\nResearch path: research/docs/example.md",
    ].join("\n\n"));
  });

  test("trims only context edge whitespace", () => {
    expect(renderTaskContexts([{ name: "feedback", text: "\n  keep inner spacing  \n" }])).toBe(
      "--- feedback ---\nkeep inner spacing",
    );
  });
});
