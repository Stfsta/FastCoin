use rusqlite::{params, Connection};

use crate::{
    crypto::{decrypt::decrypt_data, encrypt::EncryptedFile},
    services::export_service::ExportPayload,
    utils::{
        error::{AppError, AppResult},
        format::now_ms,
    },
};

#[derive(serde::Serialize)]
pub struct ImportDiff {
    pub expenses: DiffCounts,
    pub payment_sources: DiffCounts,
    pub categories: DiffCounts,
    pub accounting_periods: DiffCounts,
    pub settings: String,
}

#[derive(serde::Serialize)]
pub struct DiffCounts {
    pub new: u32,
    pub updated: u32,
    pub unchanged: u32,
}

pub fn compute_import_preview(
    conn: &Connection,
    encrypted: &EncryptedFile,
    password: &str,
) -> AppResult<ImportDiff> {
    let plaintext = decrypt_data(encrypted, password)?;
    let imported: ExportPayload = serde_json::from_str(&plaintext)?;

    let diff = compute_diff(conn, &imported)?;
    Ok(diff)
}

fn compute_diff(conn: &Connection, imported: &ExportPayload) -> AppResult<ImportDiff> {
    let mut expense_diff = DiffCounts { new: 0, updated: 0, unchanged: 0 };
    let mut source_diff = DiffCounts { new: 0, updated: 0, unchanged: 0 };
    let mut cat_diff = DiffCounts { new: 0, updated: 0, unchanged: 0 };
    let mut period_diff = DiffCounts { new: 0, updated: 0, unchanged: 0 };

    // Count diffs for expenses
    for exp in &imported.expenses {
        let local_version: Option<i64> = conn
            .query_row(
                "SELECT version FROM expenses WHERE id=?1",
                params![exp.id],
                |row| row.get(0),
            )
            .ok();
        match local_version {
            None => expense_diff.new += 1,
            Some(v) if exp.version > v => expense_diff.updated += 1,
            _ => expense_diff.unchanged += 1,
        }
    }

    // Payment sources
    for src in &imported.payment_sources {
        let local_version: Option<i64> = conn
            .query_row(
                "SELECT version FROM payment_sources WHERE id=?1",
                params![src.id],
                |row| row.get(0),
            )
            .ok();
        match local_version {
            None => source_diff.new += 1,
            Some(v) if src.version > v => source_diff.updated += 1,
            _ => source_diff.unchanged += 1,
        }
    }

    // Categories
    for cat in &imported.categories {
        let local_version: Option<i64> = conn
            .query_row(
                "SELECT version FROM categories WHERE id=?1",
                params![cat.id],
                |row| row.get(0),
            )
            .ok();
        match local_version {
            None => cat_diff.new += 1,
            Some(v) if cat.version > v => cat_diff.updated += 1,
            _ => cat_diff.unchanged += 1,
        }
    }

    // Accounting periods
    for period in &imported.accounting_periods {
        let local_version: Option<i64> = conn
            .query_row(
                "SELECT version FROM accounting_periods WHERE id=?1",
                params![period.id],
                |row| row.get(0),
            )
            .ok();
        match local_version {
            None => period_diff.new += 1,
            Some(v) if period.version > v => period_diff.updated += 1,
            _ => period_diff.unchanged += 1,
        }
    }

    let settings_status = if imported.settings.data_version > 0 {
        "different"
    } else {
        "same"
    };

    Ok(ImportDiff {
        expenses: expense_diff,
        payment_sources: source_diff,
        categories: cat_diff,
        accounting_periods: period_diff,
        settings: settings_status.to_string(),
    })
}

