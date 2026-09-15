import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { selectFilteredNotes, useNotes } from "../lib/useNotes";
import { NoteIcon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useRef, useState } from "react";

type Props = {
  onOpenNote: (id: string) => void;
};

type Note = { id: string; title: string; content: string; pinned: boolean };
type Group = {
  id: string;
  name: string;
  color: string;
  collapsed: boolean;
  order: number;
  parentId: string | null;
};

export function NoteListPanel({ onOpenNote }: Props) {
  const {
    notes,
    groups,
    searchQuery,
    setSearch,
    init,
    create,
    remove,
    togglePin,
    activeNoteId,
    setActive,
    createGroup,
    toggleGroupCollapse,
    activeGroupId,
    setActiveGroup,
  } = useNotes();
  const [search, setSearchLocal] = useState(searchQuery);
  const [addingGroup, setAddingGroup] = useState(false);
  const [addingGroupParent, setAddingGroupParent] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const groupInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    const t = setTimeout(() => setSearch(search), 200);
    return () => clearTimeout(t);
  }, [search, setSearch]);

  useEffect(() => {
    if (addingGroup) groupInputRef.current?.focus();
  }, [addingGroup]);

  const filtered = selectFilteredNotes(notes, searchQuery);
  const handleNew = async (groupId?: string | null) => {
    const id = await create(groupId);
    onOpenNote(id);
  };
  const handleAddGroup = async (parentId: string | null = null) => {
    if (newGroupName.trim()) {
      await createGroup(newGroupName.trim(), groups.length, parentId);
    }
    setNewGroupName("");
    setAddingGroup(false);
    setAddingGroupParent(null);
  };

  const notesByGroup = new Map<string | null, Note[]>();
  for (const note of filtered) {
    const gid = note.groupId;
    if (!notesByGroup.has(gid)) notesByGroup.set(gid, []);
    notesByGroup.get(gid)!.push(note);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-2 pt-2">
        <Input
          ref={inputRef}
          type="search"
          placeholder="Search notes"
          value={search}
          onChange={(e) => setSearchLocal(e.target.value)}
          className="h-8 text-[12px]"
        />
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          onClick={() => handleNew(activeGroupId)}
          title="New note in current group"
        >
          <HugeiconsIcon icon={PlusSignIcon} size={14} strokeWidth={1.75} />
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-2">
        {filtered.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
            <HugeiconsIcon icon={NoteIcon} size={24} strokeWidth={1.25} />
            <span className="text-[11px]">
              {searchQuery ? "No matching notes" : "No notes yet"}
            </span>
            {!searchQuery && (
              <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => handleNew()}>
                Create your first note
              </Button>
            )}
          </div>
        ) : (
          groups
            .filter((g) => g.parentId === null)
            .sort((a, b) => a.order - b.order)
            .map((group) => (
              <GroupSection
                key={group.id}
                group={group}
                groups={groups}
                notes={notesByGroup.get(group.id) ?? []}
                notesByGroup={notesByGroup}
                activeNoteId={activeNoteId}
                onToggleCollapse={() => toggleGroupCollapse(group.id)}
                onNewNote={() => handleNew(group.id)}
                onOpenNote={onOpenNote}
                onSetActiveNote={setActive}
                onTogglePin={togglePin}
                onDeleteNote={remove}
                onActivateGroup={() => setActiveGroup(group.id)}
                onAddSubGroup={() => { setAddingGroup(true); setAddingGroupParent(group.id); }}
                onToggleSubGroup={(id) => toggleGroupCollapse(id)}
                onNewSubNote={(gid) => handleNew(gid)}
                onOpenSubNote={onOpenNote}
                onSetActiveSubNote={setActive}
                onToggleSubPin={togglePin}
                onDeleteSubNote={remove}
                onActivateSubGroup={(id) => setActiveGroup(id)}
              />
            ))
        )}
      </div>

      <div className="border-t border-border/60 px-2 py-2">
        {addingGroup ? (
          <div className="flex items-center gap-1">
            <Input
              ref={groupInputRef}
              type="text"
              placeholder="Group name"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleAddGroup(addingGroupParent);
                if (e.key === "Escape") { setAddingGroup(false); setAddingGroupParent(null); }
              }}
              className="h-7 text-[11px]"
            />
            <Button size="sm" className="h-7 px-2 text-[10px]" onClick={() => void handleAddGroup(addingGroupParent)}>
              Add
            </Button>
          </div>
        ) : (
          <button
            type="button"
            className="flex h-7 w-full items-center gap-2 rounded-md px-2 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={() => { setAddingGroup(true); setAddingGroupParent(null); }}
          >
            <HugeiconsIcon icon={PlusSignIcon} size={10} strokeWidth={1.75} />
            New group
          </button>
        )}
      </div>
    </div>
  );
}

