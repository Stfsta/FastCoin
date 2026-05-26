use rusqlite::{params, Connection};
use rust_xlsxwriter::*;

use crate::{
    crypto::encrypt::encrypt_data,
    db::models::{AccountingPeriod, AppSettings, Category, Expense, PaymentSource},
    utils::{
        error::{AppError, AppResult},
        format::cents_to_display,
    },
};

#[derive(serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportPayload {
    pub expenses: Vec<Expense>,
    #[serde(alias = "payment_sources")]
    pub payment_sources: Vec<PaymentSource>,
    pub categories: Vec<Category>,
    #[serde(alias = "accounting_periods")]
    pub accounting_periods: Vec<AccountingPeriod>,
    pub settings: AppSettings,
}

fn gather_full_export(conn: &Connection) -> AppResult<ExportPayload> {
    let mut stmt = conn.prepare(
        "SELECT id, amount, currency, source_id, category_id, note, date, created_at, updated_at, version
         FROM expenses ORDER BY date ASC, created_at ASC",
    )?;
    let expenses: Vec<Expense> = stmt
        .query_map([], |row| {
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
        })?
        .filter_map(|r| r.ok())
        .collect();

    let mut stmt = conn.prepare(
        "SELECT id, name, type, icon, color, sort_order, is_active, created_at, updated_at, version
         FROM payment_sources ORDER BY sort_order ASC",
    )?;
    let payment_sources: Vec<PaymentSource> = stmt
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
        })?
        .filter_map(|r| r.ok())
        .collect();

    let mut stmt = conn.prepare(
        "SELECT id, name, icon, color, parent_id, sort_order, is_active, created_at, updated_at, version
         FROM categories ORDER BY sort_order ASC",
    )?;
    let categories: Vec<Category> = stmt
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
        })?
        .filter_map(|r| r.ok())
        .collect();

    let mut stmt = conn.prepare(
        "SELECT id, name, start_date, end_date, is_active, created_at, updated_at, version
         FROM accounting_periods ORDER BY start_date DESC",
    )?;
    let accounting_periods: Vec<AccountingPeriod> = stmt
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
        })?
        .filter_map(|r| r.ok())
        .collect();

    let settings: AppSettings = conn.query_row(
        "SELECT id, default_currency, default_source_id, active_period_id, theme, locale, key_salt, device_id, data_version, last_exported_version, last_imported_version
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
                last_imported_version: row.get(10)?,
            })
        },
    )?;

    Ok(ExportPayload {
        expenses,
        payment_sources,
        categories,
        accounting_periods,
        settings,
    })
}

fn gather_date_export(conn: &Connection, date: &str) -> AppResult<ExportPayload> {
    let mut payload = gather_full_export(conn)?;
    payload.expenses.retain(|e| e.date == date);
    Ok(payload)
}

fn gather_period_export(conn: &Connection) -> AppResult<ExportPayload> {
    let mut payload = gather_full_export(conn)?;
    let period: AccountingPeriod = conn.query_row(
        "SELECT id, name, start_date, end_date, is_active, created_at, updated_at, version
         FROM accounting_periods WHERE is_active=1",
        [],
        |row| {
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
        },
    ).map_err(|_| AppError::Validation("没有活跃的记账周期".to_string()))?;
    payload.expenses.retain(|e| e.date >= period.start_date && e.date <= period.end_date);
    Ok(payload)
}

pub fn export_to_fastcoin(
    conn: &Connection,
    password: &str,
    mode: &str,
    file_path: &str,
    date: Option<&str>,
) -> AppResult<()> {
    let settings: AppSettings = conn.query_row(
        "SELECT id, default_currency, default_source_id, active_period_id, theme, locale, key_salt, device_id, data_version, last_exported_version, last_imported_version
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
                last_imported_version: row.get(10)?,
            })
        },
    )?;

    let payload = match mode {
        "date" => {
            let d = date.ok_or_else(|| AppError::Validation("当日导出需要指定日期".to_string()))?;
            gather_date_export(conn, d)?
        }
        "period" => gather_period_export(conn)?,
        _ => gather_full_export(conn)?,
    };

    let record_count = payload.expenses.len() as u32;
    let max_version = payload
        .expenses
        .iter()
        .map(|e| e.version)
        .max()
        .unwrap_or(settings.data_version);

    let plaintext = serde_json::to_string(&payload)?;
    let encrypted = encrypt_data(
        &plaintext,
        password,
        mode,
        &settings.device_id,
        record_count,
        max_version,
    )?;
    let output = serde_json::to_string_pretty(&encrypted)?;
    std::fs::write(file_path, output)?;

    // Only update last_exported_version for full export
    if mode == "full" {
        conn.execute(
            "UPDATE app_settings SET last_exported_version=?1 WHERE id='singleton'",
            params![settings.data_version],
        )?;
    }

    Ok(())
}

