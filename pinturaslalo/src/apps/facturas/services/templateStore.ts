
export interface StoredTemplate {
  name: string;
  data: ArrayBuffer;
}

const DB_NAME = 'lalo_templates_db';
const STORE_NAME = 'templates';
const KEY_NAME = 'Plantilla_Factura_BASE';

export const templateStore = {
  async saveTemplate(file: File): Promise<StoredTemplate> {
    const data = await file.arrayBuffer();
    const template: StoredTemplate = { name: file.name, data };
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(template, KEY_NAME);
        tx.oncomplete = () => resolve(template);
      };
      request.onerror = () => reject(request.error);
    });
  },

  async getTemplate(): Promise<StoredTemplate | null> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(STORE_NAME, 'readonly');
        const getRequest = tx.objectStore(STORE_NAME).get(KEY_NAME);
        getRequest.onsuccess = () => resolve(getRequest.result || null);
      };
      request.onerror = () => resolve(null);
    });
  },

  async clearTemplate(): Promise<void> {
    return new Promise((resolve) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(KEY_NAME);
        tx.oncomplete = () => resolve();
      };
    });
  }
};
