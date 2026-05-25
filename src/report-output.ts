import { mkdir, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";

export interface SavedWorkflowReport {
  reportPath: string;
  filenameSummary: string;
}

export interface WriteWorkflowReportOptions {
  workflowName: string;
  outputPath?: string;
  summary: string;
  report: string;
  cwd?: string;
}

export function reportSummaryText(value: unknown, fallback: string): string {
  const summary = String(value ?? "")
    .replace(/[`*_#[\]()>]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (summary.length === 0) {
    return fallback;
  }

  return summary.split(/\s+/).slice(0, 12).join(" ");
}

export function reportFilenameSummary(value: unknown, fallback: string): string {
  const normalized = reportSummaryText(value, fallback)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const slug = normalized.split("-").filter(Boolean).slice(0, 6).join("-");
  const fallbackSlug = String(fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug.length > 0 ? slug : fallbackSlug || "report";
}

export function resolveReportPath(options: Omit<WriteWorkflowReportOptions, "report">): SavedWorkflowReport {
  const cwd = options.cwd ?? process.cwd();
  const explicitOutputPath = String(options.outputPath ?? "").trim();
  const filenameSummary = reportFilenameSummary(options.summary, options.workflowName);

  if (explicitOutputPath.length > 0) {
    return {
      reportPath: isAbsolute(explicitOutputPath) ? explicitOutputPath : resolve(cwd, explicitOutputPath),
      filenameSummary,
    };
  }

  const date = new Date().toISOString().slice(0, 10);

  return {
    reportPath: join(cwd, options.workflowName, `${date}-${filenameSummary}.md`),
    filenameSummary,
  };
}

export async function writeWorkflowReport(options: WriteWorkflowReportOptions): Promise<SavedWorkflowReport> {
  const savedReport = resolveReportPath(options);
  await mkdir(dirname(savedReport.reportPath), { recursive: true });
  await writeFile(savedReport.reportPath, `${options.report.trimEnd()}\n`, "utf8");

  return savedReport;
}
