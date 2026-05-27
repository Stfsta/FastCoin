mod commands;
mod config;
mod crypto;
mod db;
mod services;
mod utils;

use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tauri::Manager;

pub struct AppState {
    pub db: Arc<Mutex<rusqlite::Connection>>,
    pub data_dir: PathBuf,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let data_dir = app.path().app_data_dir()
                .expect("Failed to resolve app data dir");
            let db_path = config::resolve_db_path(&data_dir);
            let conn = db::init_db_at(&db_path)
                .expect("Failed to initialize database");
            app.manage(AppState {
                db: Arc::new(Mutex::new(conn)),
                data_dir,
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::config_cmd::get_db_path,
            #[cfg(not(target_os = "android"))]
            commands::config_cmd::set_db_path,
            #[cfg(not(target_os = "android"))]
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
            commands::import_cmd::import_preview_from_content,
            commands::import_cmd::import_confirm_from_content,
            commands::export_cmd::export_data_to_content,
            commands::export_cmd::export_data_to_temp,
            commands::export_cmd::export_data_to_bytes,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
