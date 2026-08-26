use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, PartialOrd, Ord, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Tier {
    Lite,
    Basic,
    Standard,
    Pro,
}

impl Tier {
    pub fn as_str(&self) -> &'static str {
        match self {
            Tier::Lite => "Lite",
            Tier::Basic => "Basic",
            Tier::Standard => "Standard",
            Tier::Pro => "Pro",
        }
    }

    pub fn from_str(s: &str) -> Tier {
        match s {
            "Lite" => Tier::Lite,
            "Basic" => Tier::Basic,
            "Standard" => Tier::Standard,
            _ => Tier::Pro,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct CatalogEntry {
    pub id: String,
    pub repo: String,
    pub file: String,
    pub bits: u32,
    pub quant: String,
    pub ram_mb: u64,
    pub tier: Tier,
}

impl CatalogEntry {
    pub fn download_url(&self) -> String {
        format!("https://huggingface.co/{}/resolve/main/{}", self.repo, self.file)
    }
}

pub fn catalog() -> Vec<CatalogEntry> {
    vec![
        CatalogEntry {
            id: "qwen-0.5b-q2k".to_string(),
            repo: "Qwen/Qwen2.5-0.5B-Instruct-GGUF".to_string(),
            file: "qwen2.5-0.5b-instruct-q2_k.gguf".to_string(),
            bits: 2,
            quant: "Q2_K".to_string(),
            ram_mb: 450,
            tier: Tier::Lite,
        },
        CatalogEntry {
            id: "qwen-1.5b-q2k".to_string(),
            repo: "Qwen/Qwen2.5-1.5B-Instruct-GGUF".to_string(),
            file: "qwen2.5-1.5b-instruct-q2_k.gguf".to_string(),
            bits: 2,
            quant: "Q2_K".to_string(),
            ram_mb: 1100,
            tier: Tier::Basic,
        },
        CatalogEntry {
            id: "qwen-7b-iq2xxs".to_string(),
            repo: "bartowski/Qwen2.5-7B-Instruct-GGUF".to_string(),
            file: "Qwen2.5-7B-Instruct-IQ2_XXS.gguf".to_string(),
            bits: 2,
            quant: "IQ2_XXS".to_string(),
            ram_mb: 2800,
            tier: Tier::Standard,
        },
        CatalogEntry {
            id: "qwen-7b-q4km".to_string(),
            repo: "bartowski/Qwen2.5-7B-Instruct-GGUF".to_string(),
            file: "Qwen2.5-7B-Instruct-Q4_K_M.gguf".to_string(),
            bits: 4,
            quant: "Q4_K_M".to_string(),
            ram_mb: 5000,
            tier: Tier::Standard,
        },
        CatalogEntry {
            id: "qwen-coder-14b-iq2xxs".to_string(),
            repo: "bartowski/Qwen2.5-Coder-14B-Instruct-GGUF".to_string(),
            file: "Qwen2.5-Coder-14B-Instruct-IQ2_XXS.gguf".to_string(),
            bits: 2,
            quant: "IQ2_XXS".to_string(),
            ram_mb: 5400,
            tier: Tier::Pro,
        },
        CatalogEntry {
            id: "qwen-coder-14b-q4km".to_string(),
            repo: "bartowski/Qwen2.5-Coder-14B-Instruct-GGUF".to_string(),
            file: "Qwen2.5-Coder-14B-Instruct-Q4_K_M.gguf".to_string(),
            bits: 4,
            quant: "Q4_K_M".to_string(),
            ram_mb: 9200,
            tier: Tier::Pro,
        },
    ]
}

pub fn by_id(id: &str) -> Option<CatalogEntry> {
    catalog().into_iter().find(|e| e.id == id)
}

pub fn for_tier(tier: Tier) -> Vec<CatalogEntry> {
    let mut entries: Vec<CatalogEntry> = catalog().into_iter().filter(|e| e.tier == tier).collect();
    entries.sort_by_key(|e| e.bits);
    entries
}

pub fn default_for_tier(tier: Tier) -> CatalogEntry {
    for_tier(tier)
        .first()
        .cloned()
        .unwrap_or_else(|| catalog().first().cloned().expect("catalog no vacio"))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ids() -> Vec<String> {
        catalog().into_iter().map(|e| e.id).collect()
    }

    #[test]
    fn catalog_has_unique_ids() {
        let mut seen = std::collections::HashSet::new();
        assert!(ids().into_iter().all(|id| seen.insert(id)));
    }

    #[test]
    fn every_tier_has_entries() {
        for tier in [Tier::Lite, Tier::Basic, Tier::Standard, Tier::Pro] {
            assert!(!for_tier(tier).is_empty(), "tier {:?} vacio", tier);
        }
    }

    #[test]
    fn default_favors_lowest_bits() {
        assert_eq!(default_for_tier(Tier::Standard).bits, 2);
        assert_eq!(default_for_tier(Tier::Pro).bits, 2);
    }

    #[test]
    fn download_url_is_hf_resolve() {
        let e = by_id("qwen-0.5b-q2k").unwrap();
        assert_eq!(
            e.download_url(),
            "https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q2_k.gguf"
        );
    }

    #[test]
    fn tier_roundtrip() {
        assert_eq!(Tier::from_str("Standard"), Tier::Standard);
        assert_eq!(Tier::from_str("Lite").as_str(), "Lite");
        assert_eq!(Tier::from_str("desconocido"), Tier::Pro);
    }
}