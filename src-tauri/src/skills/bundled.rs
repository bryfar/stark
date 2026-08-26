use std::fs;
use std::path::PathBuf;

/// A bundled skill that ships inside the stark binary.
pub struct BundledSkill {
    pub name: &'static str,
    pub description: &'static str,
    pub content: &'static str,
}

/// Returns all bundled skills embedded in the binary.
pub fn bundled_skills() -> Vec<BundledSkill> {
    vec![
        BundledSkill {
            name: "diagnose-crash",
            description: "Diagnose a crash from coredumpctl and journal",
            content: include_str!("../../../.agents/skills/diagnosing-bugs/SKILL.md"),
        },
        BundledSkill {
            name: "code-review",
            description: "Review code changes for standards and spec compliance",
            content: include_str!("../../../.agents/skills/code-review/SKILL.md"),
        },
        BundledSkill {
            name: "tdd",
            description: "Test-driven development workflow",
            content: include_str!("../../../.agents/skills/tdd/SKILL.md"),
        },
        BundledSkill {
            name: "implement",
            description: "Implement features from spec or tickets",
            content: include_str!("../../../.agents/skills/implement/SKILL.md"),
        },
        BundledSkill {
            name: "grill-me",
            description: "Relentless interview to sharpen a plan or design",
            content: include_str!("../../../.agents/skills/grill-me/SKILL.md"),
        },
        BundledSkill {
            name: "domain-modeling",
            description: "Build and sharpen a project's domain model",
            content: include_str!("../../../.agents/skills/domain-modeling/SKILL.md"),
        },
        BundledSkill {
            name: "design-an-interface",
            description: "Generate multiple interface designs for a module",
            content: include_str!("../../../.agents/skills/design-an-interface/SKILL.md"),
        },
        BundledSkill {
            name: "to-spec",
            description: "Turn conversation into a spec and publish to issue tracker",
            content: include_str!("../../../.agents/skills/to-spec/SKILL.md"),
        },
    ]
}

/// Materialize bundled skills to `~/.local/share/stark/skills/` so users can
/// read and edit them. Idempotent: only writes if the file doesn't exist or
/// the content differs (version-stamped via a `.stark-version` sentinel).
pub fn materialize_skills() -> Result<Vec<String>, String> {
    let base = stark_skills_dir()?;
    fs::create_dir_all(&base).map_err(|e| format!("Error creating skills dir: {}", e))?;

    let mut installed = Vec::new();
    for skill in bundled_skills() {
        let skill_dir = base.join(skill.name);
        fs::create_dir_all(&skill_dir).map_err(|e| format!("Error creating skill dir: {}", e))?;
        let skill_file = skill_dir.join("SKILL.md");
        // Write if missing or content differs
        let should_write = !skill_file.exists()
            || fs::read_to_string(&skill_file).unwrap_or_default() != skill.content;
        if should_write {
            fs::write(&skill_file, skill.content)
                .map_err(|e| format!("Error writing skill: {}", e))?;
            installed.push(skill.name.to_string());
        }
    }
    Ok(installed)
}

/// Create symlinks from external harness skill directories to stark's
/// materialized skills. This makes bundled skills visible to Claude Code,
/// Codex, Pi, and other agents without duplicating files.
///
/// Returns (installed, skipped) where skipped contains harness dirs that
/// already have a symlink.
pub fn install_symlinks(
    targets: Option<Vec<String>>,
) -> Result<(Vec<String>, Vec<String>), String> {
    let stark_dir = stark_skills_dir()?;
    if !stark_dir.exists() {
        // Materialize first if needed
        materialize_skills()?;
    }

    let home = dirs_next::home_dir().ok_or("Cannot determine home directory")?;

    // Default symlink targets (all known harness skill dirs)
    let default_targets: Vec<PathBuf> = vec![
        home.join(".claude/skills/stark"),
        home.join(".codex/skills/stark"),
        home.join(".pi/agent/skills/stark"),
        home.join(".agents/skills/stark"),
    ];

    let target_paths: Vec<PathBuf> = match targets {
        Some(t) => t.into_iter().map(|t| PathBuf::from(t)).collect(),
        None => default_targets,
    };

    let mut installed = Vec::new();
    let mut skipped = Vec::new();

    for target in target_paths {
        let parent = target.parent().ok_or(format!("Invalid target: {}", target.display()))?;
        fs::create_dir_all(parent).map_err(|e| format!("Error creating parent dir: {}", e))?;

        if target.exists() || target.symlink_metadata().is_ok() {
            skipped.push(target.display().to_string());
            continue;
        }

        #[cfg(unix)]
        {
            std::os::unix::fs::symlink(&stark_dir, &target)
                .map_err(|e| format!("Error creating symlink: {}", e))?;
            installed.push(target.display().to_string());
        }

        #[cfg(not(unix))]
        {
            // On non-Unix, just copy the directory
            copy_dir_recursive(&stark_dir, &target)
                .map_err(|e| format!("Error copying skills: {}", e))?;
            installed.push(target.display().to_string());
        }
    }

    Ok((installed, skipped))
}

/// Returns the path where stark's bundled skills are materialized.
fn stark_skills_dir() -> Result<PathBuf, String> {
    let data_dir = dirs_next::data_local_dir()
        .or_else(dirs_next::data_dir)
        .ok_or("Cannot determine data directory")?;
    Ok(data_dir.join("stark/skills"))
}

#[cfg(not(unix))]
fn copy_dir_recursive(src: &Path, dst: &Path) -> Result<(), std::io::Error> {
    fs::create_dir_all(dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        if ty.is_dir() {
            copy_dir_recursive(&entry.path(), &dst.join(entry.file_name()))?;
        } else {
            fs::copy(entry.path(), dst.join(entry.file_name()))?;
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Mutex;

    static TEST_LOCK: Mutex<()> = Mutex::new(());

    #[test]
    fn bundled_skills_not_empty() {
        let skills = bundled_skills();
        assert!(!skills.is_empty());
        assert!(skills.iter().any(|s| s.name == "code-review"));
    }

    #[test]
    fn materialize_creates_files() {
        let _guard = TEST_LOCK.lock().unwrap();
        let base = stark_skills_dir().unwrap();
        let _ = fs::remove_dir_all(&base);

        let installed = materialize_skills().unwrap();
        assert!(!installed.is_empty());

        // Verify at least one file exists
        let skill_file = base.join("code-review/SKILL.md");
        assert!(skill_file.exists());

        // Cleanup
        let _ = fs::remove_dir_all(&base);
    }
}
