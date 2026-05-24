use rusqlite::{params, Connection};
use serde::Serialize;

use crate::utils::error::AppResult;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StatsResponse {
    pub period_total: i64,
    pub daily_average: f64,
    pub days_elapsed: i64,
    pub days_total: i64,
    pub today_total: i64,
    pub per_source: Vec<SourceTotal>,
    pub daily_series: Vec<DailyTotal>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SourceTotal {
    pub source_id: String,
    pub source_name: String,
    pub source_icon: String,
    pub source_color: String,
    pub total: i64,
}

#[derive(Debug, Serialize)]
pub struct DailyTotal {
    pub date: String,
    pub total: i64,
}

pub fn compute_stats(
    conn: &Connection,
    period_id: &str,
) -> AppResult<StatsResponse> {
    // Get period info
    let (start_date, end_date): (String, String) = conn.query_row(
        "SELECT start_date, end_date FROM accounting_periods WHERE id = ?1",
        params![period_id],
        |row| Ok((row.get(0)?, row.get(1)?)),
    )?;

    // Period total
    let period_total: i64 = conn
        .query_row(
            "SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE date >= ?1 AND date <= ?2",
            params![start_date, end_date],
            |row| row.get(0),
        )
        .unwrap_or(0);

    // Today's total
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();
    let today_total: i64 = conn
        .query_row(
            "SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE date = ?1",
            params![today],
            |row| row.get(0),
        )
        .unwrap_or(0);

    // Days elapsed (from start to today or end, whichever earlier)
    let today_date = chrono::NaiveDate::parse_from_str(&today, "%Y-%m-%d").unwrap();
    let start_date_parsed = chrono::NaiveDate::parse_from_str(&start_date, "%Y-%m-%d").unwrap();
    let end_date_parsed = chrono::NaiveDate::parse_from_str(&end_date, "%Y-%m-%d").unwrap();

    let effective_end = if today_date < end_date_parsed {
        today_date
    } else {
        end_date_parsed
    };
    let days_elapsed = (effective_end - start_date_parsed).num_days() + 1;
    let days_total = (end_date_parsed - start_date_parsed).num_days() + 1;
    let daily_average = if days_elapsed > 0 {
        period_total as f64 / days_elapsed as f64
    } else {
        0.0
    };

    // Per source totals
    let mut stmt = conn.prepare(
        "SELECT ps.id, ps.name, ps.icon, ps.color, COALESCE(SUM(e.amount), 0) as total
         FROM payment_sources ps
         LEFT JOIN expenses e ON ps.id = e.source_id AND e.date >= ?1 AND e.date <= ?2
         WHERE ps.is_active = 1
         GROUP BY ps.id
         ORDER BY total DESC",
    )?;
    let per_source: Vec<SourceTotal> = stmt
        .query_map(params![start_date, end_date], |row| {
            Ok(SourceTotal {
                source_id: row.get(0)?,
                source_name: row.get(1)?,
                source_icon: row.get(2)?,
                source_color: row.get(3)?,
                total: row.get(4)?,
            })
        })?
        .filter_map(|r| r.ok())
        .collect();

    // Daily series
    let mut stmt = conn.prepare(
        "SELECT date, COALESCE(SUM(amount), 0)
         FROM expenses
         WHERE date >= ?1 AND date <= ?2
         GROUP BY date
         ORDER BY date ASC",
    )?;
    let daily_series: Vec<DailyTotal> = stmt
        .query_map(params![start_date, end_date], |row| {
            Ok(DailyTotal {
                date: row.get(0)?,
                total: row.get(1)?,
            })
        })?
        .filter_map(|r| r.ok())
        .collect();

    Ok(StatsResponse {
        period_total,
        daily_average,
        days_elapsed,
        days_total,
        today_total,
        per_source,
        daily_series,
    })
}
