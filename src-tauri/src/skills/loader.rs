use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SkillInfo {
    pub name: String,
    pub description: String,
    pub path: String,
}

pub fn scan_skills_in_dir(base_dir: &Path) -> Vec<SkillInfo> {
    let mut skills = Vec::new();

    if !base_dir.exists() || !base_dir.is_dir() {
        return skills;
    }

    if let Ok(entries) = fs::read_dir(base_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                let skill_md = path.join("SKILL.md");
                if skill_md.exists() {
                    if let Ok(content) = fs::read_to_string(&skill_md) {
                        let (name, description) = parse_frontmatter(&content, &path);
                        skills.push(SkillInfo {
                            name,
                            description,
                            path: skill_md.to_string_lossy().to_string(),
                        });
                    }
                }
            }
        }
    }

    skills
}

pub fn parse_frontmatter(content: &str, folder_path: &Path) -> (String, String) {
    let folder_name = folder_path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "unknown-skill".to_string());

    let mut name = folder_name.clone();
    let mut description = format!("Habilidad instalada en {}", folder_name);

    if content.starts_with("---") {
        let parts: Vec<&str> = content.split("---").collect();
        if parts.len() >= 3 {
            for line in parts[1].lines() {
                let line = line.trim();
                if line.starts_with("name:") {
                    name = line.replace("name:", "").trim().to_string();
                } else if line.starts_with("description:") {
                    description = line.replace("description:", "").trim().to_string();
                }
            }
        }
    }

    (name, description)
}

pub fn list_all_skills(workspace_path: &str) -> Vec<SkillInfo> {
    let mut all_skills = Vec::new();

    // 1. Workspace local skills
    let ws = Path::new(workspace_path);
    all_skills.extend(scan_skills_in_dir(&ws.join(".agents/skills")));
    all_skills.extend(scan_skills_in_dir(&ws.join(".gemini/skills")));

    // 2. Global home skills
    if let Some(home) = dirs_next::home_dir() {
        all_skills.extend(scan_skills_in_dir(&home.join(".agents/skills")));
        all_skills.extend(scan_skills_in_dir(&home.join(".gemini/skills")));
    }

    // Deduplicar por nombre
    all_skills.dedup_by(|a, b| a.name == b.name);
    all_skills
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_frontmatter() {
        let content = "---\nname: to-spec\ndescription: Generar especificación\n---\n# Instrucciones";
        let folder = Path::new("/tmp/to-spec");
        let (name, desc) = parse_frontmatter(content, folder);

        assert_eq!(name, "to-spec");
        assert_eq!(desc, "Generar especificación");
    }

    #[test]
    fn test_parse_frontmatter_fallback() {
        let content = "# Sin YAML frontmatter";
        let folder = Path::new("/tmp/custom-skill");
        let (name, desc) = parse_frontmatter(content, folder);

        assert_eq!(name, "custom-skill");
        assert!(desc.contains("custom-skill"));
    }
}
