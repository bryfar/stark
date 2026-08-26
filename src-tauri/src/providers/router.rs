use crate::providers::types::ProviderKind;
use serde::{Deserialize, Serialize};

/// How a given request failure should be handled by the router.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ErrorClass {
    /// 429, 5xx, timeout, model-down, network — retryable, auto-fallback allowed.
    Transient,
    /// 401/403 — bad auth on the user's key. Surface; do NOT fallback.
    Auth,
    /// 400 — malformed request. Surface; do NOT fallback.
    InvalidRequest,
    /// Not classified (2xx/unknown path).
    Ok,
}

impl ErrorClass {
    /// Classify an HTTP status plus a provider hint into a router decision.
    ///
    /// - 401/403 → `Auth` (a bad key is never "fixed" by routing elsewhere)
    /// - 400 → `InvalidRequest`
    /// - 429 and any 5xx → `Transient` (rate limit / server down)
    /// - everything else → `Ok`
    pub fn classify(status: u16) -> Self {
        match status {
            401 | 403 => ErrorClass::Auth,
            400 => ErrorClass::InvalidRequest,
            429 => ErrorClass::Transient,
            500..=599 => ErrorClass::Transient,
            _ => ErrorClass::Ok,
        }
    }

    /// Whether the router may transparently try the next provider in the chain.
    pub fn allows_fallback(&self) -> bool {
        matches!(self, ErrorClass::Transient)
    }
}

/// The backoff delay (in seconds) for retry attempt `attempt` (0-based).
///
/// Implements spec Q4: 15s / 30s / 60s before giving up and suggesting a change.
/// Public for reuse by the transport retry loop.
pub fn backoff_seconds(attempt: usize) -> u64 {
    match attempt {
        0 => 15,
        1 => 30,
        2 => 60,
        _ => 60,
    }
}

/// Which models a user may see in the selector, given the provider and auth state.
///
/// Implements the auth-aware filter (spec Q3 / Q8):
/// - no saved key  -> only free models are shown
/// - saved key     -> the full catalog is shown
#[derive(Debug, Clone)]
pub struct Visibility {
    pub free_models: Vec<String>,
    pub all_models: Vec<String>,
    pub requires_key: bool,
}

/// Decide which model ids are visible for a provider.
///
/// `kind` drives provider-specific free determination:
/// - `Ollama` / `OpenAICompatible` local by default are always free (no key).
/// - Providers flagged `requires_api_key` are, without a key, hidden from the
///   free flow entirely (they have no free tier we know of).
pub fn visible_models(
    kind: &ProviderKind,
    requires_api_key: bool,
    has_key: bool,
    models: &[String],
    free_models: &[String],
) -> Vec<String> {
    if has_key {
        register_known_provider(kind);
        return models.to_vec();
    }
    if requires_api_key {
        // No key AND provider needs one: show nothing (avoids surprise 401s).
        return Vec::new();
    }
    register_known_provider(kind);
    // No key, provider doesn't require one: show its free models.
    let free: Vec<&String> = free_models
        .iter()
        .filter(|m| models.contains(m))
        .collect();
    if free.is_empty() {
        // No explicit free list: default to the full catalogue (local providers).
        models.to_vec()
    } else {
        free.into_iter().cloned().collect()
    }
}

fn register_known_provider(_kind: &ProviderKind) {
    // Reserved: provider metadata (e.g. free-tier hints) can be registered here
    // without coupling the pure router to a fixed registry.
}

use std::sync::{Mutex, OnceLock};
use std::collections::HashMap;

static COOLDOWN_PROVIDERS: OnceLock<Mutex<HashMap<String, std::time::Instant>>> = OnceLock::new();
static LOGICAL_ROUTES: OnceLock<Mutex<HashMap<String, Route>>> = OnceLock::new();

fn get_cooldown_map() -> &'static Mutex<HashMap<String, std::time::Instant>> {
    COOLDOWN_PROVIDERS.get_or_init(|| Mutex::new(HashMap::new()))
}

