use serde::{Deserialize, Serialize};
use sysinfo::System;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct HardwareInfo {
    pub total_ram_mb: u64,
    pub available_ram_mb: u64,
    pub cpu_cores: usize,
    pub tier: String,
    pub recommended_models: Vec<String>,
}

pub fn detect_hardware_tier() -> HardwareInfo {
    let mut sys = System::new_all();
    sys.refresh_all();

    let total_ram_mb = sys.total_memory() / (1024 * 1024);
    let available_ram_mb = sys.available_memory() / (1024 * 1024);
    let cpu_cores = sys.cpus().len();

    let (tier, recommended_models) = classify_tier(total_ram_mb);

    HardwareInfo {
        total_ram_mb,
        available_ram_mb,
        cpu_cores,
        tier: tier.to_string(),
        recommended_models,
    }
}

pub fn classify_tier(ram_mb: u64) -> (&'static str, Vec<String>) {
    if ram_mb < 4096 {
        (
            "Lite",
            vec![
                "qwen2.5:0.5b (Q4)".to_string(),
                "qwen2.5:1.5b (Q4)".to_string(),
                "phi3:mini".to_string(),
            ],
        )
    } else if ram_mb < 8192 {
        (
            "Basic",
            vec![
                "qwen2.5:3b (Q4)".to_string(),
                "llama3.2:3b (Q4)".to_string(),
                "phi3:mini".to_string(),
            ],
        )
    } else if ram_mb < 16384 {
        (
            "Standard",
            vec![
                "llama3.1:8b (Q4)".to_string(),
                "qwen2.5-coder:7b".to_string(),
                "deepseek-coder:6.7b".to_string(),
            ],
        )
    } else {
        (
            "Pro",
            vec![
                "deepseek-coder:14b".to_string(),
                "qwen2.5-coder:14b".to_string(),
                "llama3.1:70b (Q4)".to_string(),
            ],
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_classify_tier_lite() {
        let (tier, models) = classify_tier(3000);
        assert_eq!(tier, "Lite");
        assert!(models.iter().any(|m| m.contains("qwen2.5:0.5b")));
    }

    #[test]
    fn test_classify_tier_basic() {
        let (tier, models) = classify_tier(6000);
        assert_eq!(tier, "Basic");
        assert!(models.iter().any(|m| m.contains("llama3.2:3b")));
    }

    #[test]
    fn test_classify_tier_standard() {
        let (tier, models) = classify_tier(12000);
        assert_eq!(tier, "Standard");
        assert!(models.iter().any(|m| m.contains("llama3.1:8b")));
    }

    #[test]
    fn test_classify_tier_pro() {
        let (tier, models) = classify_tier(32000);
        assert_eq!(tier, "Pro");
        assert!(models.iter().any(|m| m.contains("deepseek-coder:14b")));
    }
}
