pub mod models;
pub mod seed;

use rusqlite::Connection;

pub fn init_db_at(db_path: &std::path::Path) -> Result<Connection, Box<dyn std::error::Error>> {
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let conn = Connection::open(db_path)?;

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
            last_exported_version  INTEGER NOT NULL DEFAULT 0,
            last_imported_version  INTEGER NOT NULL DEFAULT 0
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

    // Migrate: add last_imported_version column if missing
    conn.execute_batch(
        "ALTER TABLE app_settings ADD COLUMN last_imported_version INTEGER NOT NULL DEFAULT 0;"
    ).ok();

    let count: i64 =
        conn.query_row("SELECT COUNT(*) FROM payment_sources", [], |row| row.get(0))?;
    if count == 0 {
        seed::seed_defaults(&conn)?;
    }

    Ok(conn)
}
