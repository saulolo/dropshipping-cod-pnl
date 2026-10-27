// Persistencia en el navegador: asignaciones campaña → producto y búsqueda de productos (localStorage)
// y el acceso al archivo consolidado (IndexedDB, porque localStorage no guarda handles).
(() => {
  const services = (globalThis.PYL.services ??= {});

  const MAP_KEY = 'pyl-cod-campaign-map';
  const campaignMap = {
    load: () => { try { return JSON.parse(localStorage.getItem(MAP_KEY) || '{}'); } catch { return {}; } },
    save: (m) => { try { localStorage.setItem(MAP_KEY, JSON.stringify(m)); } catch { /* sin almacenamiento */ } },
  };

  // Pestaña Buscar producto: pasos hechos, rasgos marcados, candidato en edición y bitácora.
  const SEARCH_KEY = 'pyl-search';
  const search = {
    load: () => { try { return JSON.parse(localStorage.getItem(SEARCH_KEY) || 'null'); } catch { return null; } },
    // false si no cupo (las fotos pesan): quien llama avisa al usuario.
    save: (s) => { try { localStorage.setItem(SEARCH_KEY, JSON.stringify(s)); return true; } catch { return false; } },
  };

  // Almacén clave-valor mínimo; cualquier fallo devuelve null en vez de lanzar.
  const idb = (() => {
    const open = () => new Promise((res, rej) => {
      const r = indexedDB.open('pyl-cod', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
    const tx = async (mode, fn) => {
      try {
        const db = await open();
        return await new Promise((res) => { const t = db.transaction('kv', mode); const req = fn(t.objectStore('kv')); t.oncomplete = () => res(req && req.result); t.onerror = () => res(null); });
      } catch { return null; }
    };
    return { get: (k) => tx('readonly', (s) => s.get(k)), set: (k, v) => tx('readwrite', (s) => s.put(v, k)) };
  })();

  services.storage = { campaignMap, search, idb };
})();
