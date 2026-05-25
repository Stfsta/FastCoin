use crate::config;

#[tauri::command]
pub fn get_db_path() -> Result<String, String> {
    Ok(config::effective_db_path().to_string_lossy().to_string())
}

#[tauri::command]
pub fn set_db_path(new_path: String) -> Result<String, String> {
    let mut cfg = config::load_config();

    // If reverting to default
    if new_path.is_empty() {
        cfg.db_path = None;
        config::save_config(&cfg)?;
        return Ok(config::default_db_path().to_string_lossy().to_string());
    }

    // Validate the new path
    let path = std::path::PathBuf::from(&new_path);
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("无法创建目录: {}", e))?;
    }

    // If old db exists and new path doesn't, copy the data
    let old_path = config::effective_db_path();
    if old_path.exists() && !path.exists() {
        std::fs::copy(&old_path, &path)
            .map_err(|e| format!("复制数据失败: {}", e))?;
    }

    cfg.db_path = Some(new_path);
    config::save_config(&cfg)?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn reset_db_path() -> Result<String, String> {
    let mut cfg = config::load_config();
    cfg.db_path = None;
    config::save_config(&cfg)?;
    Ok(config::default_db_path().to_string_lossy().to_string())
}
