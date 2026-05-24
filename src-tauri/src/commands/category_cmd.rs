use rusqlite::params;
use tauri::State;

use crate::{
    db::models::Category,
    utils::format::now_ms,
    AppState,
};

#[tauri::command]
pub fn get_categories(state: State<AppState>) -> Result<Vec<Category>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, name, icon, color, parent_id, sort_order, is_active, created_at, updated_at, version
             FROM categories WHERE is_active = 1 ORDER BY sort_order ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(Category {
                id: row.get(0)?,
                name: row.get(1)?,
                icon: row.get(2)?,
                color: row.get(3)?,
                parent_id: row.get(4)?,
                sort_order: row.get(5)?,
                is_active: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
                version: row.get(9)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut cats = Vec::new();
    for row in rows {
        cats.push(row.map_err(|e| e.to_string())?);
    }
    Ok(cats)
}

#[tauri::command]
pub fn add_category(
    state: State<AppState>,
    name: String,
    icon: String,
    color: String,
    parent_id: Option<String>,
) -> Result<Category, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = now_ms();
    let max_order: i32 = conn
        .query_row(
            "SELECT COALESCE(MAX(sort_order), -1) FROM categories",
            [],
            |row| row.get(0),
        )
        .unwrap_or(-1);

    conn.execute(
        "INSERT INTO categories (id, name, icon, color, parent_id, sort_order, is_active, created_at, updated_at, version)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, ?7, ?7, 1)",
        params![id, name, icon, color, parent_id, max_order + 1, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(Category {
        id,
        name,
        icon,
        color,
        parent_id,
        sort_order: max_order + 1,
        is_active: true,
        created_at: now,
        updated_at: now,
        version: 1,
    })
}

#[tauri::command]
pub fn update_category(
    state: State<AppState>,
    id: String,
    name: Option<String>,
    icon: Option<String>,
    color: Option<String>,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = now_ms();

    if let Some(ref n) = name {
        conn.execute(
            "UPDATE categories SET name=?1, updated_at=?2, version=version+1 WHERE id=?3",
            params![n, now, id],
        )
        .map_err(|e| e.to_string())?;
    }
    if let Some(ref i) = icon {
        conn.execute(
            "UPDATE categories SET icon=?1, updated_at=?2, version=version+1 WHERE id=?3",
            params![i, now, id],
        )
        .map_err(|e| e.to_string())?;
    }
    if let Some(ref c) = color {
        conn.execute(
            "UPDATE categories SET color=?1, updated_at=?2, version=version+1 WHERE id=?3",
            params![c, now, id],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn delete_category(state: State<AppState>, id: String) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = now_ms();
    let version: i64 = conn
        .query_row(
            "SELECT version FROM categories WHERE id=?1",
            params![id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE categories SET is_active=0, updated_at=?1, version=version+1 WHERE id=?2",
        params![now, id],
    )
    .map_err(|e| e.to_string())?;

    let deletion_id = uuid::Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO deletion_log (id, entity_type, entity_id, deleted_at, version)
         VALUES (?1, 'category', ?2, ?3, ?4)",
        params![deletion_id, id, now, version + 1],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}
