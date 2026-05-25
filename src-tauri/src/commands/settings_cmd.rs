use rusqlite::params;
use tauri::State;

use crate::{db::models::AppSettings, utils::format::now_ms, AppState};

#[tauri::command]
pub fn get_settings(state: State<AppState>) -> Result<AppSettings, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.query_row(
        "SELECT id, default_currency, default_source_id, active_period_id, theme, locale, key_salt, device_id, data_version, last_exported_version
         FROM app_settings WHERE id='singleton'",
        [],
        |row| {
            Ok(AppSettings {
                id: row.get(0)?,
                default_currency: row.get(1)?,
                default_source_id: row.get(2)?,
                active_period_id: row.get(3)?,
                theme: row.get(4)?,
                locale: row.get(5)?,
                key_salt: row.get(6)?,
                device_id: row.get(7)?,
                data_version: row.get(8)?,
                last_exported_version: row.get(9)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSettingsArgs {
    pub default_currency: Option<String>,
    pub default_source_id: Option<Option<String>>,
    pub active_period_id: Option<Option<String>>,
    pub theme: Option<String>,
    pub locale: Option<String>,
    pub last_exported_version: Option<i64>,
}

#[tauri::command]
pub fn update_settings(state: State<AppState>, args: UpdateSettingsArgs) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let _now = now_ms();

    if let Some(ref c) = args.default_currency {
        conn.execute(
            "UPDATE app_settings SET default_currency=?1 WHERE id='singleton'",
            params![c],
        )
        .map_err(|e| e.to_string())?;
    }
    if let Some(ref s) = args.default_source_id {
        conn.execute(
            "UPDATE app_settings SET default_source_id=?1 WHERE id='singleton'",
            params![s],
        )
        .map_err(|e| e.to_string())?;
    }
    if let Some(ref a) = args.active_period_id {
        conn.execute(
            "UPDATE app_settings SET active_period_id=?1 WHERE id='singleton'",
            params![a],
        )
        .map_err(|e| e.to_string())?;
    }
    if let Some(ref t) = args.theme {
        conn.execute(
            "UPDATE app_settings SET theme=?1 WHERE id='singleton'",
            params![t],
        )
        .map_err(|e| e.to_string())?;
    }
    if let Some(ref l) = args.locale {
        conn.execute(
            "UPDATE app_settings SET locale=?1 WHERE id='singleton'",
            params![l],
        )
        .map_err(|e| e.to_string())?;
    }
    if let Some(v) = args.last_exported_version {
        conn.execute(
            "UPDATE app_settings SET last_exported_version=?1 WHERE id='singleton'",
            params![v],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}
