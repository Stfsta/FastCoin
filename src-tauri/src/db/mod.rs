pub mod models;
pub mod seed;

use rusqlite::Connection;
use std::path::PathBuf;

fn get_db_path() -> PathBuf {
    let mut path = dirs_db_path();
    std::fs::create_dir_all(&path).ok();
    path.push("fastcoin.db");
    path
}

fn dirs_db_path() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        let local_app_data =
            std::env::var("LOCALAPPDATA").unwrap_or_else(|_| ".".to_string());
        PathBuf::from(local_app_data).join("FastCoin")
    }
    #[cfg(target_os = "macos")]
    {
        let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
        PathBuf::from(home)
            .join("Library")
            .join("Application Support")
            .join("FastCoin")
    }
    #[cfg(target_os = "linux")]
    {
        let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
        PathBuf::from(home).join(".local").join("share").join("FastCoin")
    }
}

pub fn init_db() -> Result<Connection, Box<dyn std::error::Error>> {
    let db_path = get_db_path();
    let conn = Connection::open(&db_path)?;

    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;

    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS payment_sources (
            id           TEXT PRIMARY KEY,
            name         TEXT NOT NULL,
            type         TEXT NOT NULL,
            icon         TEXT NOT NULL DEFAULT '💳',
            color        TEXT NOT NULL DEFAULT '#3B82F6',
            sort_order   INTEGER NOT NULL DEFAULT 0,
            is_active    INTEGER NOT NULL DEFAULT 1,
            created_at   INTEGER NOT NULL,
            updated_at   INTEGER NOT NULL,
            version      INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS categories (
            id           TEXT PRIMARY KEY,
            name         TEXT NOT NULL,
            icon         TEXT NOT NULL,
            color        TEXT NOT NULL,
            parent_id    TEXT,
            sort_order   INTEGER NOT NULL DEFAULT 0,
            is_active    INTEGER NOT NULL DEFAULT 1,
            created_at   INTEGER NOT NULL,
            updated_at   INTEGER NOT NULL,
            version      INTEGER NOT NULL DEFAULT 1,
            FOREIGN KEY (parent_id) REFERENCES categories(id)
        );

        CREATE TABLE IF NOT EXISTS accounting_periods (
            id           TEXT PRIMARY KEY,
            name         TEXT NOT NULL,
            start_date   TEXT NOT NULL,
            end_date     TEXT NOT NULL,
            is_active    INTEGER NOT NULL DEFAULT 0,
            created_at   INTEGER NOT NULL,
            updated_at   INTEGER NOT NULL,
            version      INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS expenses (
            id            TEXT PRIMARY KEY,
            amount        INTEGER NOT NULL,
            currency      TEXT NOT NULL DEFAULT 'CNY',
            source_id     TEXT NOT NULL,
            category_id   TEXT,
            note          TEXT NOT NULL DEFAULT '',
            date          TEXT NOT NULL,
            created_at    INTEGER NOT NULL,
            updated_at    INTEGER NOT NULL,
            version       INTEGER NOT NULL DEFAULT 1,
            FOREIGN KEY (source_id) REFERENCES payment_sources(id),
            FOREIGN KEY (category_id) REFERENCES categories(id)
        );

        CREATE INDEX IF NOT EXISTS idx_expenses_date
            ON expenses(date);
        CREATE INDEX IF NOT EXISTS idx_expenses_date_source
            ON expenses(date, source_id);
        CREATE INDEX IF NOT EXISTS idx_expenses_version
            ON expenses(version);

        CREATE TABLE IF NOT EXISTS app_settings (
            id                     TEXT PRIMARY KEY DEFAULT 'singleton',
            default_currency       TEXT NOT NULL DEFAULT 'CNY',
            default_source_id      TEXT,
            active_period_id       TEXT,
            theme                  TEXT NOT NULL DEFAULT 'system',
            locale                 TEXT NOT NULL DEFAULT 'zh-CN',
            key_salt               TEXT,
            device_id              TEXT NOT NULL,
            data_version           INTEGER NOT NULL DEFAULT 0,
            last_exported_version  INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS deletion_log (
            id            TEXT PRIMARY KEY,
            entity_type   TEXT NOT NULL,
            entity_id     TEXT NOT NULL,
            deleted_at    INTEGER NOT NULL,
            version       INTEGER NOT NULL
        );
        ",
    )?;

    // Check if seed is needed
    let count: i64 =
        conn.query_row("SELECT COUNT(*) FROM payment_sources", [], |row| row.get(0))?;
    if count == 0 {
        seed::seed_defaults(&conn)?;
    }

    Ok(conn)
}