fn get_routes_map() -> &'static Mutex<HashMap<String, Route>> {
    LOGICAL_ROUTES.get_or_init(|| {
        let mut m = HashMap::new();
        m.insert("stark-dreams".to_string(), Route {
            order: vec!["stark-free".to_string(), "ollama".to_string()],
            allow_fallbacks: true,
            zero_data_only: false,
        });
        Mutex::new(m)
    })
}

pub fn get_route(name: &str) -> Route {
    if let Ok(routes) = get_routes_map().lock() {
        if let Some(r) = routes.get(name) {
            return r.clone();
        }
    }
    Route {
        order: vec![name.to_string()],
        allow_fallbacks: false,
        zero_data_only: false,
    }
}

pub fn register_route(name: String, route: Route) {
    if let Ok(mut routes) = get_routes_map().lock() {
        routes.insert(name, route);
    }
}

pub fn put_provider_on_cooldown(provider_id: &str) {
    if let Ok(mut map) = get_cooldown_map().lock() {
        map.insert(provider_id.to_string(), std::time::Instant::now());
    }
}

pub fn is_provider_on_cooldown(provider_id: &str) -> bool {
    if let Ok(map) = get_cooldown_map().lock() {
        if let Some(time) = map.get(provider_id) {
            return time.elapsed() < std::time::Duration::from_secs(300);
        }
    }
    false
}

pub fn is_provider_zero_data(provider_id: &str) -> bool {
    provider_id == "ollama" || provider_id == "local"
}

/// The per-model routing policy for a logical model ("Stark Dreams" pattern).
///
/// Mirrors opencode's `options.provider.order` + `options.provider.allow_fallbacks`:
/// a single logical model entry declares which providers to try, in order, and whether
/// transparent fallback across them is permitted.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Route {
    /// Ordered provider ids to attempt.
    pub order: Vec<String>,
    /// Whether the router may auto-fall through `order` on transient errors.
    pub allow_fallbacks: bool,
    /// If true, only route to providers with no data-retention policy.
    pub zero_data_only: bool,
}

impl Route {
    /// Resolve the provider to use for a specific (zero-based) fallback step.
    ///
    /// Returns `None` when the step is out of range or fallback is disabled
    /// beyond the first provider.
    pub fn provider_for_step(&self, step: usize) -> Option<&str> {
        if step == 0 {
            return self.order.first().map(|s| s.as_str());
        }
        if !self.allow_fallbacks {
            return None;
        }
        self.order.get(step).map(|s| s.as_str())
    }
}

/// Merge a live `/models` fetch with a preset list, preferring live.
///
/// Spec Q2: fetch live when the provider supports it; fall back to the preset
/// hardcoded list when the fetch is empty or the provider does not expose it,
/// so the selector never renders empty.
pub fn merge_catalog(live: &[String], preset: &[String]) -> Vec<String> {
    if live.is_empty() {
        return preset.to_vec();
    }
    let mut seen = std::collections::HashSet::new();
    let mut out = Vec::with_capacity(live.len());
    for m in live.iter().chain(preset.iter()) {
        if seen.insert(m.clone()) {
            out.push(m.clone());
        }
    }
    out
}

/// Result of the confidence heuristic applied to a local-model response.
///
/// `low` means the local model likely failed to answer and Crafter should offer
/// escalation to a cloud provider. `reason` is a human-readable cause for the
/// suggestion (shown verbatim in the UI). `perplexity` (v2 signal) is the
/// average perplexity over the generated tokens when per-token logprobs were
/// available; `None` when the signal was not computed (e.g. no logprobs).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ConfidenceAssessment {
    pub low: bool,
    pub reason: Option<String>,
    /// Perplexity of the generated continuation (v2 signal). `None` when the
    /// signal is unavailable (no per-token logprobs were reported).
    pub perplexity: Option<f64>,
}

