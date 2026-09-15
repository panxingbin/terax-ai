import { useNotes } from "../lib/useNotes";
import { NoteEditor } from "./NoteEditor";
import { useEffect } from "react";

type Props = {
  activeTabNoteId: string | null;
};

export function NoteStack({ activeTabNoteId }: Props) {
  const { init } = useNotes();

  useEffect(() => {
    void init();
  }, [init]);

  if (!activeTabNoteId) {
    return (
      <div className="flex h-full items-center justify-center text-[12px] text-muted-foreground">
        Select a note from the sidebar or create a new one.
      </div>
    );
  }

  return (
    <div className="h-full">
      <NoteEditor noteId={activeTabNoteId} />
    </div>
  );
}
