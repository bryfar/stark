pub mod bundled;
pub mod creator;
pub mod loader;

pub use creator::{
    create_agent, create_plugin, create_skill, list_agents, list_plugins, AgentInfo, AssetScope,
    PluginInfo,
};
pub use loader::{list_all_skills, SkillInfo};
use std::fs;
use std::path::Path;

pub fn get_skills(workspace_path: &str) -> Vec<SkillInfo> {
    list_all_skills(workspace_path)
}

pub fn read_skill_content(file_path: &str) -> Result<String, String> {
    let path = Path::new(file_path);
    if !path.exists() {
        return Err("El archivo de habilidad especificado no existe".to_string());
    }
    fs::read_to_string(path).map_err(|e| format!("Error leyendo skill: {}", e))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_skills_returns_list() {
        let skills = get_skills("/home/bryan/Downloads/Repos/stark");
        assert!(!skills.is_empty());
        assert!(skills.iter().any(|s| s.name == "to-spec" || s.name == "to-tickets"));
    }
}
