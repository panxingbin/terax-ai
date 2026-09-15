use std::path::PathBuf;
use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, State};

const MAX_ATTACHMENT_BYTES: u64 = 50 * 1024 * 1024; // 50 MB per file

#[derive(Default)]
pub struct NotesState {
    base_dir: Mutex<Option<PathBuf>>,
}

#[derive(Serialize)]
pub struct AttachmentInfo {
    pub id: String,
    pub filename: String,
    pub size: u64,
    pub mime: String,
}

fn base_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_local_data_dir()
        .map_err(|e| e.to_string())?
        .join("notes")
        .join("attachments");
    std::fs::create_dir_all(&dir).map_err(|e| format!("create dir: {e}"))?;
    Ok(dir)
}

fn attachment_path(app: &AppHandle, note_id: &str, att_id: &str) -> Result<PathBuf, String> {
    let dir = base_dir(app)?.join(note_id);
    std::fs::create_dir_all(&dir).map_err(|e| format!("create dir: {e}"))?;
    Ok(dir.join(att_id))
}

#[tauri::command]
pub fn notes_attachment_save(
    app: AppHandle,
    note_id: String,
    filename: String,
    data: Vec<u8>,
) -> Result<AttachmentInfo, String> {
    if data.len() as u64 > MAX_ATTACHMENT_BYTES {
        return Err(format!(
            "File too large: {} bytes (max {} bytes)",
            data.len(),
            MAX_ATTACHMENT_BYTES
        ));
    }
    let att_id = format!(
        "{}-{}",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis(),
        rand::random::<u16>()
    );
    let path = attachment_path(&app, &note_id, &att_id)?;
    std::fs::write(&path, &data).map_err(|e| format!("write: {e}"))?;

    let mime = mime_guess::from_path(&filename)
        .first_raw()
        .unwrap_or("application/octet-stream")
        .to_string();

    Ok(AttachmentInfo {
        id: att_id,
        filename,
        size: data.len() as u64,
        mime,
    })
}

#[tauri::command]
pub fn notes_attachment_delete(
    app: AppHandle,
    note_id: String,
    att_id: String,
) -> Result<(), String> {
    let path = attachment_path(&app, &note_id, &att_id)?;
    if path.exists() {
        std::fs::remove_file(&path).map_err(|e| format!("delete: {e}"))?;
    }
    Ok(())
}

#[tauri::command]
pub fn notes_attachment_list(
    app: AppHandle,
    note_id: String,
) -> Result<Vec<(String, String, u64)>, String> {
    let dir = base_dir(&app)?.join(note_id);
    if !dir.exists() {
        return Ok(Vec::new());
    }
    let mut results = Vec::new();
    for entry in std::fs::read_dir(&dir).map_err(|e| format!("read dir: {e}"))? {
        let entry = entry.map_err(|e| format!("entry: {e}"))?;
        let meta = entry.metadata().map_err(|e| format!("meta: {e}"))?;
        if meta.is_file() {
            let name = entry.file_name().to_string_lossy().to_string();
            results.push((name, entry.path().to_string_lossy().to_string(), meta.len()));
        }
    }
    Ok(results)
}

#[tauri::command]
pub fn notes_attachment_read(
    app: AppHandle,
    note_id: String,
    att_id: String,
) -> Result<Vec<u8>, String> {
    let path = attachment_path(&app, &note_id, &att_id)?;
    std::fs::read(&path).map_err(|e| format!("read: {e}"))
}