pub fn export_to_xlsx(conn: &Connection, file_path: &str) -> AppResult<()> {
    let payload = gather_full_export(conn)?;

    let mut workbook = Workbook::new();

    // Sheet 1: Expenses
    let sheet1 = workbook.add_worksheet().set_name("消费记录")?;
    let headers = ["日期", "金额", "支付来源", "分类", "备注"];
    for (col, h) in headers.iter().enumerate() {
        sheet1.write_string(0, col as u16, *h).map_err(|e| AppError::from(e))?;
    }
    for (row_idx, exp) in payload.expenses.iter().enumerate() {
        let r = (row_idx + 1) as u32;
        sheet1.write_string(r, 0, &exp.date)?;
        sheet1.write_string(r, 1, &cents_to_display(exp.amount))?;
        let src = payload
            .payment_sources
            .iter()
            .find(|s| s.id == exp.source_id)
            .map(|s| s.name.as_str())
            .unwrap_or("-");
        sheet1.write_string(r, 2, src)?;
        let cat = match &exp.category_id {
            Some(cid) => payload
                .categories
                .iter()
                .find(|c| c.id == *cid)
                .map(|c| c.name.as_str())
                .unwrap_or("-"),
            None => "-",
        };
        sheet1.write_string(r, 3, cat)?;
        sheet1.write_string(r, 4, &exp.note)?;
    }

    // Sheet 2: Summary by source
    let sheet2 = workbook.add_worksheet().set_name("来源汇总")?;
    sheet2.write_string(0, 0, "支付来源")?;
    sheet2.write_string(0, 1, "总金额")?;
    let mut row = 1u32;
    for src in &payload.payment_sources {
        let total: i64 = payload
            .expenses
            .iter()
            .filter(|e| e.source_id == src.id)
            .map(|e| e.amount)
            .sum();
        sheet2.write_string(row, 0, &src.name)?;
        sheet2.write_string(row, 1, &cents_to_display(total))?;
        row += 1;
    }

    // Sheet 3: Daily breakdown
    let sheet3 = workbook.add_worksheet().set_name("每日明细")?;
    sheet3.write_string(0, 0, "日期")?;
    sheet3.write_string(0, 1, "金额")?;
    let mut daily_map: std::collections::BTreeMap<String, i64> = std::collections::BTreeMap::new();
    for exp in &payload.expenses {
        *daily_map.entry(exp.date.clone()).or_default() += exp.amount;
    }
    let mut row = 1u32;
    for (date, total) in &daily_map {
        sheet3.write_string(row, 0, date)?;
        sheet3.write_string(row, 1, &cents_to_display(*total))?;
        row += 1;
    }

    workbook.save(file_path)?;
    Ok(())
}

pub fn export_to_csv(conn: &Connection, file_path: &str) -> AppResult<()> {
    let payload = gather_full_export(conn)?;

    let mut csv = String::from("\u{FEFF}日期,金额,支付来源,分类,备注\n"); // UTF-8 BOM

    for exp in &payload.expenses {
        let src = payload
            .payment_sources
            .iter()
            .find(|s| s.id == exp.source_id)
            .map(|s| s.name.as_str())
            .unwrap_or("-");
        let cat = match &exp.category_id {
            Some(cid) => payload
                .categories
                .iter()
                .find(|c| c.id == *cid)
                .map(|c| c.name.as_str())
                .unwrap_or("-"),
            None => "-",
        };
        let note = exp.note.replace(',', "，"); // Escape commas
        csv.push_str(&format!(
            "{},{},{},{},{}\n",
            exp.date,
            cents_to_display(exp.amount),
            src,
            cat,
            note
        ));
    }

    std::fs::write(file_path, csv)?;
    Ok(())
}

