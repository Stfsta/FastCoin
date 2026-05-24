/// Format cents to display string, e.g. 1250 -> "12.50"
pub fn cents_to_display(cents: i64) -> String {
    let yuan = (cents as f64) / 100.0;
    format!("{:.2}", yuan)
}

/// Get current timestamp in milliseconds
pub fn now_ms() -> i64 {
    chrono::Utc::now().timestamp_millis()
}
