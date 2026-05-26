use serde::{Deserialize, Serialize};
use std::path::PathBuf;

pub fn default_app_data_dir() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        let local = std::env::var("LOCALAPPDATA").unwrap_or_else(|_| ".".to_string());
        PathBuf::from(local).join("FastCoin")
    }
    #[cfg(target_os = "macos")]
    {
        let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
        home.join("Library").join("Application Support").join("FastCoin")
    }
    #[cfg(target_os = "linux")]
    {
        let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
        home.join(".local").join("share").join("FastCoin")
    }
}

fn pointer_path() -> PathBuf {
    default_app_data_dir().join("path.cfg")
}

pub fn load_pointer() -> Option<String> {
    let path = pointer_path();
    if path.exists() {
        let content = std::fs::read_to_string(&path).ok()?;
        let dir = content.trim().to_string();
        if !dir.is_empty() && std::path::Path::new(&dir).exists() {
            Some(dir)
        } else {
            // Pointer points to non-existent directory, clean up
            std::fs::remove_file(&path).ok();
            None
        }
    } else {
        None
    }
}

pub fn save_pointer(data_dir: &str) -> Result<(), String> {
    let dir = default_app_data_dir();
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    std::fs::write(pointer_path(), data_dir).map_err(|e| e.to_string())
}

pub fn remove_pointer() -> Result<(), String> {
    let path = pointer_path();
    if path.exists() {
        std::fs::remove_file(&path).map_err(|e| e.to_string())
    } else {
        Ok(())
    }
}

/// Returns the directory where the database and config.json are stored.
/// Priority: path.cfg pointer > default app data dir
pub fn effective_data_dir() -> PathBuf {
    if let Some(custom_dir) = load_pointer() {
        PathBuf::from(custom_dir)
    } else {
        default_app_data_dir()
    }
}

fn config_file_path() -> PathBuf {
    effective_data_dir().join("config.json")
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    #[serde(rename = "dbPath")]
    pub db_path: Option<String>,
}

impl Default for AppConfig {
    fn default() -> Self {
        AppConfig { db_path: None }
    }
}

pub fn load_config() -> AppConfig {
    let path = config_file_path();
    if path.exists() {
        std::fs::read_to_string(&path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default()
    } else {
        AppConfig::default()
    }
}

pub fn save_config(config: &AppConfig) -> Result<(), String> {
    let dir = effective_data_dir();
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let json = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
    std::fs::write(config_file_path(), json).map_err(|e| e.to_string())
}

pub fn effective_db_path() -> PathBuf {
    let config = load_config();
    match config.db_path {
        Some(ref custom) if !custom.is_empty() => PathBuf::from(custom),
        _ => effective_data_dir().join("fastcoin.db"),
    }
}
