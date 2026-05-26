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

    let file_content = std::fs::read_to_string(&file_path)
        .map_err(|e| format!("无法读取文件: {}", e))?;
    let encrypted: EncryptedFile =
        serde_json::from_str(&file_content).map_err(|e| format!("文件格式无效: {}", e))?;

    import_service::compute_import_preview(&conn, &encrypted, &password)
        .map_err(|e| format!("预览失败: {}", e))
}

#[tauri::command]
pub fn import_confirm(
    state: State<AppState>,
    file_path: String,
    password: String,
    strategy: String,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let file_content = std::fs::read_to_string(&file_path)
        .map_err(|e| format!("无法读取文件: {}", e))?;
    let encrypted: EncryptedFile =
        serde_json::from_str(&file_content).map_err(|e| format!("文件格式无效: {}", e))?;

    let until_version = encrypted.metadata.until_version;
    import_service::apply_import(&conn, &encrypted, &password, &strategy, until_version)
        .map_err(|e| format!("导入失败: {}", e))
}

#[tauri::command]
pub async fn import_preview_from_content(
    state: State<'_, AppState>,
    file_content: String,
    password: String,
) -> Result<import_service::ImportDiff, String> {
    let db = state.db.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let conn = db.lock().map_err(|e| e.to_string())?;
        let encrypted: EncryptedFile =
            serde_json::from_str(&file_content).map_err(|e| format!("文件格式无效: {}", e))?;
        import_service::compute_import_preview(&conn, &encrypted, &password)
            .map_err(|e| format!("预览失败: {}", e))
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn import_confirm_from_content(
    state: State<'_, AppState>,
    file_content: String,
    password: String,
    strategy: String,
) -> Result<(), String> {
    let db = state.db.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let conn = db.lock().map_err(|e| e.to_string())?;
        let encrypted: EncryptedFile =
            serde_json::from_str(&file_content).map_err(|e| format!("文件格式无效: {}", e))?;
        let until_version = encrypted.metadata.until_version;
        import_service::apply_import(&conn, &encrypted, &password, &strategy, until_version)
            .map_err(|e| format!("导入失败: {}", e))
    })
    .await
    .map_err(|e| e.to_string())?
}
