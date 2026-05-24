use rusqlite::params;
use tauri::State;

use crate::{
    db::models::PaymentSource,
    utils::format::now_ms,
    AppState,
};

#[tauri::command]
pub fn get_payment_sources(state: State<AppState>) -> Result<Vec<PaymentSource>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, name, type, icon, color, sort_order, is_active, created_at, updated_at, version
             FROM payment_sources WHERE is_active = 1 ORDER BY sort_order ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(PaymentSource {
                id: row.get(0)?,
                name: row.get(1)?,
                source_type: row.get(2)?,
                icon: row.get(3)?,
                color: row.get(4)?,
                sort_order: row.get(5)?,
                is_active: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
                version: row.get(9)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut sources = Vec::new();
    for row in rows {
        sources.push(row.map_err(|e| e.to_string())?);
    }
    Ok(sources)
}

#[tauri::command]
pub fn add_payment_source(
    state: State<AppState>,
    name: String,
    source_type: String,
    icon: String,
    color: String,
) -> Result<PaymentSource, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = now_ms();
    let max_order: i32 = conn
        .query_row(
            "SELECT COALESCE(MAX(sort_order), -1) FROM payment_sources",
            [],
            |row| row.get(0),
        )
        .unwrap_or(-1);

    conn.execute(
        "INSERT INTO payment_sources (id, name, type, icon, color, sort_order, is_active, created_at, updated_at, version)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, ?7, ?7, 1)",
        params![id, name, source_type, icon, color, max_order + 1, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(PaymentSource {
        id,
        name,
        source_type,
        icon,
        color,
        sort_order: max_order + 1,
        is_active: true,
        created_at: now,
        updated_at: now,
        version: 1,
    })
}

#[tauri::command]
pub fn update_payment_source(
    state: State<AppState>,
    id: String,
    name: Option<String>,
    source_type: Option<String>,
    icon: Option<String>,
    color: Option<String>,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = now_ms();

    if let Some(ref n) = name {
        conn.execute(
            "UPDATE payment_sources SET name=?1, updated_at=?2, version=version+1 WHERE id=?3",
            params![n, now, id],
        )
        .map_err(|e| e.to_string())?;
    }
    if let Some(ref t) = source_type {
        conn.execute(
            "UPDATE payment_sources SET type=?1, updated_at=?2, version=version+1 WHERE id=?3",
            params![t, now, id],
        )
        .map_err(|e| e.to_string())?;
    }
    if let Some(ref i) = icon {
        conn.execute(
            "UPDATE payment_sources SET icon=?1, updated_at=?2, version=version+1 WHERE id=?3",
            params![i, now, id],
        )
        .map_err(|e| e.to_string())?;
    }
    if let Some(ref c) = color {
        conn.execute(
            "UPDATE payment_sources SET color=?1, updated_at=?2, version=version+1 WHERE id=?3",
            params![c, now, id],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub fn delete_payment_source(state: State<AppState>, id: String) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = now_ms();
    let version: i64 = conn
        .query_row(
            "SELECT version FROM payment_sources WHERE id=?1",
            params![id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    // Soft delete
    conn.execute(
        "UPDATE payment_sources SET is_active=0, updated_at=?1, version=version+1 WHERE id=?2",
        params![now, id],
    )
    .map_err(|e| e.to_string())?;

    // Record deletion for sync
    let deletion_id = uuid::Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO deletion_log (id, entity_type, entity_id, deleted_at, version)
         VALUES (?1, 'payment_source', ?2, ?3, ?4)",
        params![deletion_id, id, now, version + 1],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn reorder_payment_sources(state: State<AppState>, ids: Vec<String>) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = now_ms();
    for (i, id) in ids.iter().enumerate() {
        conn.execute(
            "UPDATE payment_sources SET sort_order=?1, updated_at=?2, version=version+1 WHERE id=?3",
            params![i as i32, now, id],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}
