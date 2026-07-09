// Stores the device-bound Client Secret and vaultSalt in IndexedDB.
// These never leave the device and are never sent to the backend.
// Without them, the master password alone cannot reconstruct the Vault Key on a new device.

const DB_NAME = "kript-device-v1";
const STORE_NAME = "device-keys";
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE_NAME, { keyPath: "userId" });
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

export async function getDeviceKeys(userId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(userId);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function setDeviceKeys(userId, clientSecret, vaultSalt) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db
      .transaction(STORE_NAME, "readwrite")
      .objectStore(STORE_NAME)
      .put({ userId, clientSecret, vaultSalt });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function clearDeviceKeys(userId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db
      .transaction(STORE_NAME, "readwrite")
      .objectStore(STORE_NAME)
      .delete(userId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
