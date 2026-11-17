/**
 * indexedDbCache.ts
 * Gerenciador de persistência local segura via IndexedDB nativo (Zero dependências externas).
 * Armazena catálogos pesados (Produtos, Vendas, Caixas, Comandas) no navegador do usuário
 * para inicialização instantânea e economia de Egress.
 * 
 * Regra de Segurança Crítica:
 * - NUNCA armazena senhas, tokens ou dados de autenticação.
 * - Suporta limpeza completa ao deslogar ou trocar de operador.
 */

const DB_NAME = 'distribuidora_010_cache_v1';
const DB_VERSION = 1;

interface CacheEnvelope<T> {
  key: string;
  data: T;
  version: string | number;
  timestamp: number;
}

class IndexedDbCache {
  private dbPromise: Promise<IDBDatabase | null> | null = null;

  private async getDb(): Promise<IDBDatabase | null> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return null;
    }

    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve) => {
        try {
          const request = window.indexedDB.open(DB_NAME, DB_VERSION);

          request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains('app_cache')) {
              db.createObjectStore('app_cache', { keyPath: 'key' });
            }
          };

          request.onsuccess = () => {
            resolve(request.result);
          };

          request.onerror = () => {
            console.warn('[IndexedDbCache] Não foi possível abrir IndexedDB, usando fallback em memória.');
            resolve(null);
          };
        } catch {
          resolve(null);
        }
      });
    }

    return this.dbPromise;
  }

  async get<T>(key: string): Promise<{ data: T; version: string | number; timestamp: number } | null> {
    try {
      const db = await this.getDb();
      if (!db) {
        // Fallback rápido no localStorage para navegadores que bloqueiam IDB
        const local = localStorage.getItem(`010_idb_fb_${key}`);
        return local ? JSON.parse(local) : null;
      }

      return new Promise((resolve) => {
        try {
          const transaction = db.transaction('app_cache', 'readonly');
          const store = transaction.objectStore('app_cache');
          const request = store.get(key);

          request.onsuccess = () => {
            if (request.result) {
              resolve({
                data: request.result.data,
                version: request.result.version,
                timestamp: request.result.timestamp
              });
            } else {
              resolve(null);
            }
          };

          request.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      });
    } catch {
      return null;
    }
  }

  async set<T>(key: string, data: T, version: string | number = ''): Promise<void> {
    try {
      const envelope: CacheEnvelope<T> = {
        key,
        data,
        version,
        timestamp: Date.now()
      };

      const db = await this.getDb();
      if (!db) {
        try {
          localStorage.setItem(`010_idb_fb_${key}`, JSON.stringify(envelope));
        } catch {}
        return;
      }

      return new Promise((resolve) => {
        try {
          const transaction = db.transaction('app_cache', 'readwrite');
          const store = transaction.objectStore('app_cache');
          const request = store.put(envelope);

          request.onsuccess = () => resolve();
          request.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
    } catch {
      // Silencioso
    }
  }

  async remove(key: string): Promise<void> {
    try {
      const db = await this.getDb();
      if (db) {
        const transaction = db.transaction('app_cache', 'readwrite');
        const store = transaction.objectStore('app_cache');
        store.delete(key);
      }
      localStorage.removeItem(`010_idb_fb_${key}`);
    } catch {}
  }

  async clearAll(): Promise<void> {
    try {
      const db = await this.getDb();
      if (db) {
        const transaction = db.transaction('app_cache', 'readwrite');
        const store = transaction.objectStore('app_cache');
        store.clear();
      }
      // Limpa os fallbacks
      Object.keys(localStorage)
        .filter(k => k.startsWith('010_idb_fb_'))
        .forEach(k => localStorage.removeItem(k));
    } catch {}
  }
}

export const idbCache = new IndexedDbCache();