/// Average perplexity over per-token log-probabilities, i.e.
/// `exp(-mean(log p_t))`. This is the v2 confidence signal planned in the
/// ROMAD mapping: high perplexity means the local model was "surprised" most of
/// the way through, which correlates with low-quality / hallucinated output.
fn perplexity_from_logprobs(logprobs: &[f64]) -> Option<f64> {
    if logprobs.is_empty() {
        return None;
    }
    // Skip -inf / NaN tokens (illegal tokens llama-server reports as -inf).
    let finite: Vec<f64> = logprobs.iter().filter(|lp| lp.is_finite()).copied().collect();
    if finite.is_empty() {
        return None;
    }
    let mean = finite.iter().sum::<f64>() / finite.len() as f64;
    Some((-mean).exp())
}

/// Confidence threshold (in bits/token averaged over the response): responses
/// with `perplexity > PERPLEXITY_HIGH` are flagged as low-confidence, since a
/// coherent continuation stays well below ~2-4 bits/token on most vocabularies.
const PERPLEXITY_HIGH: f64 = 25.0;

/// v1 + v2 confidence heuristic.
///
/// v1: text-only refusal/emptiness detector (empty, trivially short, or a known
/// uncertainty marker). v2: when per-token `logprobs` from `llama-server` are
/// present, average perplexity above `PERPLEXITY_HIGH` also flags the response
/// as low-confidence with a numeric reason.
pub fn assess_confidence_with_logprobs(text: &str, logprobs: Option<&[f64]>) -> ConfidenceAssessment {
    let mut assessment = assess_confidence(text);
    if let Some(lps) = logprobs {
        if let Some(perp) = perplexity_from_logprobs(lps) {
            assessment.perplexity = Some(perp);
            if perp > PERPLEXITY_HIGH && !assessment.low {
                assessment.low = true;
                assessment.reason = Some(format!(
                    "La respuesta fue impredecible (perplejidad {:.1}, umbral {})",
                    perp, PERPLEXITY_HIGH
                ));
            }
        }
    }
    assessment
}

/// Markers that a small local model almost certainly cannot answer, phrased as
/// refusal/uncertainty hedges in Spanish and English (the app's two UI languages).
/// v1 of the heuristic (text-only); perplexity from per-token logprobs is the
/// planned v2 signal.
const UNCERTAINTY_MARKERS: &[&str] = &[
    "no se",
    "no lo se",
    "no estoy seguro",
    "no tengo la informacion",
    "no tengo acceso",
    "no tengo los datos",
    "no tengo suficiente",
    "no encuentro",
    "no conozco",
    "no puedo",
    "no tengo una respuesta",
    "sin informacion",
    "no puedo ayudarte",
    "no hay suficiente informacion",
    "no tengo respuesta",
    "i don't know",
    "i don't have the information",
    "i don't have access",
    "i don't have enough",
    "i'm not sure",
    "i am not sure",
    "i cannot",
    "i can't",
    "no information",
    "i don't have an answer",
    "no answer available",
    "i don't have a response",
];

const SHORT_VALID_ANSWERS: &[&str] = &[
    "si", "no", "ok", "claro", "vale", "bien", "yes", "yeah", "sure", "fine",
];

/// v1 confidence heuristic: text-only refusal/emptiness detector.
///
/// Returns `low=true` when the response is empty, trivially short, or hedges with
/// a known uncertainty marker. Normal prose answers pass as high-confidence.
pub fn assess_confidence(text: &str) -> ConfidenceAssessment {
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return ConfidenceAssessment {
            low: true,
            reason: Some("La respuesta fue vacia".to_string()),
            perplexity: None,
        };
    }

    let normalized = trimmed.to_lowercase();
    let short = trimmed.chars().count() < 8 && !SHORT_VALID_ANSWERS.contains(&normalized.as_str());
    if short {
        return ConfidenceAssessment {
            low: true,
            reason: Some("La respuesta fue demasiado corta".to_string()),
            perplexity: None,
        };
    }

    for marker in UNCERTAINTY_MARKERS {
        if normalized.contains(marker) {
            return ConfidenceAssessment {
                low: true,
                reason: Some(format!(
                    "El modelo local no pudo responder: \"{}\"",
                    marker
                )),
                perplexity: None,
            };
        }
    }

    ConfidenceAssessment {
        low: false,
        reason: None,
        perplexity: None,
    }
}

