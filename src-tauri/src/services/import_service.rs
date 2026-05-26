use rusqlite::{params, Connection};

use crate::{
    crypto::{decrypt::decrypt_data, encrypt::EncryptedFile},
    services::export_service::ExportPayload,
    utils::error::{AppError, AppResult},
};

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportDiff {
    pub expenses: DiffCounts,
    pub payment_sources: DiffCounts,
    pub categories: DiffCounts,
    pub accounting_periods: DiffCounts,
    pub settings: String,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
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

    let settings_status = compare_settings(conn, &imported.settings)?;

    Ok(ImportDiff {
        expenses: expense_diff,
        payment_sources: source_diff,
        categories: cat_diff,
        accounting_periods: period_diff,
        settings: settings_status,
    })
}

fn compare_settings(conn: &Connection, imported_settings: &crate::db::models::AppSettings) -> AppResult<String> {
    let local: crate::db::models::AppSettings = conn.query_row(
        "SELECT id, default_currency, default_source_id, active_period_id, theme, locale, key_salt, device_id, data_version, last_exported_version, last_imported_version
         FROM app_settings WHERE id='singleton'",
        [],
        |row| {
            Ok(crate::db::models::AppSettings {
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
                last_imported_version: row.get(10)?,
            })
        },
    )?;

    if local.default_currency != imported_settings.default_currency
        || local.default_source_id != imported_settings.default_source_id
        || local.active_period_id != imported_settings.active_period_id
        || local.theme != imported_settings.theme
        || local.locale != imported_settings.locale
    {
        Ok("different".to_string())
    } else {
        Ok("same".to_string())
    }
}

pub fn apply_import(
    conn: &Connection,
    encrypted: &EncryptedFile,
    password: &str,
    strategy: &str,
    until_version: i64,
) -> AppResult<()> {
    let plaintext = decrypt_data(encrypted, password)?;
    let imported: ExportPayload = serde_json::from_str(&plaintext)?;

    conn.execute_batch("BEGIN TRANSACTION")?;

    let result = match strategy {
        "import_all" => apply_import_all(conn, &imported),
        "import_newer" => apply_import_newer(conn, &imported),
        _ => Err(AppError::Validation(format!(
            "Unknown merge strategy: {}",
            strategy
        ))),
    };

    match result {
        Ok(()) => {
            // Save the imported backup version number
            conn.execute(
                "UPDATE app_settings SET last_imported_version=?1 WHERE id='singleton'",
                params![until_version],
            )?;
            conn.execute_batch("COMMIT")?;
            Ok(())
        }
        Err(e) => {
            conn.execute_batch("ROLLBACK").ok();
            Err(e)
        }
    }
}

fn apply_import_all(conn: &Connection, imported: &ExportPayload) -> AppResult<()> {
    conn.execute_batch(
        "DELETE FROM expenses;
         DELETE FROM payment_sources;
         DELETE FROM categories;
         DELETE FROM accounting_periods;
         DELETE FROM deletion_log;",
    )?;

    // Insert in dependency order: payment_sources and categories first, then expenses
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
    for exp in &imported.expenses {
        conn.execute(
            "INSERT OR REPLACE INTO expenses (id, amount, currency, source_id, category_id, note, date, created_at, updated_at, version)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![exp.id, exp.amount, exp.currency, exp.source_id, exp.category_id, exp.note, exp.date, exp.created_at, exp.updated_at, exp.version],
        )?;
    }

    conn.execute(
        "UPDATE app_settings SET default_currency=?1, default_source_id=?2, active_period_id=?3, theme=?4, locale=?5, data_version=?6, last_exported_version=?7 WHERE id='singleton'",
        params![imported.settings.default_currency, imported.settings.default_source_id, imported.settings.active_period_id, imported.settings.theme, imported.settings.locale, imported.settings.data_version, imported.settings.last_exported_version],
    )?;

    Ok(())
}

fn apply_import_newer(conn: &Connection, imported: &ExportPayload) -> AppResult<()> {
    // Import payment_sources, categories, accounting_periods first (expenses depend on them)
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

    // Then import expenses (they reference payment_sources and categories)
    for exp in &imported.expenses {
        let local_version: Option<i64> = conn
            .query_row("SELECT version FROM expenses WHERE id=?1", params![exp.id], |row| row.get(0))
            .ok();

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

    // Update settings if imported version is newer
    let local_data_version: i64 = conn
        .query_row(
            "SELECT data_version FROM app_settings WHERE id='singleton'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    if imported.settings.data_version > local_data_version {
        conn.execute(
            "UPDATE app_settings SET default_currency=?1, default_source_id=?2, active_period_id=?3, theme=?4, locale=?5, data_version=?6, last_exported_version=?7 WHERE id='singleton'",
            params![imported.settings.default_currency, imported.settings.default_source_id, imported.settings.active_period_id, imported.settings.theme, imported.settings.locale, imported.settings.data_version, imported.settings.last_exported_version],
        )?;
    }

    Ok(())
}
