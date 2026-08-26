use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

/// Ámbito de instalación del asset creado por el usuario.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum AssetScope {
    /// Dentro del workspace activo: `<workspace>/.agents/...`
    Workspace,
    /// Global del usuario: `~/.agents/...`
    Global,
}

impl AssetScope {
    pub fn base_dir(&self, workspace_path: &str) -> PathBuf {
        match self {
            AssetScope::Workspace => Path::new(workspace_path).join(".agents"),
            AssetScope::Global => dirs_next::home_dir()
                .unwrap_or_else(|| PathBuf::from("."))
                .join(".agents"),
        }
    }
}

fn slugify(name: &str) -> String {
    let lowered = name.to_lowercase();
    let dashed: String = lowered
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() { c } else { '-' })
        .collect();
    let collapsed = dashed
        .split('-')
        .filter(|s| !s.is_empty())
        .collect::<Vec<_>>()
        .join("-");
    if collapsed.is_empty() {
        "sin-nombre".to_string()
    } else {
        collapsed
    }
}

fn frontmatter(name: &str, description: &str) -> String {
    format!("---\nname: {}\ndescription: {}\n---\n\n", name, description)
}

/// Crea un skill estilo Claude/Eve: `<base>/skills/<slug>/SKILL.md`.
/// El cuerpo es el prompt inyectable; el agente lo carga bajo demanda
/// vía `load_skill` (progressive disclosure, patrón Eve Vercel).
pub fn create_skill(
    name: &str,
    description: &str,
    content: &str,
    scope: &AssetScope,
    workspace_path: &str,
) -> Result<String, String> {
    let name = name.trim();
    if name.is_empty() {
        return Err("El nombre del skill no puede estar vacío".to_string());
    }
    let dir = scope.base_dir(workspace_path).join("skills").join(slugify(name));
    if dir.exists() {
        return Err(format!("Ya existe un skill con el nombre '{}'", name));
    }
    fs::create_dir_all(&dir).map_err(|e| format!("Error creando directorio del skill: {}", e))?;
    let file = dir.join("SKILL.md");
    let body = frontmatter(name, description.trim())
        + "\n# "
        + name
        + "\n\n"
        + content.trim()
        + "\n";
    fs::write(&file, body).map_err(|e| format!("Error escribiendo SKILL.md: {}", e))?;
    Ok(file.to_string_lossy().to_string())
}

const EVE_VERCEL_PROTOCOL: &str = "\
## Protocolo de habilidades (progressive disclosure — Eve Vercel)

1. Al iniciar el turno, lista las skills disponibles con `skills_list`
   (solo nombre y descripción; NO leas su contenido completo todavía).
2. Elige la skill más relevante para la tarea y carga sus instrucciones
   completas bajo demanda con la herramienta `load_skill`.
3. Sigue las instrucciones cargadas paso a paso antes de responder.
4. Nunca infieras el contenido de una skill sin cargarla primero.

## Instrucciones del rol

";

/// Crea un agente especializado: `<base>/agents/<slug>.md`.
/// El archivo generado incluye el protocolo Eve Vercel de carga
/// progresiva de skills, seguido de las instrucciones del rol.
pub fn create_agent(
    name: &str,
    description: &str,
    instructions: &str,
    scope: &AssetScope,
    workspace_path: &str,
) -> Result<String, String> {
    let name = name.trim();
    if name.is_empty() {
        return Err("El nombre del agente no puede estar vacío".to_string());
    }
    let dir = scope.base_dir(workspace_path).join("agents");
    fs::create_dir_all(&dir).map_err(|e| format!("Error creando directorio de agentes: {}", e))?;
    let file = dir.join(format!("{}.md", slugify(name)));
    if file.exists() {
        return Err(format!("Ya existe un agente con el nombre '{}'", name));
    }
    let body = frontmatter(name, description.trim())
        + "\nEres el agente @"
        + &slugify(name)
        + ".\n\n"
        + EVE_VERCEL_PROTOCOL
        + instructions.trim()
        + "\n";
    fs::write(&file, body).map_err(|e| format!("Error escribiendo agente: {}", e))?;
    Ok(file.to_string_lossy().to_string())
}

