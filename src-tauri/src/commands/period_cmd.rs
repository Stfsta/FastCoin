use rusqlite::params;
use tauri::State;

use crate::{
    db::models::AccountingPeriod,
    utils::format::now_ms,
    AppState,
};

#[tauri::command]
pub fn get_periods(state: State<AppState>) -> Result<Vec<AccountingPeriod>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, name, start_date, end_date, is_active, created_at, updated_at, version
             FROM accounting_periods ORDER BY start_date DESC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(AccountingPeriod {
                id: row.get(0)?,
                name: row.get(1)?,
                start_date: row.get(2)?,
                end_date: row.get(3)?,
                is_active: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
                version: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut periods = Vec::new();
    for row in rows {
        periods.push(row.map_err(|e| e.to_string())?);
    }
    Ok(periods)
}

#[tauri::command]
pub fn add_period(
    state: State<AppState>,
    name: String,
    start_date: String,
    end_date: String,
) -> Result<AccountingPeriod, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = now_ms();

    conn.execute(
        "INSERT INTO accounting_periods (id, name, start_date, end_date, is_active, created_at, updated_at, version)
         VALUES (?1, ?2, ?3, ?4, 0, ?5, ?5, 1)",
        params![id, name, start_date, end_date, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(AccountingPeriod {
        id,
        name,
        start_date,
        end_date,
        is_active: false,
        created_at: now,
        updated_at: now,
        version: 1,
    })
}

#[tauri::command]
pub fn update_period(
    state: State<AppState>,
    id: String,
    name: Option<String>,
    start_date: Option<String>,
    end_date: Option<String>,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = now_ms();

    if let Some(ref n) = name {
        conn.execute(
            "UPDATE accounting_periods SET name=?1, updated_at=?2, version=version+1 WHERE id=?3",
            params![n, now, id],
        )
        .map_err(|e| e.to_string())?;
    }
    if let Some(ref s) = start_date {
        conn.execute(
            "UPDATE accounting_periods SET start_date=?1, updated_at=?2, version=version+1 WHERE id=?3",
            params![s, now, id],
        )
        .map_err(|e| e.to_string())?;
    }
    if let Some(ref e) = end_date {
        conn.execute(
            "UPDATE accounting_periods SET end_date=?1, updated_at=?2, version=version+1 WHERE id=?3",
            params![e, now, id],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn delete_period(state: State<AppState>, id: String) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = now_ms();
    let version: i64 = conn
        .query_row(
            "SELECT version FROM accounting_periods WHERE id=?1",
            params![id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    conn.execute("DELETE FROM accounting_periods WHERE id=?1", params![id])
        .map_err(|e| e.to_string())?;

    let deletion_id = uuid::Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO deletion_log (id, entity_type, entity_id, deleted_at, version)
         VALUES (?1, 'period', ?2, ?3, ?4)",
        params![deletion_id, id, now, version + 1],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn set_active_period(state: State<AppState>, id: String) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = now_ms();

    // Deactivate all
    conn.execute(
        "UPDATE accounting_periods SET is_active=0, updated_at=?1",
        params![now],
    )
    .map_err(|e| e.to_string())?;

    // Activate target
    conn.execute(
        "UPDATE accounting_periods SET is_active=1, updated_at=?1, version=version+1 WHERE id=?2",
        params![now, id],
    )
    .map_err(|e| e.to_string())?;

    // Update settings reference
    conn.execute(
        "UPDATE app_settings SET active_period_id=?1 WHERE id='singleton'",
        params![id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}