/// Which model ids count as "free" for a provider, given a live catalog.
///
/// Implements the provider-specific free determination (Q8):
/// - OpenAICompatible/OpenRouter: model ids carrying the `:free` suffix (or the
///   explicit free id list from `/models`) are free.
/// - Local providers (Ollama): everything is free.
pub fn free_model_ids(
    kind: &ProviderKind,
    live: &[String],
    preset_free: &[String],
) -> Vec<String> {
    match kind {
        ProviderKind::Ollama | ProviderKind::Local => live.to_vec(),
        ProviderKind::Anthropic | ProviderKind::Gemini => Vec::new(),
        ProviderKind::OpenAICompatible => {
            let mut free: Vec<String> = live
                .iter()
                .filter(|m| m.ends_with(":free"))
                .cloned()
                .collect();
            free.extend(preset_free.iter().cloned());
            free.sort();
            free.dedup();
            free
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn cc(kind: ProviderKind, requires_api_key: bool, models: Vec<&str>) -> (ProviderKind, bool, Vec<String>) {
        let m: Vec<String> = models.into_iter().map(|s| s.to_string()).collect();
        (kind, requires_api_key, m)
    }

    #[test]
    fn free_provider_without_key_shows_free_models_only() {
        let (_kind, req_key, all) = cc(
            ProviderKind::OpenAICompatible,
            false,
            vec!["gpt-4o", "mistral"],
        );
        // Without a key, OpenAICompatible with free list shows the free subset.
        let visible = visible_models(
            &ProviderKind::OpenAICompatible,
            req_key,
            false,
            &all,
            &["mistral".to_string()],
        );
        assert_eq!(visible, vec!["mistral".to_string()]);
    }

    #[test]
    fn keyed_provider_without_key_shows_nothing() {
        let (kind, requires_api_key, all) = cc(
            ProviderKind::OpenAICompatible,
            true,
            vec!["gpt-4o"],
        );
        let visible = visible_models(&kind, requires_api_key, false, &all, &[]);
        assert!(visible.is_empty());
    }

    #[test]
    fn provider_with_key_shows_full_catalog() {
        let (kind, requires_api_key, all) = cc(
            ProviderKind::OpenAICompatible,
            true,
            vec!["gpt-4o", "gpt-4o-mini"],
        );
        let visible = visible_models(&kind, requires_api_key, true, &all, &[]);
        assert_eq!(visible, all);
    }

    #[test]
    fn local_provider_always_shows_models() {
        let (kind, requires_api_key, all) = cc(
            ProviderKind::Ollama,
            false,
            vec!["qwen2.5:1.5b", "llama3.2:3b"],
        );
        let visible = visible_models(&kind, requires_api_key, false, &all, &[]);
        assert_eq!(visible, all);
    }

    #[test]
    fn classifies_429_as_transient() {
        assert_eq!(ErrorClass::classify(429), ErrorClass::Transient);
        assert!(ErrorClass::classify(429).allows_fallback());
    }

    #[test]
    fn classifies_5xx_as_transient() {
        assert_eq!(ErrorClass::classify(503), ErrorClass::Transient);
        assert!(ErrorClass::classify(503).allows_fallback());
    }

    #[test]
    fn classifies_401_403_as_auth_no_fallback() {
        assert_eq!(ErrorClass::classify(401), ErrorClass::Auth);
        assert_eq!(ErrorClass::classify(403), ErrorClass::Auth);
        assert!(!ErrorClass::classify(401).allows_fallback());
    }

    #[test]
    fn classifies_400_as_invalid_request_no_fallback() {
        assert_eq!(ErrorClass::classify(400), ErrorClass::InvalidRequest);
        assert!(!ErrorClass::classify(400).allows_fallback());
    }

    #[test]
    fn route_step_zero_is_first_provider_even_without_fallback() {
        let r = Route {
            order: vec!["baseten".into(), "deepinfra".into()],
            allow_fallbacks: false,
            zero_data_only: false,
        };
        assert_eq!(r.provider_for_step(0), Some("baseten"));
        // fallback disabled -> step 1 is out of reach
        assert_eq!(r.provider_for_step(1), None);
    }

    #[test]
    fn route_fallback_walks_order_in_sequence() {
        let r = Route {
            order: vec!["baseten".into(), "deepinfra".into(), "openrouter".into()],
            allow_fallbacks: true,
            zero_data_only: false,
        };
        assert_eq!(r.provider_for_step(0), Some("baseten"));
        assert_eq!(r.provider_for_step(1), Some("deepinfra"));
        assert_eq!(r.provider_for_step(2), Some("openrouter"));
        // past the end -> None
        assert_eq!(r.provider_for_step(3), None);
    }

    #[test]
    fn route_with_empty_order_resolves_nothing() {
        let r = Route {
            order: vec![],
            allow_fallbacks: true,
            zero_data_only: false,
        };
        assert_eq!(r.provider_for_step(0), None);
    }

    #[test]
    fn merge_uses_live_when_present() {
        let live = vec!["kimi-k2".to_string(), "glm-4.7".to_string()];
        let preset = vec!["gpt-4o".to_string()];
        let merged = merge_catalog(&live, &preset);
        // Live models come first; preset-only models are preserved, not dropped.
        assert_eq!(merged, vec!["kimi-k2", "glm-4.7", "gpt-4o"]);
    }

    #[test]
    fn merge_falls_back_to_preset_when_live_empty() {
        let merged = merge_catalog(&[], &vec!["gpt-4o".to_string()]);
        assert_eq!(merged, vec!["gpt-4o".to_string()]);
    }

    #[test]
    fn merge_dedups_live_and_preset() {
        let live = vec!["kimi-k2".to_string(), "gpt-4o".to_string()];
        let preset = vec!["gpt-4o".to_string(), "glm-4.7".to_string()];
        let merged = merge_catalog(&live, &preset);
        assert_eq!(merged, vec!["kimi-k2", "gpt-4o", "glm-4.7"]);
    }

    #[test]
    fn free_models_from_suffix_and_preset() {
        let live = vec!["deepseek/deepseek-r1:free".to_string(), "openai/gpt-4o".to_string()];
        let preset_free = vec!["mistralai/mistral-7b:free".to_string()];
        let free = free_model_ids(&ProviderKind::OpenAICompatible, &live, &preset_free);
        assert!(free.contains(&"deepseek/deepseek-r1:free".to_string()));
        assert!(free.contains(&"mistralai/mistral-7b:free".to_string()));
        assert!(!free.contains(&"openai/gpt-4o".to_string()));
    }

    #[test]
    fn ollama_models_are_all_free() {
        let live = vec!["qwen2.5:1.5b".to_string()];
        assert_eq!(
            free_model_ids(&ProviderKind::Ollama, &live, &[]),
            vec!["qwen2.5:1.5b".to_string()]
        );
    }

    #[test]
    fn keyed_providers_have_no_known_free_tier() {
        assert!(free_model_ids(&ProviderKind::Anthropic, &vec![], &[]).is_empty());
        assert!(free_model_ids(&ProviderKind::Gemini, &vec![], &[]).is_empty());
    }

    #[test]
    fn backoff_scales_15_30_60_then_plateaus() {
        assert_eq!(backoff_seconds(0), 15);
        assert_eq!(backoff_seconds(1), 30);
        assert_eq!(backoff_seconds(2), 60);
        assert_eq!(backoff_seconds(9), 60);
    }

    #[test]
    fn confidence_marks_empty_response_low() {
        let a = assess_confidence("   ");
        assert!(a.low);
        assert_eq!(a.reason.as_deref(), Some("La respuesta fue vacia"));
    }

    #[test]
    fn confidence_marks_uncertainty_low() {
        let a = assess_confidence("Lo siento, pero no se la respuesta a esa pregunta.");
        assert!(a.low);
        assert!(a.reason.unwrap().contains("no se"));
    }

    #[test]
    fn confidence_marks_english_uncertainty_low() {
        let a = assess_confidence("I'm sorry, but I don't know the answer to that.");
        assert!(a.low);
        assert!(a.reason.unwrap().contains("i don't know"));
    }

    #[test]
    fn confidence_marks_trivial_short_low() {
        let a = assess_confidence("hola");
        assert!(a.low);
        assert_eq!(a.reason.as_deref(), Some("La respuesta fue demasiado corta"));
    }

    #[test]
    fn confidence_allows_valid_short_answer() {
        assert!(!assess_confidence("Si").low);
        assert!(!assess_confidence("no").low);
    }

    #[test]
    fn confidence_passes_normal_answer() {
        let a = assess_confidence(
            "La capital de Francia es Paris. Fue establecida en la orilla del rio Sena.",
        );
        assert!(!a.low);
        assert_eq!(a.reason, None);
    }

    #[test]
    fn perplexity_from_high_low_logprobs() {
        // Uniform distribution over 10 tokens → -log p = -log(0.1) ≈ 2.3 each.
        let high = perplexity_from_logprobs(&[-2.302585; 10]);
        assert!(high.is_some());
        assert!((high.unwrap() - 10.0).abs() < 1e-3);
        // Confident tokens (near-zero logprob) → perplexity near exp(0) = 1.
        let low = perplexity_from_logprobs(&[-0.01, -0.02, -0.005]);
        assert!(low.is_some());
        assert!(low.unwrap() < 1.5);
    }

    #[test]
    fn perplexity_empty_or_nonfinite_is_none() {
        assert_eq!(perplexity_from_logprobs(&[]), None);
        // -inf (illegal tokens) and NaN are filtered, not propagated.
        assert_eq!(perplexity_from_logprobs(&[f64::NEG_INFINITY]), None);
        assert_eq!(perplexity_from_logprobs(&[f64::NAN]), None);
    }

    #[test]
    fn confidence_v2_high_perplexity_flags_low() {
        // A long, low-probability continuation is treated as low-confidence.
        let lps = vec![-4.0f64; 30];
        let a = assess_confidence_with_logprobs("respuesta normal y fluida", Some(&lps));
        assert!(a.low);
        assert!(a.reason.as_deref().unwrap().contains("perplejidad"));
    }

    #[test]
    fn confidence_v2_low_perplexity_leaves_v1_verdict() {
        let lps = vec![-0.1f64; 30];
        let a = assess_confidence_with_logprobs(
            "La capital de Francia es Paris, a orillas del rio Sena.",
            Some(&lps),
        );
        assert!(!a.low);
        assert_eq!(a.reason, None);
    }

    #[test]
    fn confidence_v2_without_logprobs_delegates_to_v1() {
        let a = assess_confidence_with_logprobs("Lo siento, pero no se la respuesta.", None);
        assert!(a.low);
        assert_eq!(a.perplexity, None);
    }

    #[test]
    fn test_cooldown_tracking() {
        assert!(!is_provider_on_cooldown("test-prov"));
        put_provider_on_cooldown("test-prov");
        assert!(is_provider_on_cooldown("test-prov"));
    }

    #[test]
    fn test_logical_routes_and_zero_data() {
        let route = get_route("stark-dreams");
        assert_eq!(route.order, vec!["stark-free".to_string(), "ollama".to_string()]);
        assert!(route.allow_fallbacks);
        
        assert!(is_provider_zero_data("ollama"));
        assert!(!is_provider_zero_data("stark-free"));
    }
}