/// Crea un plugin (inyector de prompt reutilizable): `<base>/plugins/<slug>.json`.
pub fn create_plugin(
    name: &str,
    description: &str,
    prompt_template: &str,
    icon: &str,
    scope: &AssetScope,
    workspace_path: &str,
) -> Result<String, String> {
    let name = name.trim();
    if name.is_empty() {
        return Err("El nombre del plugin no puede estar vacío".to_string());
    }
    let dir = scope.base_dir(workspace_path).join("plugins");
    fs::create_dir_all(&dir).map_err(|e| format!("Error creando directorio de plugins: {}", e))?;
    let file = dir.join(format!("{}.json", slugify(name)));
    if file.exists() {
        return Err(format!("Ya existe un plugin con el nombre '{}'", name));
    }
    let payload = serde_json::json!({
        "name": name,
        "description": description.trim(),
        "prompt_template": prompt_template,
        "icon": if icon.trim().is_empty() { "Sparkles" } else { icon.trim() },
    });
    let json = serde_json::to_string_pretty(&payload).map_err(|e| e.to_string())?;
    fs::write(&file, json).map_err(|e| format!("Error escribiendo plugin: {}", e))?;
    Ok(file.to_string_lossy().to_string())
}

#[derive(Debug, Clone, Serialize)]
pub struct AgentInfo {
    pub id: String,
    pub name: String,
    pub tag: String,
    pub description: String,
    pub path: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct PluginInfo {
    pub name: String,
    pub description: String,
    pub prompt_template: String,
    pub icon: String,
    pub path: String,
}

/// Lista plugins (inyectores de prompt) definidos por el usuario
/// en workspace + global. Los `.json` los escribe `create_plugin`.
pub fn list_plugins(workspace_path: &str) -> Vec<PluginInfo> {
    let mut plugins = Vec::new();
    let mut bases = Vec::new();
    if !workspace_path.trim().is_empty() {
        bases.push(Path::new(workspace_path).join(".agents").join("plugins"));
    }
    if let Some(home) = dirs_next::home_dir() {
        bases.push(home.join(".agents").join("plugins"));
    }

    for base in bases {
        let entries = match fs::read_dir(&base) {
            Ok(e) => e,
            Err(_) => continue,
        };
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().map(|e| e == "json").unwrap_or(false) {
                if let Ok(content) = fs::read_to_string(&path) {
                    if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&content) {
                        let name = parsed["name"]
                            .as_str()
                            .map(|s| s.to_string())
                            .unwrap_or_else(|| {
                                path.file_stem()
                                    .map(|s| s.to_string_lossy().to_string())
                                    .unwrap_or_default()
                            });
                        plugins.push(PluginInfo {
                            description: parsed["description"]
                                .as_str()
                                .unwrap_or_default()
                                .to_string(),
                            prompt_template: parsed["prompt_template"]
                                .as_str()
                                .unwrap_or_default()
                                .to_string(),
                            icon: parsed["icon"].as_str().unwrap_or("Sparkles").to_string(),
                            name,
                            path: path.to_string_lossy().to_string(),
                        });
                    }
                }
            }
        }
    }

    plugins.dedup_by(|a, b| a.path == b.path);
    plugins
}

