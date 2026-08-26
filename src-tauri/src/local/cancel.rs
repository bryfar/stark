use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Mutex, OnceLock};

/// Sentinel error string returned by downloaders when the active transfer was
/// aborted. `ensure_installed` maps it to a `local-setup-cancelled` event and a
/// soft status instead of surfacing a generic download error.
pub const CANCELLED: &str = "local_setup_cancelled";

/// Only one transfer runs at a time (serialized by `setup::DOWNLOAD_LOCK`), so
/// a single registered flag is enough. A generation counter guards against a
/// `cancel` arriving just as the previous transfer finishes and a fresh one
/// begins: `clear` only releases the generation it registered.
static CURRENT: OnceLock<Mutex<Option<(u64, Arc<AtomicBool>)>>> = OnceLock::new();
static COUNTER: AtomicU64 = AtomicU64::new(0);

/// Token handed to a downloader so it can poll for cancellation. Dropping it has
/// no side effects; `CancelGuard::finish` releases the registry slot.
pub struct CancelGuard {
    gen: u64,
    flag: Arc<AtomicBool>,
}

impl CancelGuard {
    /// Poll the cancellation flag set by `abort_current()`.
    pub fn is_cancelled(&self) -> bool {
        self.flag.load(Ordering::SeqCst)
    }

    /// Release the registry slot (no-op if a newer transfer already re-registered).
    pub fn finish(self) {
        clear(self.gen);
    }
}

fn slot() -> &'static Mutex<Option<(u64, Arc<AtomicBool>)>> {
    CURRENT.get_or_init(|| Mutex::new(None))
}

/// Register a new transfer and return its polling token.
pub fn register() -> CancelGuard {
    let gen = COUNTER.fetch_add(1, Ordering::SeqCst);
    let flag = Arc::new(AtomicBool::new(false));
    *slot().lock().unwrap() = Some((gen, flag.clone()));
    CancelGuard { gen, flag }
}

/// Set the cancellation flag for whatever transfer is currently registered.
/// Returns true when a live transfer was aborted (no-op if none is running).
pub fn abort_current() -> bool {
    let dirty = slot().lock().unwrap().as_ref().map(|(_, flag)| {
        flag.store(true, Ordering::SeqCst);
        true
    });
    dirty.unwrap_or(false)
}

/// Release the registry slot, but only if it still belongs to the caller
/// (`gen` guard against a newer registration).
pub fn clear(gen: u64) {
    let mut guard = slot().lock().unwrap();
    if let Some((current_gen, _)) = guard.as_ref() {
        if *current_gen == gen {
            *guard = None;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn abort_without_transfer_is_noop() {
        assert!(!abort_current());
        clear(0);
    }

    #[test]
    fn cancel_sets_flag_and_clear_does_not_erase_newer() {
        let old = register();
        let newer = register();
        assert!(abort_current());
        // clearing the older generation must not erase the newer flag
        old.finish();
        assert!(slot().lock().unwrap().is_some());
        assert!(newer.is_cancelled());
        newer.finish();
        assert!(slot().lock().unwrap().is_none());
    }

    #[test]
    fn brand_new_transfer_starts_uncancelled() {
        let guard = register();
        assert!(!guard.is_cancelled());
        guard.finish();
    }
}