pub mod cancel;
pub mod catalog;
pub mod manager;
pub mod quantize;
pub mod setup;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalSetupStatus {
    pub binary: Option<String>,
    pub model: Option<String>,
    pub server_url: Option<String>,
    pub running: bool,
    pub complete: bool,
    pub message: String,
    pub downloading: bool,
    /// Catalog id of the model currently loaded into `llama-server`, if any.
    #[serde(default)]
    pub loaded_model: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalSetupProgress {
    pub stage: String,
    pub downloaded: u64,
    pub total: u64,
    pub message: String,
}
