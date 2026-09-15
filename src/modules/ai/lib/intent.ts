/**
 * 意圖偵測：判斷使用者輸入是終端命令還是自然語言問句。
 *
 * 問句特徵：
 * - 以疑問詞開頭（如何、怎麼、什麼、為什麼...）
 * - 包含問號
 * - 以英文疑問詞開頭（how, what, where...）
 *
 * 命令特徵：
 * - 已知指令開頭
 * - 包含 pipe、邏輯運算子
 * - 非空且非問句
 */

const QUESTION_PATTERNS = [
  /^(如何|怎麼|怎樣|什麼|哪裡|哪個|為什麼|可以|能否|請問)/,
  /^(how|what|where|which|why|can|could|would|do you|please)/i,
  /[？?]$/,
  /^(列出|顯示|查找|搜尋|建立|刪除|複製|移動|安裝|更新|設定)/,
];

const COMMAND_PATTERNS = [
  /^[a-z][a-z0-9_-]*(\s|$)/,   // 已知指令開頭（如 git, ls, cd...）
  /(\|\s*[a-z\-]+)/,           // 包含 pipe
  /(\&\&|\|\|)/,               // 包含邏輯運算子
  /^[./~]/,                    // 路徑開頭
];

const KNOWN_COMMANDS = new Set([
  'cd', 'ls', 'pwd', 'cat', 'grep', 'find', 'rm', 'cp', 'mv', 'mkdir',
  'touch', 'chmod', 'chown', 'echo', 'head', 'tail', 'less', 'more',
  'git', 'docker', 'kubectl', 'npm', 'pnpm', 'yarn', 'node', 'python',
  'pip', 'cargo', 'rustc', 'go', 'make', 'curl', 'wget', 'ssh', 'scp',
  'tar', 'zip', 'unzip', 'vim', 'nano', 'code', 'open', 'exit', 'clear',
  'ps', 'top', 'htop', 'kill', 'ping', 'ifconfig', 'netstat', 'df', 'du',
  'sudo', 'apt', 'brew', 'systemctl', 'journalctl', 'tee', 'sort', 'uniq',
  'wc', 'awk', 'sed', 'cut', 'tr', 'diff', 'patch', 'ssh-keygen', 'rsync',
]);

export type Intent = 'command' | 'question';

/**
 * 偵測使用者輸入的意圖。
 */
export function detectIntent(input: string): Intent {
  const trimmed = input.trim();

  if (!trimmed) return 'command';

  // 檢查是否為已知命令開頭
  const firstWord = trimmed.split(/\s+/)[0]?.toLowerCase();
  if (firstWord && KNOWN_COMMANDS.has(firstWord)) {
    return 'command';
  }

  // 檢查問句特徵
  for (const pattern of QUESTION_PATTERNS) {
    if (pattern.test(trimmed)) {
      return 'question';
    }
  }

  // 檢查命令特徵
  for (const pattern of COMMAND_PATTERNS) {
    if (pattern.test(trimmed)) {
      return 'command';
    }
  }

  // 預設為命令（避免輕微的自然語言被誤判）
  return 'command';
}

/**
 * 判斷是否需要顯示 AI 建議。
 *
 * 條件：
 * 1. 偵測為問句
 * 2. 長度足夠（避免空輸入觸發）
 * 3. 不是問號結尾的超短輸入
 */
export function shouldSuggestCommand(input: string): boolean {
  const trimmed = input.trim();
  if (trimmed.length < 3) return false;
  return detectIntent(trimmed) === 'question';
}
