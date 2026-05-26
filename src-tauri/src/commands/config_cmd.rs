use crate::config;
use std::path::Path;

#[tauri::command]
pub fn get_db_path() -> Result<String, String> {
    Ok(config::effective_db_path().to_string_lossy().to_string())
}

#[tauri::command]
pub fn set_db_path(state: tauri::State<crate::AppState>, new_path: String) -> Result<String, String> {
    // If reverting to default
    if new_path.is_empty() {
        return reset_db_path(state);
    }

    // Normalize new_path: if it's a directory, append fastcoin.db
    let new_db_path = Path::new(&new_path);
    let new_db_path = if new_db_path.extension().is_none() {
        new_db_path.join("fastcoin.db")
    } else {
        new_db_path.to_path_buf()
    };
    let new_data_dir = new_db_path
        .parent()
        .ok_or_else(|| "Invalid path".to_string())?
        .to_path_buf();

    // Create target directory
    std::fs::create_dir_all(&new_data_dir)
        .map_err(|e| format!("无法创建目录: {}", e))?;

    let old_db_path = config::effective_db_path();
    let old_data_dir = config::effective_data_dir();

    // If old and new paths are the same, nothing to do
    if old_db_path == new_db_path {
        return Ok(new_db_path.to_string_lossy().to_string());
    }

    // Checkpoint WAL before migration
    {
        let conn = state.db.lock().map_err(|e| e.to_string())?;
        conn.execute_batch("PRAGMA wal_checkpoint(TRUNCATE);")
            .map_err(|e| format!("WAL checkpoint 失败: {}", e))?;
    }

    // Migrate database files (copy then delete old)
    if old_db_path.exists() && !new_db_path.exists() {
        copy_db_files(&old_db_path, &new_db_path)
            .map_err(|e| format!("迁移数据文件失败: {}", e))?;
    }

    // Update pointer FIRST so effective_data_dir() resolves to new location
    config::save_pointer(&new_data_dir.to_string_lossy())
        .map_err(|e| format!("保存路径指针失败: {}", e))?;

    // Migrate config.json: copy from old data dir to new data dir
    let old_config_path = old_data_dir.join("config.json");
    let new_config_path = new_data_dir.join("config.json");
    if old_config_path.exists() && !new_config_path.exists() {
        std::fs::copy(&old_config_path, &new_config_path)
            .map_err(|e| format!("迁移配置文件失败: {}", e))?;
    }

    // Save updated config at new data directory
    let new_db_path_str = new_db_path.to_string_lossy().to_string();
    let new_cfg = config::AppConfig {
        db_path: Some(new_db_path_str.clone()),
    };
    config::save_config(&new_cfg)
        .map_err(|e| format!("保存配置失败: {}", e))?;

    // Clean up old files at previous location
    if old_data_dir != new_data_dir {
        clean_old_data_files(&old_db_path);
        if old_config_path.exists() {
            std::fs::remove_file(&old_config_path).ok();
        }
    }

    Ok(new_db_path_str)
}

#[tauri::command]
pub fn reset_db_path(state: tauri::State<crate::AppState>) -> Result<String, String> {
    let old_db_path = config::effective_db_path();
    let old_data_dir = config::effective_data_dir();
    let default_dir = config::default_app_data_dir();
    let default_db_path = default_dir.join("fastcoin.db");

    // If already at default path, just reset config
    if old_db_path == default_db_path {
        config::remove_pointer()?;
        let mut cfg = config::load_config();
        cfg.db_path = None;
        config::save_config(&cfg)?;
        return Ok(default_db_path.to_string_lossy().to_string());
    }

    // Checkpoint WAL before migration
    {
        let conn = state.db.lock().map_err(|e| e.to_string())?;
        conn.execute_batch("PRAGMA wal_checkpoint(TRUNCATE);")
            .map_err(|e| format!("WAL checkpoint 失败: {}", e))?;
    }

    // Ensure default directory exists
    std::fs::create_dir_all(&default_dir)
        .map_err(|e| format!("无法创建默认目录: {}", e))?;

    // Migrate database files back to default
    if old_db_path.exists() && !default_db_path.exists() {
        copy_db_files(&old_db_path, &default_db_path)
            .map_err(|e| format!("迁移数据文件失败: {}", e))?;
    }

    // Remove pointer FIRST so effective_data_dir falls back to default
    config::remove_pointer()?;

    // Migrate config.json back to default
    let old_config_path = old_data_dir.join("config.json");
    let default_config_path = default_dir.join("config.json");
    if old_config_path.exists() && !default_config_path.exists() {
        std::fs::copy(&old_config_path, &default_config_path)
            .map_err(|e| format!("迁移配置文件失败: {}", e))?;
    }

    // Save config with db_path = None at the default location
    let cfg = config::AppConfig { db_path: None };
    config::save_config(&cfg)?;

    // Clean up old files at custom location
    if old_data_dir != default_dir {
        clean_old_data_files(&old_db_path);
        if old_config_path.exists() {
            std::fs::remove_file(&old_config_path).ok();
        }
    }

    Ok(default_db_path.to_string_lossy().to_string())
}

/// Copy database files (.db, .db-wal, .db-shm) from old to new path
fn copy_db_files(old_path: &Path, new_path: &Path) -> Result<(), String> {
    std::fs::copy(old_path, new_path)
        .map_err(|e| format!("复制数据库失败: {}", e))?;

    // Also copy WAL and SHM companion files if they exist
    let old_str = old_path.to_string_lossy();
    let new_str = new_path.to_string_lossy();
    for suffix in &["-wal", "-shm"] {
        let old_companion = format!("{}{}", old_str, suffix);
        let new_companion = format!("{}{}", new_str, suffix);
        if Path::new(&old_companion).exists() {
            std::fs::copy(&old_companion, &new_companion)
                .map_err(|e| format!("复制 {} 文件失败: {}", suffix, e))?;
        }
    }

    Ok(())
}

/// Delete old database and companion files
fn clean_old_data_files(db_path: &Path) {
    std::fs::remove_file(db_path).ok();
    let db_str = db_path.to_string_lossy();
    for suffix in &["-wal", "-shm"] {
        let companion = format!("{}{}", db_str, suffix);
        std::fs::remove_file(&companion).ok();
    }
}
