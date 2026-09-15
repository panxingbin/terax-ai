import { LazyStore } from "@tauri-apps/plugin-store";

export type NoteGroup = {
  id: string;
  name: string;
  color: string;
  collapsed: boolean;
  order: number;
  parentId: string | null;  // null = 頂層分組
};

export type NoteAttachment = {
  id: string;
  filename: string;
  size: number;
  mime: string;
};

export type Note = {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  groupId: string | null;
  createdAt: number;
  updatedAt: number;
  tags: string[];
  attachments: NoteAttachment[];
};

const STORE_PATH = "terax-notes.json";
const KEY_NOTES = "notes";
const KEY_GROUPS = "groups";
const KEY_ACTIVE = "activeId";

const store = new LazyStore(STORE_PATH, { defaults: {}, autoSave: 200 });

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export async function loadNotes(): Promise<Note[]> {
  return (await store.get<Note[]>(KEY_NOTES)) ?? [];
}

export async function saveNotes(list: Note[]): Promise<void> {
  await store.set(KEY_NOTES, list);
  await store.save();
}

export async function loadGroups(): Promise<NoteGroup[]> {
  const groups = await store.get<NoteGroup[]>(KEY_GROUPS);
  if (!groups || groups.length === 0) {
    // 預設分組（含子分組）
    const defaults: NoteGroup[] = [
      { id: "work", name: "💼 工作", color: "#6366f1", collapsed: false, order: 0, parentId: null },
      { id: "work-sprint", name: "Sprint", color: "#8b5cf6", collapsed: false, order: 0, parentId: "work" },
      { id: "work-meeting", name: "會議記錄", color: "#a855f7", collapsed: false, order: 1, parentId: "work" },
      { id: "learning", name: "📚 學習", color: "#22c55e", collapsed: false, order: 1, parentId: null },
      { id: "learning-rust", name: "Rust", color: "#14b8a6", collapsed: false, order: 0, parentId: "learning" },
      { id: "learning-k8s", name: "Kubernetes", color: "#06b6d4", collapsed: false, order: 1, parentId: "learning" },
      { id: "personal", name: "🏠 個人", color: "#f97316", collapsed: false, order: 2, parentId: null },
    ];
    await saveGroups(defaults);
    return defaults;
  }
  return groups;
}

export async function saveGroups(list: NoteGroup[]): Promise<void> {
  await store.set(KEY_GROUPS, list);
  await store.save();
}

export async function loadActiveId(): Promise<string | null> {
  return (await store.get<string>(KEY_ACTIVE)) ?? null;
}

export async function saveActiveId(id: string | null): Promise<void> {
  await store.set(KEY_ACTIVE, id);
  await store.save();
}

export function createNote(title = "Untitled", groupId: string | null = null): Note {
  const now = Date.now();
  return {
    id: newId("note"),
    title,
    content: "",
    pinned: false,
    groupId,
    createdAt: now,
    updatedAt: now,
    tags: [],
    attachments: [],
  };
}

const GROUP_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f97316",
  "#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
];

export function createGroup(name: string, order: number, parentId: string | null = null): NoteGroup {
  return {
    id: newId("group"),
    name,
    color: GROUP_COLORS[order % GROUP_COLORS.length],
    collapsed: false,
    order,
    parentId,
  };
}
