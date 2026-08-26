use std::process::Command;

/// Verifica si la ruta dada es un repositorio Git activo.
pub fn is_git_repo(repo_path: &str) -> bool {
    Command::new("git")
        .arg("rev-parse")
        .arg("--is-inside-work-tree")
        .current_dir(repo_path)
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

/// Crea un commit automático (checkpoint) de Git para los cambios pendientes.
pub fn git_create_checkpoint(repo_path: &str, message: &str) -> Result<String, String> {
    if !is_git_repo(repo_path) {
        return Ok("No es un repositorio git, se omite el checkpoint.".to_string());
    }

    // 1. Añadir cambios
    let add_status = Command::new("git")
        .arg("add")
        .arg(".")
        .current_dir(repo_path)
        .status()
        .map_err(|e| format!("Error en git add: {}", e))?;
    
    if !add_status.success() {
        return Err("git add falló".to_string());
    }

    // 2. Verificar si hay cambios en el stage
    let diff_status = Command::new("git")
        .arg("diff")
        .arg("--cached")
        .arg("--quiet")
        .current_dir(repo_path)
        .status()
        .map_err(|e| format!("Error verificando diferencias en git: {}", e))?;

    if diff_status.success() {
        return Ok("No hay cambios pendientes para guardar.".to_string());
    }

    // 3. Crear commit
    let commit_output = Command::new("git")
        .arg("commit")
        .arg("-m")
        .arg(message)
        .current_dir(repo_path)
        .output()
        .map_err(|e| format!("Error en git commit: {}", e))?;

    if commit_output.status.success() {
        Ok(format!("Checkpoint creado: {}", message))
    } else {
        Err(format!(
            "git commit falló: {}",
            String::from_utf8_lossy(&commit_output.stderr)
        ))
    }
}

/// Revierte el último commit realizado (undo) mediante un hard reset al commit anterior.
pub fn git_undo_last(repo_path: &str) -> Result<String, String> {
    if !is_git_repo(repo_path) {
        return Err("No es un repositorio git activo.".to_string());
    }

    let reset_output = Command::new("git")
        .arg("reset")
        .arg("--hard")
        .arg("HEAD~1")
        .current_dir(repo_path)
        .output()
        .map_err(|e| format!("Error en git reset: {}", e))?;

    if reset_output.status.success() {
        Ok("El último cambio fue deshecho con éxito.".to_string())
    } else {
        Err(format!(
            "git reset falló: {}",
            String::from_utf8_lossy(&reset_output.stderr)
        ))
    }
}
