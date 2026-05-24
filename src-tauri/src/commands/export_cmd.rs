use tauri::State;

use crate::{services::export_service, AppState};

#[tauri::command]
pub fn export_data(
    state: State<AppState>,
    password: String,
    mode: String,
    format: String,
    file_path: String,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    match format.as_str() {
        "fastcoin" => export_service::export_to_fastcoin(&conn, &password, &mode, &file_path)
            .map_err(|e| e.to_string()),
        "xlsx" => export_service::export_to_xlsx(&conn, &file_path).map_err(|e| e.to_string()),
        "csv" => export_service::export_to_csv(&conn, &file_path).map_err(|e| e.to_string()),
        _ => Err(format!("Unsupported export format: {}", format)),
    }
}