/// Lista agentes definidos por el usuario en workspace + global.
/// Los tags usan el formato `@<nombre>` para invocación en el chat.
pub fn list_agents(workspace_path: &str) -> Vec<AgentInfo> {
    let mut agents = Vec::new();
    let mut bases = Vec::new();
    if !workspace_path.trim().is_empty() {
        bases.push(Path::new(workspace_path).join(".agents").join("agents"));
    }
    if let Some(home) = dirs_next::home_dir() {
        bases.push(home.join(".agents").join("agents"));
    }

    for base in bases {
        let entries = match fs::read_dir(&base) {
            Ok(e) => e,
            Err(_) => continue,
        };
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().map(|e| e == "md").unwrap_or(false) {
                if let Ok(content) = fs::read_to_string(&path) {
                    let (name, description) =
                        crate::skills::loader::parse_frontmatter(&content, &path);
                    let id = path
                        .file_stem()
                        .map(|s| s.to_string_lossy().to_string())
                        .unwrap_or_else(|| name.clone());
                    agents.push(AgentInfo {
                        tag: format!("@{}", id),
                        id: id.clone(),
                        name,
                        description,
                        path: path.to_string_lossy().to_string(),
                    });
                }
            }
        }
    }

    agents.dedup_by(|a, b| a.id == b.id);
    agents
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_base(tag: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!(
            "stark-creator-test-{}-{}",
            tag,
            std::process::id()
        ));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn test_slugify() {
        assert_eq!(slugify("Mi Skill Genial"), "mi-skill-genial");
        assert_eq!(slugify("  code/review!  "), "code-review");
        assert_eq!(slugify(""), "sin-nombre");
    }

    #[test]
    fn test_create_skill_writes_frontmatter() {
        let ws = temp_base("skill");
        let scope = AssetScope::Workspace;
        let path = create_skill(
            "Test Skill",
            "Descripción de prueba",
            "Haz cosas útiles.",
            &scope,
            ws.to_str().unwrap(),
        )
        .unwrap();

        let content = fs::read_to_string(&path).unwrap();
        assert!(content.starts_with("---"));
        assert!(content.contains("name: Test Skill"));
        assert!(content.contains("description: Descripción de prueba"));
        assert!(path.ends_with(".agents/skills/test-skill/SKILL.md"));

        // Duplicado rechazado
        assert!(create_skill("Test Skill", "", "", &scope, ws.to_str().unwrap()).is_err());
        let _ = fs::remove_dir_all(&ws);
    }

    #[test]
    fn test_create_agent_includes_eve_protocol() {
        let ws = temp_base("agent");
        let scope = AssetScope::Workspace;
        let path = create_agent(
            "Security Auditor",
            "Audita vulnerabilidades",
            "Revisa dependencias y secretos.",
            &scope,
            ws.to_str().unwrap(),
        )
        .unwrap();

        let content = fs::read_to_string(&path).unwrap();
        assert!(content.contains("name: Security Auditor"));
        assert!(content.contains("@security-auditor"));
        assert!(content.contains("load_skill"));
        assert!(content.contains("progressive disclosure"));
        assert!(content.contains("Revisa dependencias"));

        assert!(create_agent("Security Auditor", "", "", &scope, ws.to_str().unwrap()).is_err());
        let _ = fs::remove_dir_all(&ws);
    }

    #[test]
    fn test_create_plugin_json() {
        let ws = temp_base("plugin");
        let scope = AssetScope::Workspace;
        let path = create_plugin(
            "Landing Builder",
            "Genera landings",
            "Diseña una landing para {{tema}}",
            "Image",
            &scope,
            ws.to_str().unwrap(),
        )
        .unwrap();

        let raw = fs::read_to_string(&path).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&raw).unwrap();
        assert_eq!(parsed["name"], "Landing Builder");
        assert_eq!(parsed["icon"], "Image");
        assert!(parsed["prompt_template"].as_str().unwrap().contains("{{tema}}"));

        assert!(
            create_plugin("Landing Builder", "", "", "", &scope, ws.to_str().unwrap()).is_err()
        );
        let _ = fs::remove_dir_all(&ws);
    }

    #[test]
    fn test_list_agents_roundtrip() {
        let ws = temp_base("list");
        create_agent(
            "Planner Pro",
            "Planifica",
            "Divide en pasos",
            &AssetScope::Workspace,
            ws.to_str().unwrap(),
        )
        .unwrap();

        let agents = list_agents(ws.to_str().unwrap());
        assert_eq!(agents.len(), 1);
        assert_eq!(agents[0].id, "planner-pro");
        assert_eq!(agents[0].tag, "@planner-pro");

        let _ = fs::remove_dir_all(&ws);
    }

    #[test]
    fn test_list_plugins_roundtrip() {
        let ws = temp_base("plist");
        create_plugin(
            "Deck Builder",
            "Genera decks",
            "Crea una presentación sobre {{tema}}",
            "Presentation",
            &AssetScope::Workspace,
            ws.to_str().unwrap(),
        )
        .unwrap();

        let plugins = list_plugins(ws.to_str().unwrap());
        assert_eq!(plugins.len(), 1);
        assert_eq!(plugins[0].name, "Deck Builder");
        assert_eq!(plugins[0].icon, "Presentation");
        assert!(plugins[0].prompt_template.contains("{{tema}}"));

        let _ = fs::remove_dir_all(&ws);
    }

    #[test]
    fn test_empty_name_rejected() {
        let ws = temp_base("empty");
        assert!(create_skill("", "", "", &AssetScope::Workspace, ws.to_str().unwrap()).is_err());
        assert!(create_agent("", "", "", &AssetScope::Workspace, ws.to_str().unwrap()).is_err());
        assert!(create_plugin("", "", "", "", &AssetScope::Workspace, ws.to_str().unwrap()).is_err());
        let _ = fs::remove_dir_all(&ws);
    }
}
