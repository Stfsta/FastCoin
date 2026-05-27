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

#[tauri::command]
pub async fn export_data_to_temp(
    state: State<'_, AppState>,
    password: String,
    mode: String,
    format: String,
    date: Option<String>,
) -> Result<String, String> {
    let db = state.db.clone();
    let data_dir = state.data_dir.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let conn = db.lock().map_err(|e| e.to_string())?;
        let temp_dir = data_dir.join("tmp");
        std::fs::create_dir_all(&temp_dir).map_err(|e| e.to_string())?;
        let temp_id = uuid::Uuid::new_v4().to_string();
        let temp_path = temp_dir.join(&temp_id);
        let path_str = temp_path.to_str().ok_or("Invalid temp path")?;
        match format.as_str() {
            "fastcoin" => {
                export_service::export_to_fastcoin(
                    &conn, &password, &mode, path_str, date.as_deref(),
                )
                    .map_err(|e| e.to_string())?;
            }
            "csv" => {
                export_service::export_to_csv(&conn, path_str).map_err(|e| e.to_string())?;
            }
            "xlsx" => {
                export_service::export_to_xlsx(&conn, path_str).map_err(|e| e.to_string())?;
            }
            _ => return Err(format!("Unsupported export format: {}", format)),
        }
        Ok(path_str.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn export_data_to_bytes(
    state: State<'_, AppState>,
    password: String,
    mode: String,
    format: String,
    date: Option<String>,
) -> Result<String, String> {
    let db = state.db.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let conn = db.lock().map_err(|e| e.to_string())?;
        match format.as_str() {
            "fastcoin" => {
                let content = crate::services::export_service::export_fastcoin_to_content(
                    &conn, &password, &mode, date.as_deref(),
                )
                .map_err(|e| e.to_string())?;
                Ok(base64_encode(content.as_bytes()))
            }
            "csv" => {
                let content =
                    crate::services::export_service::export_csv_to_content(&conn)
                        .map_err(|e| e.to_string())?;
                Ok(base64_encode(content.as_bytes()))
            }
            "xlsx" => {
                let bytes =
                    crate::services::export_service::export_xlsx_to_bytes(&conn)
                        .map_err(|e| e.to_string())?;
                Ok(base64_encode(&bytes))
            }
            _ => Err(format!("Unsupported export format: {}", format)),
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

fn base64_encode(data: &[u8]) -> String {
    use base64ct::Encoding;
    base64ct::Base64::encode_string(data)
}
