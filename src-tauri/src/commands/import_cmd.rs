use tauri::State;

use crate::{
    crypto::encrypt::EncryptedFile,
    services::import_service,
    AppState,
};

#[tauri::command]
pub fn import_preview(
    state: State<AppState>,
    file_path: String,
    password: String,
) -> Result<import_service::ImportDiff, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let file_content = std::fs::read_to_string(&file_path).map_err(|e| e.to_string())?;
    let encrypted: EncryptedFile =
        serde_json::from_str(&file_content).map_err(|e| format!("Invalid file format: {}", e))?;

    import_service::compute_import_preview(&conn, &encrypted, &password).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn import_confirm(
    state: State<AppState>,
    file_path: String,
    password: String,
    strategy: String,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let file_content = std::fs::read_to_string(&file_path).map_err(|e| e.to_string())?;
    let encrypted: EncryptedFile =
        serde_json::from_str(&file_content).map_err(|e| format!("Invalid file format: {}", e))?;

    import_service::apply_import(&conn, &encrypted, &password, &strategy)
        .map_err(|e| e.to_string())
}
