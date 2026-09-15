import { useNotes } from "../lib/useNotes";
import {
  saveAttachment,
  deleteAttachment,
  readAttachment,
  downloadAttachment,
  formatSize,
  isImage,
} from "../lib/attachments";
import { useEffect, useRef, useState } from "react";

type Props = {
  noteId: string;
};

export function NoteEditor({ noteId }: Props) {
  const { notes, update } = useNotes();
  const note = notes.find((n) => n.id === noteId);
  const [value, setValue] = useState(note?.content ?? "");
  const [title, setTitle] = useState(note?.title ?? "");
  const [preview, setPreview] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (note) {
      setValue(note.content);
      setTitle(note.title);
    }
  }, [note?.id]);

  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void update(noteId, { content: value, title });
    }, 500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [value, title, noteId, update]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || !note) return;
    setUploading(true);
    try {
      const newAttachments = [...(note.attachments || [])];
      for (const file of Array.from(files)) {
        const att = await saveAttachment(noteId, file);
        newAttachments.push({
          id: att.id,
          filename: att.filename,
          size: att.size,
          mime: att.mime,
        });
      }
      await update(noteId, { attachments: newAttachments });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAttachment = async (attId: string) => {
    if (!note) return;
    await deleteAttachment(noteId, attId);
    const newAttachments = (note.attachments || []).filter((a) => a.id !== attId);
    await update(noteId, { attachments: newAttachments });
  };

  const handleDownload = async (attId: string, filename: string, mime: string) => {
    const data = await readAttachment(noteId, attId);
    downloadAttachment(data, filename, mime);
  };

  if (!note) {
    return (
      <div className="flex h-full items-center justify-center text-[12px] text-muted-foreground">
        Note not found.
      </div>
    );
  }

  const attachments = note.attachments || [];

  return (
    <div
      className="flex h-full flex-col"
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        void handleUpload(e.dataTransfer.files);
      }}
    >
      {/* Title + Preview toggle */}
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled"
          className="flex-1 bg-transparent text-[14px] font-medium outline-none placeholder:text-muted-foreground/50"
        />
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            void handleUpload(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="h-7 shrink-0 rounded-md px-3 text-[11px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
          title="Attach files"
        >
          {uploading ? "⏳" : "📎"}
        </button>
        <button
          type="button"
          onClick={() => setPreview(!preview)}
          className={`h-7 shrink-0 rounded-md px-3 text-[11px] font-medium transition-colors ${
            preview
              ? "bg-primary/20 text-primary"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
        >
          {preview ? "✏️ 編輯" : "👁 預覽"}
        </button>
      </div>

      {/* Drag overlay */}
      {dragging && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-primary/50 bg-primary/10">
          <span className="text-[13px] font-medium text-primary">放開以上傳附件</span>
        </div>
      )}

      {/* Content area */}
      {preview ? (
        <div className="flex-1 overflow-y-auto px-4 py-3 text-[13px] leading-relaxed">
          <MarkdownPreview content={value} />
        </div>
      ) : (
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Start writing... (拖放檔案到這裡上傳附件)"
          className="flex-1 resize-none bg-transparent px-4 py-3 text-[13px] leading-relaxed outline-none placeholder:text-muted-foreground/50"
          spellCheck={false}
        />
      )}

      {/* Attachments bar */}
      {attachments.length > 0 && (
        <div className="border-t border-border/60 px-4 py-2">
          <div className="flex flex-wrap gap-2">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="group relative flex items-center gap-2 rounded-lg border border-border/60 bg-card/60 px-2 py-1"
              >
                {isImage(att.mime) ? (
                  <span className="text-[14px]">🖼️</span>
                ) : (
                  <span className="text-[14px]">📄</span>
                )}
                <div className="flex flex-col min-w-0">
                  <span className="max-w-[120px] truncate text-[11px] font-medium">
                    {att.filename}
                  </span>
                  <span className="text-[9px] text-muted-foreground">
                    {formatSize(att.size)}
                  </span>
                </div>
                <div className="absolute -top-1 -right-1 hidden group-hover:flex gap-0.5">
                  <button
                    type="button"
                    aria-label="Download"
                    className="flex h-4 w-4 items-center justify-center rounded-full bg-card text-[8px] shadow hover:bg-accent"
                    onClick={() => handleDownload(att.id, att.filename, att.mime)}
                  >
                    ⬇
                  </button>
                  <button
                    type="button"
                    aria-label="Delete"
                    className="flex h-4 w-4 items-center justify-center rounded-full bg-card text-[8px] shadow hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => void handleDeleteAttachment(att.id)}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MarkdownPreview({ content }: { content: string }) {
  const html = renderMarkdown(content);
  return (
    <div
      className="prose prose-invert max-w-none text-[13px] leading-relaxed"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function renderMarkdown(md: string): string {
  let html = md
    .replace(/```(\w*)\n([\s\S]*?)```/g, "<pre><code>$2</code></pre>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^- \[x\] (.+)$/gm, '<li class="task-checked">$1</li>')
    .replace(/^- \[ \] (.+)$/gm, '<li class="task-unchecked">$1</li>')
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
    .replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\n/g, "<br/>");
  return html;
}
