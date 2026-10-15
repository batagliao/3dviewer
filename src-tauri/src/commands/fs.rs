use serde::Serialize;
use std::fs;
use std::path::Path;

const SUPPORTED: [&str; 3] = ["stl", "obj", "3mf"];

#[derive(Debug, Clone, Serialize)]
pub struct FileNode {
    pub name: String,
    pub path: String,
    #[serde(rename = "isDir")]
    pub is_dir: bool,
}

fn is_supported(name: &str) -> bool {
    Path::new(name)
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| SUPPORTED.contains(&e.to_lowercase().as_str()))
        .unwrap_or(false)
}

#[tauri::command]
pub fn list_directory(path: String) -> Result<Vec<FileNode>, String> {
    let entries = fs::read_dir(&path).map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for e in entries.flatten() {
        let p = e.path();
        let name = e.file_name().to_string_lossy().to_string();
        if name.starts_with('.') {
            continue;
        }
        let is_dir = p.is_dir();
        if !is_dir && !is_supported(&name) {
            continue;
        }
        out.push(FileNode {
            name,
            path: p.to_string_lossy().to_string(),
            is_dir,
        });
    }
    out.sort_by(|a, b| match (a.is_dir, b.is_dir) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });
    Ok(out)
}

#[tauri::command]
pub fn read_model_bytes(path: String) -> Result<Vec<u8>, String> {
    const MAX: u64 = 500 * 1024 * 1024;
    let meta = fs::metadata(&path).map_err(|e| e.to_string())?;
    if meta.len() > MAX {
        return Err("File too large (>500MB)".into());
    }
    fs::read(&path).map_err(|e| e.to_string())
}

#[derive(Debug, Clone, Serialize)]
pub struct FileInfo {
    pub size: u64,
    pub extension: String,
}

#[tauri::command]
pub fn get_file_info(path: String) -> Result<FileInfo, String> {
    let meta = fs::metadata(&path).map_err(|e| e.to_string())?;
    let ext = Path::new(&path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    Ok(FileInfo { size: meta.len(), extension: ext })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn supported_filter() {
        assert!(is_supported("a.stl"));
        assert!(is_supported("b.OBJ"));
        assert!(!is_supported("c.txt"));
    }
}
