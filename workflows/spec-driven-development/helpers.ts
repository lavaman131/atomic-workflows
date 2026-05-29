export type TaskContext = { name: string; text: string };

/**
 * Atomic currently substitutes `{previous}` with only the last context item when
 * `previous` is an array. Render multi-part context to one string before passing
 * it through `{previous}` so every named input reaches the worker prompt.
 */
export function renderTaskContexts(contexts: readonly TaskContext[]): string {
  return contexts
    .map(({ name, text }) => `--- ${name} ---\n${text.trim()}`)
    .filter((context) => context.trim().length > 0)
    .join("\n\n");
}
