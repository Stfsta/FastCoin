use tauri::State;

use crate::{
    db::models::Expense,
    services::expense_service,
    AppState,
};

#[tauri::command]
pub fn get_expenses(
    state: State<AppState>,
    start_date: Option<String>,
    end_date: Option<String>,
    source_id: Option<String>,
    limit: Option<i64>,
) -> Result<Vec<Expense>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    expense_service::get_expenses(&conn, start_date, end_date, source_id, limit)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn add_expense(
    state: State<AppState>,
    amount: i64,
    currency: String,
    source_id: String,
    category_id: Option<String>,
    note: Option<String>,
    date: String,
) -> Result<Expense, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    expense_service::add_expense(
        &conn,
        amount,
        &currency,
        &source_id,
        category_id.as_deref(),
        note.unwrap_or_default().as_str(),
        &date,
    )
    .map_err(|e| e.to_string())
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateExpenseArgs {
    pub id: String,
    pub amount: Option<i64>,
    pub source_id: Option<String>,
    pub category_id: Option<Option<String>>,
    pub note: Option<String>,
    pub date: Option<String>,
}

#[tauri::command]
pub fn update_expense(
    state: State<AppState>,
    args: UpdateExpenseArgs,
) -> Result<Expense, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    expense_service::update_expense(
        &conn,
        &args.id,
        args.amount,
        args.source_id.as_deref(),
        args.category_id.as_ref().map(|c| c.as_deref()),
        args.note.as_deref(),
        args.date.as_deref(),
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_expense(state: State<AppState>, id: String) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    expense_service::delete_expense(&conn, &id).map_err(|e| e.to_string())
}