function GroupSection({
  group,
  groups,
  notes,
  notesByGroup,
  activeNoteId,
  onToggleCollapse,
  onNewNote,
  onOpenNote,
  onSetActiveNote,
  onTogglePin,
  onDeleteNote,
  onActivateGroup,
  onAddSubGroup,
  onToggleSubGroup,
  onNewSubNote,
  onOpenSubNote,
  onSetActiveSubNote,
  onToggleSubPin,
  onDeleteSubNote,
  onActivateSubGroup,
}: {
  group: Group;
  groups: Group[];
  notes: Note[];
  notesByGroup: Map<string | null, Note[]>;
  activeNoteId: string | null;
  onToggleCollapse: () => void;
  onNewNote: () => void;
  onOpenNote: (id: string) => void;
  onSetActiveNote: (id: string) => void;
  onTogglePin: (id: string) => void;
  onDeleteNote: (id: string) => void;
  onActivateGroup: () => void;
  onAddSubGroup: () => void;
  onToggleSubGroup: (id: string) => void;
  onNewSubNote: (gid: string) => void;
  onOpenSubNote: (id: string) => void;
  onSetActiveSubNote: (id: string) => void;
  onToggleSubPin: (id: string) => void;
  onDeleteSubNote: (id: string) => void;
  onActivateSubGroup: (id: string) => void;
}) {
  const subGroups = groups
    .filter((g) => g.parentId === group.id)
    .sort((a, b) => a.order - b.order);

  if (group.collapsed) {
    return (
      <div
        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[12px] text-muted-foreground hover:bg-foreground/[0.045]"
        onClick={onToggleCollapse}
      >
        <span style={{ color: group.color }}>▶</span>
        <span className="font-medium text-foreground">{group.name}</span>
        <span className="text-[10px] text-muted-foreground">{notes.length}</span>
      </div>
    );
  }

  return (
    <div className="mb-2">
      <div
        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[12px] hover:bg-foreground/[0.045]"
        onClick={onActivateGroup}
      >
        <button
          type="button"
          aria-label="Toggle group"
          className="shrink-0 text-[10px] text-muted-foreground hover:text-foreground"
          onClick={(e) => { e.stopPropagation(); onToggleCollapse(); }}
        >
          ▼
        </button>
        <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: group.color }} />
        <span className="flex-1 truncate font-medium text-foreground">{group.name}</span>
        <span className="text-[10px] text-muted-foreground">{notes.length}</span>
        <button
          type="button"
          aria-label="New sub-group"
          className="shrink-0 rounded p-0.5 text-[10px] text-muted-foreground hover:text-foreground"
          onClick={(e) => { e.stopPropagation(); onAddSubGroup(); }}
        >
          📁
        </button>
        <button
          type="button"
          aria-label="New note"
          className="shrink-0 rounded p-0.5 text-[11px] text-muted-foreground hover:text-foreground"
          onClick={(e) => { e.stopPropagation(); onNewNote(); }}
        >
          +
        </button>
      </div>
      <div className="ml-2 mt-0.5 flex flex-col gap-0.5">
        {subGroups.map((sg) => (
          <SubGroupSection
            key={sg.id}
            group={sg}
            notes={notesByGroup.get(sg.id) ?? []}
            activeNoteId={activeNoteId}
            onToggleCollapse={() => onToggleSubGroup(sg.id)}
            onNewNote={() => onNewSubNote(sg.id)}
            onOpenNote={onOpenSubNote}
            onSetActiveNote={onSetActiveSubNote}
            onTogglePin={onToggleSubPin}
            onDeleteNote={onDeleteSubNote}
            onActivateGroup={() => onActivateSubGroup(sg.id)}
          />
        ))}
        {notes.length === 0 ? (
          <div className="px-2 py-1.5 text-[10px] text-muted-foreground/60 italic">No notes</div>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              role="button"
              tabIndex={0}
              className={`flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-left outline-none transition-colors ${
                activeNoteId === note.id
                  ? "bg-foreground/[0.07] text-foreground"
                  : "text-muted-foreground hover:bg-foreground/[0.045] hover:text-foreground"
              }`}
              onClick={() => { onSetActiveNote(note.id); onOpenNote(note.id); }}
              onKeyDown={(e) => { if (e.key === "Enter") { onSetActiveNote(note.id); onOpenNote(note.id); } }}
            >
              <span className="mt-0.5 shrink-0 text-[10px]">{note.pinned ? "⭐" : "📝"}</span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[11px] font-medium">{note.title || "Untitled"}</span>
                {note.content && (
                  <span className="truncate text-[10px] text-muted-foreground/70">
                    {note.content.replace(/[#*`\[\]]/g, "").trim().slice(0, 50)}
                  </span>
                )}
              </div>
              <button
                type="button"
                aria-label={note.pinned ? "Unpin" : "Pin"}
                className="rounded p-0.5 text-[9px] text-muted-foreground hover:text-foreground"
                onClick={(e) => { e.stopPropagation(); onTogglePin(note.id); }}
              >
                📌
              </button>
              <button
                type="button"
                aria-label="Delete"
                className="rounded p-0.5 text-[10px] text-muted-foreground hover:text-destructive"
                onClick={(e) => { e.stopPropagation(); onDeleteNote(note.id); }}
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function SubGroupSection({
  group,
  notes,
  activeNoteId,
  onToggleCollapse,
  onNewNote,
  onOpenNote,
  onSetActiveNote,
  onTogglePin: _onTogglePin,
  onDeleteNote,
  onActivateGroup,
}: {
  group: Group;
  notes: Note[];
  activeNoteId: string | null;
  onToggleCollapse: () => void;
  onNewNote: () => void;
  onOpenNote: (id: string) => void;
  onSetActiveNote: (id: string) => void;
  onTogglePin: (id: string) => void;
  onDeleteNote: (id: string) => void;
  onActivateGroup: () => void;
}) {
  void _onTogglePin;
  const [hover, setHover] = useState(false);

  if (group.collapsed) {
    return (
      <div
        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:bg-foreground/[0.045]"
        onClick={onToggleCollapse}
      >
        <span style={{ color: group.color }}>▶</span>
        <span className="truncate">{group.name}</span>
        <span className="text-[9px] text-muted-foreground/60">{notes.length}</span>
      </div>
    );
  }

  return (
    <div className="mb-1">
      <div
        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:bg-foreground/[0.045]"
        onClick={onActivateGroup}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <button
          type="button"
          aria-label="Toggle sub-group"
          className="shrink-0 text-[9px] text-muted-foreground hover:text-foreground"
          onClick={(e) => { e.stopPropagation(); onToggleCollapse(); }}
        >
          ▼
        </button>
        <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: group.color }} />
        <span className="flex-1 truncate font-medium text-foreground/90">{group.name}</span>
        <span className="text-[9px] text-muted-foreground/60">{notes.length}</span>
        {hover && (
          <button
            type="button"
            aria-label="New note"
            className="shrink-0 rounded p-0.5 text-[10px] hover:text-foreground"
            onClick={(e) => { e.stopPropagation(); onNewNote(); }}
          >
            +
          </button>
        )}
      </div>
      <div className="ml-3 mt-0.5 flex flex-col gap-0.5">
        {notes.length === 0 ? (
          <div className="px-2 py-1 text-[9px] text-muted-foreground/50 italic">Empty</div>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              role="button"
              tabIndex={0}
              className={`flex cursor-pointer items-start gap-1.5 rounded-md px-2 py-1 text-left outline-none transition-colors ${
                activeNoteId === note.id
                  ? "bg-foreground/[0.07] text-foreground"
                  : "text-muted-foreground hover:bg-foreground/[0.045] hover:text-foreground"
              }`}
              onClick={() => { onSetActiveNote(note.id); onOpenNote(note.id); }}
            >
              <span className="mt-0.5 shrink-0 text-[9px]">{note.pinned ? "⭐" : "📝"}</span>
              <span className="flex-1 truncate text-[10px]">{note.title || "Untitled"}</span>
              <button
                type="button"
                aria-label="Delete"
                className="shrink-0 rounded p-0.5 text-[9px] text-muted-foreground hover:text-destructive"
                onClick={(e) => { e.stopPropagation(); onDeleteNote(note.id); }}
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
