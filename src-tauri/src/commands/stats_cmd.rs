use tauri::State;

use crate::{services::stats_service, AppState};

#[tauri::command]
pub fn get_stats(
    state: State<AppState>,
    period_id: String,
) -> Result<stats_service::StatsResponse, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    stats_service::compute_stats(&conn, &period_id).map_err(|e| e.to_string())
}