/// Export encrypted fastcoin data as a string (content-based, for mobile SAF).
pub fn export_fastcoin_to_content(
    conn: &Connection,
    password: &str,
    mode: &str,
    date: Option<&str>,
) -> AppResult<String> {
    let settings: AppSettings = conn.query_row(
        "SELECT id, default_currency, default_source_id, active_period_id, theme, locale, key_salt, device_id, data_version, last_exported_version, last_imported_version
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
                last_imported_version: row.get(10)?,
            })
        },
    )?;

    let payload = match mode {
        "date" => {
            let d = date.ok_or_else(|| AppError::Validation("当日导出需要指定日期".to_string()))?;
            gather_date_export(conn, d)?
        }
        "period" => gather_period_export(conn)?,
        _ => gather_full_export(conn)?,
    };

    let record_count = payload.expenses.len() as u32;
    let max_version = payload
        .expenses
        .iter()
        .map(|e| e.version)
        .max()
        .unwrap_or(settings.data_version);

    let plaintext = serde_json::to_string(&payload)?;
    let encrypted = encrypt_data(
        &plaintext,
        password,
        mode,
        &settings.device_id,
        record_count,
        max_version,
    )?;
    let output = serde_json::to_string_pretty(&encrypted)?;

    // Only update last_exported_version for full export
    if mode == "full" {
        conn.execute(
            "UPDATE app_settings SET last_exported_version=?1 WHERE id='singleton'",
            params![settings.data_version],
        )?;
    }

    Ok(output)
}

/// Export CSV data as a string (content-based, for mobile SAF).
pub fn export_csv_to_content(conn: &Connection) -> AppResult<String> {
    let payload = gather_full_export(conn)?;

    let mut csv = String::from("\u{FEFF}日期,金额,支付来源,分类,备注\n");

    for exp in &payload.expenses {
        let src = payload
            .payment_sources
            .iter()
            .find(|s| s.id == exp.source_id)
            .map(|s| s.name.as_str())
            .unwrap_or("-");
        let cat = match &exp.category_id {
            Some(cid) => payload
                .categories
                .iter()
                .find(|c| c.id == *cid)
                .map(|c| c.name.as_str())
                .unwrap_or("-"),
            None => "-",
        };
        let note = exp.note.replace(',', "，");
        csv.push_str(&format!(
            "{},{},{},{},{}\n",
            exp.date,
            cents_to_display(exp.amount),
            src,
            cat,
            note
        ));
    }

    Ok(csv)
}

/// Export XLSX data as bytes (content-based, for mobile SAF).
pub fn export_xlsx_to_bytes(conn: &Connection) -> AppResult<Vec<u8>> {
    let payload = gather_full_export(conn)?;

    let mut workbook = Workbook::new();

    // Sheet 1: Expenses
    let sheet1 = workbook.add_worksheet().set_name("消费记录")?;
    let headers = ["日期", "金额", "支付来源", "分类", "备注"];
    for (col, h) in headers.iter().enumerate() {
        sheet1.write_string(0, col as u16, *h).map_err(|e| AppError::from(e))?;
    }
    for (row_idx, exp) in payload.expenses.iter().enumerate() {
        let r = (row_idx + 1) as u32;
        sheet1.write_string(r, 0, &exp.date)?;
        sheet1.write_string(r, 1, &cents_to_display(exp.amount))?;
        let src = payload
            .payment_sources
            .iter()
            .find(|s| s.id == exp.source_id)
            .map(|s| s.name.as_str())
            .unwrap_or("-");
        sheet1.write_string(r, 2, src)?;
        let cat = match &exp.category_id {
            Some(cid) => payload
                .categories
                .iter()
                .find(|c| c.id == *cid)
                .map(|c| c.name.as_str())
                .unwrap_or("-"),
            None => "-",
        };
        sheet1.write_string(r, 3, cat)?;
        sheet1.write_string(r, 4, &exp.note)?;
    }

    // Sheet 2: Summary by source
    let sheet2 = workbook.add_worksheet().set_name("来源汇总")?;
    sheet2.write_string(0, 0, "支付来源")?;
    sheet2.write_string(0, 1, "总金额")?;
    let mut row = 1u32;
    for src in &payload.payment_sources {
        let total: i64 = payload
            .expenses
            .iter()
            .filter(|e| e.source_id == src.id)
            .map(|e| e.amount)
            .sum();
        sheet2.write_string(row, 0, &src.name)?;
        sheet2.write_string(row, 1, &cents_to_display(total))?;
        row += 1;
    }

    // Sheet 3: Daily breakdown
    let sheet3 = workbook.add_worksheet().set_name("每日明细")?;
    sheet3.write_string(0, 0, "日期")?;
    sheet3.write_string(0, 1, "金额")?;
    let mut daily_map: std::collections::BTreeMap<String, i64> = std::collections::BTreeMap::new();
    for exp in &payload.expenses {
        *daily_map.entry(exp.date.clone()).or_default() += exp.amount;
    }
    let mut row = 1u32;
    for (date, total) in &daily_map {
        sheet3.write_string(row, 0, date)?;
        sheet3.write_string(row, 1, &cents_to_display(*total))?;
        row += 1;
    }

    let buf = workbook.save_to_buffer()?;
    Ok(buf)
}