pub fn apply_import(
    conn: &Connection,
    encrypted: &EncryptedFile,
    password: &str,
    strategy: &str,
) -> AppResult<()> {
    let plaintext = decrypt_data(encrypted, password)?;
    let imported: ExportPayload = serde_json::from_str(&plaintext)?;
    let _now = now_ms();

    match strategy {
        "import_all" => {
            // Wipe all existing data
            conn.execute_batch(
                "DELETE FROM expenses;
                 DELETE FROM payment_sources;
                 DELETE FROM categories;
                 DELETE FROM accounting_periods;
                 DELETE FROM deletion_log;",
            )?;

            // Insert all imported data
            for exp in &imported.expenses {
                conn.execute(
                    "INSERT OR REPLACE INTO expenses (id, amount, currency, source_id, category_id, note, date, created_at, updated_at, version)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
                    params![exp.id, exp.amount, exp.currency, exp.source_id, exp.category_id, exp.note, exp.date, exp.created_at, exp.updated_at, exp.version],
                )?;
            }
            for src in &imported.payment_sources {
                conn.execute(
                    "INSERT OR REPLACE INTO payment_sources (id, name, type, icon, color, sort_order, is_active, created_at, updated_at, version)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
                    params![src.id, src.name, src.source_type, src.icon, src.color, src.sort_order, src.is_active, src.created_at, src.updated_at, src.version],
                )?;
            }
            for cat in &imported.categories {
                conn.execute(
                    "INSERT OR REPLACE INTO categories (id, name, icon, color, parent_id, sort_order, is_active, created_at, updated_at, version)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
                    params![cat.id, cat.name, cat.icon, cat.color, cat.parent_id, cat.sort_order, cat.is_active, cat.created_at, cat.updated_at, cat.version],
                )?;
            }
            for period in &imported.accounting_periods {
                conn.execute(
                    "INSERT OR REPLACE INTO accounting_periods (id, name, start_date, end_date, is_active, created_at, updated_at, version)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                    params![period.id, period.name, period.start_date, period.end_date, period.is_active, period.created_at, period.updated_at, period.version],
                )?;
            }

            conn.execute(
                "UPDATE app_settings SET default_currency=?1, default_source_id=?2, active_period_id=?3, theme=?4, locale=?5, data_version=?6, last_exported_version=?7 WHERE id='singleton'",
                params![imported.settings.default_currency, imported.settings.default_source_id, imported.settings.active_period_id, imported.settings.theme, imported.settings.locale, imported.settings.data_version, imported.settings.last_exported_version],
            )?;
        }
        "import_newer" => {
            // Merge: only import records with higher version
            for exp in &imported.expenses {
                let local_version: Option<i64> = conn
                    .query_row("SELECT version FROM expenses WHERE id=?1", params![exp.id], |row| row.get(0))
                    .ok();
                let is_deleted: bool = conn
                    .query_row(
                        "SELECT COUNT(*) > 0 FROM deletion_log WHERE entity_type='expense' AND entity_id=?1 AND version > ?2",
                        params![exp.id, exp.version],
                        |row| row.get(0),
                    )
                    .unwrap_or(false);

                if is_deleted {
                    continue;
                }

                let should_import = match local_version {
                    None => true,
                    Some(v) => exp.version > v,
                };

                if should_import {
                    conn.execute(
                        "INSERT OR REPLACE INTO expenses (id, amount, currency, source_id, category_id, note, date, created_at, updated_at, version)
                         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
                        params![exp.id, exp.amount, exp.currency, exp.source_id, exp.category_id, exp.note, exp.date, exp.created_at, exp.updated_at, exp.version],
                    )?;
                }
            }

            // Similar for other entities...
            for src in &imported.payment_sources {
                let local_version: Option<i64> = conn
                    .query_row("SELECT version FROM payment_sources WHERE id=?1", params![src.id], |row| row.get(0))
                    .ok();
                let should_import = match local_version {
                    None => true,
                    Some(v) => src.version > v,
                };
                if should_import {
                    conn.execute(
                        "INSERT OR REPLACE INTO payment_sources (id, name, type, icon, color, sort_order, is_active, created_at, updated_at, version)
                         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
                        params![src.id, src.name, src.source_type, src.icon, src.color, src.sort_order, src.is_active, src.created_at, src.updated_at, src.version],
                    )?;
                }
            }

            for cat in &imported.categories {
                let local_version: Option<i64> = conn
                    .query_row("SELECT version FROM categories WHERE id=?1", params![cat.id], |row| row.get(0))
                    .ok();
                let should_import = match local_version {
                    None => true,
                    Some(v) => cat.version > v,
                };
                if should_import {
                    conn.execute(
                        "INSERT OR REPLACE INTO categories (id, name, icon, color, parent_id, sort_order, is_active, created_at, updated_at, version)
                         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
                        params![cat.id, cat.name, cat.icon, cat.color, cat.parent_id, cat.sort_order, cat.is_active, cat.created_at, cat.updated_at, cat.version],
                    )?;
                }
            }

            for period in &imported.accounting_periods {
                let local_version: Option<i64> = conn
                    .query_row("SELECT version FROM accounting_periods WHERE id=?1", params![period.id], |row| row.get(0))
                    .ok();
                let should_import = match local_version {
                    None => true,
                    Some(v) => period.version > v,
                };
                if should_import {
                    conn.execute(
                        "INSERT OR REPLACE INTO accounting_periods (id, name, start_date, end_date, is_active, created_at, updated_at, version)
                         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                        params![period.id, period.name, period.start_date, period.end_date, period.is_active, period.created_at, period.updated_at, period.version],
                    )?;
                }
            }
        }
        _ => {
            return Err(AppError::Validation(format!(
                "Unknown merge strategy: {}",
                strategy
            )));
        }
    }

    // Apply deletion logs from import
    let mut stmt = conn.prepare("SELECT entity_type, entity_id, version FROM deletion_log")?;
    let deletions: Vec<(String, String, i64)> = stmt
        .query_map([], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?))
        })?
        .filter_map(|r| r.ok())
        .collect();

    for (entity_type, entity_id, _version) in deletions {
        // Check local deletion log - if we have a newer deletion, skip
        let local_deletion_version: Option<i64> = conn
            .query_row(
                "SELECT MAX(version) FROM deletion_log WHERE entity_type=?1 AND entity_id=?2",
                params![entity_type, entity_id],
                |row| row.get(0),
            )
            .ok()
            .flatten();

        if local_deletion_version.is_some() {
            continue; // Already deleted locally
        }

        // Delete the entity if it exists
        match entity_type.as_str() {
            "expense" => {
                conn.execute("DELETE FROM expenses WHERE id=?1", params![entity_id])?;
            }
            "payment_source" => {
                conn.execute("UPDATE payment_sources SET is_active=0 WHERE id=?1", params![entity_id])?;
            }
            "category" => {
                conn.execute("UPDATE categories SET is_active=0 WHERE id=?1", params![entity_id])?;
            }
            "period" => {
                conn.execute("DELETE FROM accounting_periods WHERE id=?1", params![entity_id])?;
            }
            _ => {}
        }
    }

    Ok(())
}
