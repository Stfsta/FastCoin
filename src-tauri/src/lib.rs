mod commands;
mod config;
mod crypto;
mod db;
mod services;
mod utils;

use db::init_db;
use std::sync::Mutex;

pub struct AppState {
    pub db: Mutex<rusqlite::Connection>,
}

pub fn run() {
    let conn = init_db().expect("Failed to initialize database");

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(AppState {
            db: Mutex::new(conn),
        })
        .invoke_handler(tauri::generate_handler![
            commands::config_cmd::get_db_path,
            commands::config_cmd::set_db_path,
            commands::config_cmd::reset_db_path,
            commands::expense_cmd::get_expenses,
            commands::expense_cmd::add_expense,
            commands::expense_cmd::update_expense,
            commands::expense_cmd::delete_expense,
            commands::source_cmd::get_payment_sources,
            commands::source_cmd::add_payment_source,
            commands::source_cmd::update_payment_source,
            commands::source_cmd::delete_payment_source,
            commands::source_cmd::reorder_payment_sources,
            commands::category_cmd::get_categories,
            commands::category_cmd::add_category,
            commands::category_cmd::update_category,
            commands::category_cmd::delete_category,
            commands::period_cmd::get_periods,
            commands::period_cmd::add_period,
            commands::period_cmd::update_period,
            commands::period_cmd::delete_period,
            commands::period_cmd::set_active_period,
            commands::settings_cmd::get_settings,
            commands::settings_cmd::update_settings,
            commands::stats_cmd::get_stats,
            commands::export_cmd::export_data,
            commands::import_cmd::import_preview,
            commands::import_cmd::import_confirm,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
