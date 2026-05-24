use rusqlite::{params, Connection};

use crate::{
    db::models::Expense,
    utils::{error::AppResult, format::now_ms},
};

pub fn get_expenses(
    conn: &Connection,
    start_date: Option<String>,
    end_date: Option<String>,
    source_id: Option<String>,
    limit: Option<i64>,
) -> AppResult<Vec<Expense>> {
    let mut sql = String::from(
        "SELECT id, amount, currency, source_id, category_id, note, date, created_at, updated_at, version
         FROM expenses WHERE 1=1",
    );
    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(ref sd) = start_date {
        sql.push_str(&format!(" AND date >= ?{}", param_values.len() + 1));
        param_values.push(Box::new(sd.clone()));
    }
    if let Some(ref ed) = end_date {
        sql.push_str(&format!(" AND date <= ?{}", param_values.len() + 1));
        param_values.push(Box::new(ed.clone()));
    }
    if let Some(ref sid) = source_id {
        sql.push_str(&format!(" AND source_id = ?{}", param_values.len() + 1));
        param_values.push(Box::new(sid.clone()));
    }

    sql.push_str(" ORDER BY date DESC, created_at DESC");

    if let Some(l) = limit {
        sql.push_str(&format!(" LIMIT {}", l));
    }

    let params_refs: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map(params_refs.as_slice(), |row| {
        Ok(Expense {
            id: row.get(0)?,
            amount: row.get(1)?,
            currency: row.get(2)?,
            source_id: row.get(3)?,
            category_id: row.get(4)?,
            note: row.get(5)?,
            date: row.get(6)?,
            created_at: row.get(7)?,
            updated_at: row.get(8)?,
            version: row.get(9)?,
        })
    })?;

    let mut expenses = Vec::new();
    for row in rows {
        expenses.push(row?);
    }
    Ok(expenses)
}

pub fn add_expense(
    conn: &Connection,
    amount: i64,
    currency: &str,
    source_id: &str,
    category_id: Option<&str>,
    note: &str,
    date: &str,
) -> AppResult<Expense> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = now_ms();

    conn.execute(
        "INSERT INTO expenses (id, amount, currency, source_id, category_id, note, date, created_at, updated_at, version)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8, 1)",
        params![id, amount, currency, source_id, category_id, note, date, now],
    )?;

    // Update data_version
    conn.execute(
        "UPDATE app_settings SET data_version = data_version + 1 WHERE id = 'singleton'",
        [],
    )?;

    Ok(Expense {
        id,
        amount,
        currency: currency.to_string(),
        source_id: source_id.to_string(),
        category_id: category_id.map(String::from),
        note: note.to_string(),
        date: date.to_string(),
        created_at: now,
        updated_at: now,
        version: 1,
    })
}

pub fn update_expense(
    conn: &Connection,
    id: &str,
    amount: Option<i64>,
    source_id: Option<&str>,
    category_id: Option<Option<&str>>,
    note: Option<&str>,
    date: Option<&str>,
) -> AppResult<Expense> {
    let now = now_ms();

    let mut exp = get_expense_by_id(conn, id)?;

    if let Some(a) = amount {
        exp.amount = a;
    }
    if let Some(s) = source_id {
        exp.source_id = s.to_string();
    }
    if let Some(c) = category_id {
        exp.category_id = c.map(String::from);
    }
    if let Some(n) = note {
        exp.note = n.to_string();
    }
    if let Some(d) = date {
        exp.date = d.to_string();
    }
    exp.updated_at = now;
    exp.version += 1;

    conn.execute(
        "UPDATE expenses SET amount=?1, source_id=?2, category_id=?3, note=?4, date=?5, updated_at=?6, version=?7 WHERE id=?8",
        params![exp.amount, exp.source_id, exp.category_id, exp.note, exp.date, now, exp.version, id],
    )?;

    conn.execute(
        "UPDATE app_settings SET data_version = data_version + 1 WHERE id = 'singleton'",
        [],
    )?;

    Ok(exp)
}

pub fn delete_expense(conn: &Connection, id: &str) -> AppResult<()> {
    let exp = get_expense_by_id(conn, id)?;
    let now = now_ms();

    conn.execute("DELETE FROM expenses WHERE id = ?1", params![id])?;

    // Record deletion for sync
    let deletion_id = uuid::Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO deletion_log (id, entity_type, entity_id, deleted_at, version)
         VALUES (?1, 'expense', ?2, ?3, ?4)",
        params![deletion_id, id, now, exp.version + 1],
    )?;

    Ok(())
}

fn get_expense_by_id(conn: &Connection, id: &str) -> AppResult<Expense> {
    conn.query_row(
        "SELECT id, amount, currency, source_id, category_id, note, date, created_at, updated_at, version
         FROM expenses WHERE id = ?1",
        params![id],
        |row| {
            Ok(Expense {
                id: row.get(0)?,
                amount: row.get(1)?,
                currency: row.get(2)?,
                source_id: row.get(3)?,
                category_id: row.get(4)?,
                note: row.get(5)?,
                date: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
                version: row.get(9)?,
            })
        },
    ).map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => crate::utils::error::AppError::NotFound(format!("Expense {} not found", id)),
        other => other.into(),
    })
}
