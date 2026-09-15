import { invoke } from "@tauri-apps/api/core";

export function historySuggest(line: string): Promise<string | null> {
  return invoke<string | null>("history_suggest", { line }).catch(() => null);
}

export function historySuggestMulti(
  line: string,
  cwd?: string,
  limit = 5,
): Promise<string[]> {
  return invoke<string[]>("history_suggest_multi", { line, cwd, limit }).catch(() => []);
}

export function historyCommands(prefix: string, limit = 50): Promise<string[]> {
  return invoke<string[]>("history_commands", { prefix, limit }).catch(() => []);
}

export function historyList(query: string, limit = 200): Promise<string[]> {
  return invoke<string[]>("history_list", { query, limit }).catch(() => []);
}

export function historyRecord(command: string): void {
  void invoke("history_record", { command }).catch(() => {});
}

export function completeSubcommands(program: string, args: string[]): Promise<string[]> {
  return invoke<string[]>("complete_subcommands", { program, args }).catch(() => []);
}
