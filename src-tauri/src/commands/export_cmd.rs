use tauri::State;

use crate::{services::export_service, AppState};

#[tauri::command]
pub fn export_data(
    state: State<AppState>,
    password: String,
    mode: String,
    format: String,
    file_path: String,
    date: Option<String>,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    match format.as_str() {
        "fastcoin" => export_service::export_to_fastcoin(
            &conn, &password, &mode, &file_path, date.as_deref(),
        )
            .map_err(|e| e.to_string()),
        "xlsx" => export_service::export_to_xlsx(&conn, &file_path).map_err(|e| e.to_string()),
        "csv" => export_service::export_to_csv(&conn, &file_path).map_err(|e| e.to_string()),
        _ => Err(format!("Unsupported export format: {}", format)),
    }
}

#[tauri::command]
pub async fn export_data_to_content(
    state: State<'_, AppState>,
    password: String,
    mode: String,
    format: String,
    date: Option<String>,
) -> Result<serde_json::Value, String> {
    let db = state.db.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let conn = db.lock().map_err(|e| e.to_string())?;
        match format.as_str() {
            "fastcoin" => {
                let content = export_service::export_fastcoin_to_content(
                    &conn, &password, &mode, date.as_deref(),
                )
                    .map_err(|e| e.to_string())?;
                Ok(serde_json::Value::String(content))
            }
            "csv" => {
                let content = export_service::export_csv_to_content(&conn)
                    .map_err(|e| e.to_string())?;
                Ok(serde_json::Value::String(content))
            }
            "xlsx" => {
                let bytes = export_service::export_xlsx_to_bytes(&conn)
                    .map_err(|e| e.to_string())?;
                Ok(serde_json::Value::Array(
                    bytes.into_iter().map(|b| serde_json::Value::Number(b.into())).collect(),
                ))
            }
            _ => Err(format!("Unsupported export format: {}", format)),
        }
    })
    .await
    .map_err(|e| e.to_string())?
}
