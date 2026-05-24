use chrono::Datelike;
use rusqlite::Connection;

use crate::utils::format::now_ms;

pub fn seed_defaults(conn: &Connection) -> Result<(), rusqlite::Error> {
    let now = now_ms();
    let device_id = uuid::Uuid::new_v4().to_string();

    // Default payment sources
    conn.execute(
        "INSERT INTO payment_sources (id, name, type, icon, color, sort_order, is_active, created_at, updated_at, version)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, ?7, ?7, 1)",
        rusqlite::params![
            uuid::Uuid::new_v4().to_string(), "微信钱包", "wechat", "💬", "#07C160", 0, now,
        ],
    )?;
    conn.execute(
        "INSERT INTO payment_sources (id, name, type, icon, color, sort_order, is_active, created_at, updated_at, version)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, ?7, ?7, 1)",
        rusqlite::params![
            uuid::Uuid::new_v4().to_string(), "支付宝", "alipay", "🔵", "#1677FF", 1, now,
        ],
    )?;
    conn.execute(
        "INSERT INTO payment_sources (id, name, type, icon, color, sort_order, is_active, created_at, updated_at, version)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, ?7, ?7, 1)",
        rusqlite::params![
            uuid::Uuid::new_v4().to_string(), "现金", "cash", "💵", "#6B7280", 2, now,
        ],
    )?;

    // Default categories
    let cats = [
        ("餐饮", "🍔", "#EF4444"),
        ("交通", "🚗", "#F59E0B"),
        ("购物", "🛒", "#8B5CF6"),
        ("娱乐", "🎮", "#EC4899"),
        ("住房", "🏠", "#10B981"),
        ("医疗", "🏥", "#EF4444"),
        ("教育", "📚", "#3B82F6"),
        ("其他", "📌", "#9CA3AF"),
    ];
    for (i, (name, icon, color)) in cats.iter().enumerate() {
        conn.execute(
            "INSERT INTO categories (id, name, icon, color, parent_id, sort_order, is_active, created_at, updated_at, version)
             VALUES (?1, ?2, ?3, ?4, NULL, ?5, 1, ?6, ?6, 1)",
            rusqlite::params![
                uuid::Uuid::new_v4().to_string(), name, icon, color, i as i32, now,
            ],
        )?;
    }

    // Default accounting period (current month)
    let today = chrono::Local::now().date_naive();
    let start = chrono::NaiveDate::from_ymd_opt(today.year(), today.month(), 1).unwrap();
    let end = if today.month() == 12 {
        chrono::NaiveDate::from_ymd_opt(today.year() + 1, 1, 1)
            .unwrap()
            .pred_opt()
            .unwrap()
    } else {
        chrono::NaiveDate::from_ymd_opt(today.year(), today.month() + 1, 1)
            .unwrap()
            .pred_opt()
            .unwrap()
    };
    let period_id = uuid::Uuid::new_v4().to_string();
    let period_name = format!("{}年{:02}月", today.year(), today.month());
    conn.execute(
        "INSERT INTO accounting_periods (id, name, start_date, end_date, is_active, created_at, updated_at, version)
         VALUES (?1, ?2, ?3, ?4, 1, ?5, ?5, 1)",
        rusqlite::params![
            period_id,
            period_name,
            start.to_string(),
            end.to_string(),
            now,
        ],
    )?;

    // Default settings
    conn.execute(
        "INSERT INTO app_settings (id, default_currency, default_source_id, active_period_id, theme, locale, key_salt, device_id, data_version, last_exported_version)
         VALUES ('singleton', 'CNY', NULL, ?1, 'system', 'zh-CN', NULL, ?2, 0, 0)",
        rusqlite::params![period_id, device_id],
    )?;

    Ok(())
}
