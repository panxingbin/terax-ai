import { invoke } from "@tauri-apps/api/core";

export type Attachment = {
  id: string;
  filename: string;
  size: number;
  mime: string;
};

/** Read a File object as Uint8Array for IPC transport. */
export async function fileToBuffer(file: File): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

/** Save an attachment to the note via Tauri command. */
export async function saveAttachment(
  noteId: string,
  file: File,
): Promise<Attachment> {
  const data = await fileToBuffer(file);
  return invoke<Attachment>("notes_attachment_save", {
    noteId,
    filename: file.name,
    data,
  });
}

/** Delete an attachment via Tauri command. */
export async function deleteAttachment(
  noteId: string,
  attId: string,
): Promise<void> {
  await invoke("notes_attachment_delete", { noteId, attId });
}

/** List attachments for a note (returns id, path, size tuples). */
export async function listAttachments(
  noteId: string,
): Promise<Array<{ id: string; path: string; size: number }>> {
  return invoke<Array<{ id: string; path: string; size: number }>>(
    "notes_attachment_list",
    { noteId },
  );
}

/** Read an attachment's raw bytes. */
export async function readAttachment(
  noteId: string,
  attId: string,
): Promise<Uint8Array> {
  return invoke<Uint8Array>("notes_attachment_read", { noteId, attId });
}

/** Format bytes as human-readable size. */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Check if a mime type is an image. */
export function isImage(mime: string): boolean {
  return mime.startsWith("image/");
}

/** Trigger browser download of attachment data. */
export function downloadAttachment(data: Uint8Array, filename: string, mime: string) {
  const blob = new Blob([data as BlobPart], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
