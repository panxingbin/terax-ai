import { tool } from "ai";
import { z } from "zod";
import type { ToolContext } from "./context";

/**
 * AI 命令生成工具定義（供 agent 使用）。
 * 前端可直接呼叫 generateCommand() 函式。
 */

export function buildGenerateTool(_ctx: ToolContext) {
  return {
    ai_generate_command: tool({
      description:
        "Generate a shell command from a natural language description.",
      inputSchema: z.object({
        prompt: z.string(),
        cwd: z.string().optional(),
        os: z.string().optional(),
        shell: z.string().optional(),
      }),
      execute: async ({ prompt, cwd, os, shell }) => {
        return { prompt, cwd, os, shell };
      },
    }),
  } as const;
}

/** Stub for frontend use. Actual implementation requires dynamic model creation. */
export async function generateCommand(_input: {
  prompt: string;
  cwd?: string | null;
  os?: string;
  shell?: string;
  history?: string[];
}): Promise<{ command: string; explanation: string; safe: boolean } | { error: string }> {
  return { error: "Not implemented in this environment" };
}
