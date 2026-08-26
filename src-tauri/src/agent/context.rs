use std::any::{Any, TypeId};
use std::collections::HashMap;
use std::sync::{Arc, RwLock};

/// Bus central de servicios desacoplados e intercambiables (estilo Cordis / DeepSeek Harness).
pub struct ServiceContext {
    services: RwLock<HashMap<TypeId, Arc<dyn Any + Send + Sync>>>,
}

impl ServiceContext {
    pub fn new() -> Self {
        Self {
            services: RwLock::new(HashMap::new()),
        }
    }

    /// Registra un proveedor para un tipo de servicio de forma dinámica.
    pub fn register<S: 'static + Send + Sync>(&self, service: S) {
        if let Ok(mut map) = self.services.write() {
            map.insert(TypeId::of::<S>(), Arc::new(service));
        }
    }

    /// Obtiene una referencia compartida al proveedor de servicio registrado.
    pub fn get<S: 'static + Send + Sync>(&self) -> Option<Arc<S>> {
        if let Ok(map) = self.services.read() {
            map.get(&TypeId::of::<S>())
                .and_then(|any| any.clone().downcast::<S>().ok())
        } else {
            None
        }
    }
}

impl Default for ServiceContext {
    fn default() -> Self {
        Self::new()
    }
}
