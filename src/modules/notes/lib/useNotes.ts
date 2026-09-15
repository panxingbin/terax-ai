import { create } from "zustand";
import {
  createNote,
  createGroup,
  loadNotes,
  loadGroups,
  loadActiveId,
  saveNotes,
  saveGroups,
  saveActiveId,
  type Note,
  type NoteGroup,
} from "./store";

type NotesState = {
  notes: Note[];
  groups: NoteGroup[];
  activeNoteId: string | null;
  activeGroupId: string | null;
  searchQuery: string;
  initialized: boolean;
  init: () => Promise<void>;
  create: (groupId?: string | null) => Promise<string>;
  update: (id: string, patch: Partial<Note>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  setActive: (id: string | null) => void;
  setSearch: (q: string) => void;
  createGroup: (name: string, order?: number, parentId?: string | null) => Promise<string>;
  updateGroup: (id: string, patch: Partial<NoteGroup>) => Promise<void>;
  removeGroup: (id: string) => Promise<void>;
  toggleGroupCollapse: (id: string) => Promise<void>;
  setActiveGroup: (id: string | null) => void;
  moveNoteToGroup: (noteId: string, groupId: string | null) => Promise<void>;
};

export const useNotes = create<NotesState>((set, get) => ({
  notes: [],
  groups: [],
  activeNoteId: null,
  activeGroupId: null,
  searchQuery: "",
  initialized: false,
  init: async () => {
    if (get().initialized) return;
    const [notes, groups, activeId] = await Promise.all([
      loadNotes(),
      loadGroups(),
      loadActiveId(),
    ]);
    set({ notes, groups, activeNoteId: activeId, initialized: true });
  },
  create: async (groupId) => {
    const targetGroupId = groupId ?? get().activeGroupId ?? "default";
    const note = createNote("無標題筆記", targetGroupId);
    const notes = [...get().notes, note];
    set({ notes, activeNoteId: note.id });
    void persistNotes(notes, note.id);
    return note.id;
  },
  update: async (id, patch) => {
    const notes = get().notes.map((n) =>
      n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n,
    );
    set({ notes });
    void persistNotes(notes, get().activeNoteId);
  },
  remove: async (id) => {
    const notes = get().notes.filter((n) => n.id !== id);
    const activeId = get().activeNoteId === id ? null : get().activeNoteId;
    set({ notes, activeNoteId: activeId });
    void persistNotes(notes, activeId);
  },
  togglePin: async (id) => {
    const notes = get().notes.map((n) =>
      n.id === id ? { ...n, pinned: !n.pinned } : n,
    );
    set({ notes });
    void persistNotes(notes, get().activeNoteId);
  },
  setActive: (id) => {
    set({ activeNoteId: id });
    void saveActiveId(id);
  },
  setSearch: (q) => set({ searchQuery: q }),

  createGroup: async (name, order, parentId) => {
    const group = createGroup(name, order ?? get().groups.length, parentId ?? null);
    const groups = [...get().groups, group];
    set({ groups, activeGroupId: group.id });
    void persistGroups(groups);
    return group.id;
  },
  updateGroup: async (id, patch) => {
    const groups = get().groups.map((g) => (g.id === id ? { ...g, ...patch } : g));
    set({ groups });
    void persistGroups(groups);
  },
  removeGroup: async (id) => {
    const groups = get().groups.filter((g) => g.id !== id);
    const notes = get().notes.map((n) =>
      n.groupId === id ? { ...n, groupId: "default" } : n,
    );
    set({ groups, notes });
    void persistGroups(groups);
    void persistNotes(notes, get().activeNoteId);
  },
  toggleGroupCollapse: async (id) => {
    const groups = get().groups.map((g) =>
      g.id === id ? { ...g, collapsed: !g.collapsed } : g,
    );
    set({ groups });
    void persistGroups(groups);
  },
  setActiveGroup: (id) => set({ activeGroupId: id }),
  moveNoteToGroup: async (noteId, groupId) => {
    const notes = get().notes.map((n) =>
      n.id === noteId ? { ...n, groupId } : n,
    );
    set({ notes });
    void persistNotes(notes, get().activeNoteId);
  },
}));

let pendingSaves: Promise<void>[] = [];

function persistNotes(notes: Note[], activeId: string | null) {
  const p = saveNotes(notes).then(() => saveActiveId(activeId));
  pendingSaves.push(p);
  p.finally(() => {
    pendingSaves = pendingSaves.filter((s) => s !== p);
  });
}

function persistGroups(groups: NoteGroup[]) {
  void saveGroups(groups);
}

/** Wait for all pending saves (for tests / app exit). */
export async function flushNotes(): Promise<void> {
  await Promise.allSettled(pendingSaves);
}

/** Selector helpers. */
export function selectFilteredNotes(notes: Note[], query: string): Note[] {
  if (!query) return sortNotes(notes);
  const q = query.toLowerCase();
  return sortNotes(
    notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q)),
    ),
  );
}

function sortNotes(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.updatedAt - a.updatedAt;
  });
}
