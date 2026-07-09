import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { encryptData, decryptData } from "@/crypto/aead";
import { deriveVaultKey } from "@/crypto/kdf";
import { deriveExportKey } from "@/crypto/exportKey";
import { randomBase64, randomHex } from "@/crypto/csprng";
import { startAutoLock } from "@/crypto/autoLock";
import { getDeviceKeys, setDeviceKeys } from "@/store/clientSecret";
import { fetchVault, saveVault } from "@/api/vaultClient";

const AUTO_LOCK_MS = 10 * 60 * 1000; // 10 minutes

const VaultCtx = createContext(null);

export function VaultProvider({ children }) {
  // Vault Key lives only in this ref — never serialized, never persisted.
  const vaultKeyRef = useRef(null);

  const [credentials, setCredentials] = useState([]);
  const [vaultVersion, setVaultVersion] = useState(0);
  const [locked, setLocked] = useState(true);
  const [userId, setUserId] = useState(null);
  const autoLockDisposerRef = useRef(null);

  const lock = useCallback(() => {
    vaultKeyRef.current = null;
    setCredentials([]);
    setLocked(true);
    if (autoLockDisposerRef.current) {
      autoLockDisposerRef.current();
      autoLockDisposerRef.current = null;
    }
  }, []);

  const _setupAutoLock = useCallback(() => {
    if (autoLockDisposerRef.current) autoLockDisposerRef.current();
    autoLockDisposerRef.current = startAutoLock(AUTO_LOCK_MS, lock);
  }, [lock]);

  // Derives the Vault Key from the master password + stored device keys,
  // then downloads and decrypts the vault blob from the backend.
  const unlock = useCallback(
    async (masterPassword, userIdParam, deviceKeys) => {
      const { clientSecret, vaultSalt } = deviceKeys;
      const vaultKey = await deriveVaultKey(masterPassword, clientSecret, vaultSalt);

      const vaultEntry = await fetchVault(userIdParam);
      let creds = [];
      let version = 0;
      if (vaultEntry?.blob) {
        creds = await decryptData(vaultEntry.blob, vaultKey);
        version = vaultEntry.version || 0;
      }

      vaultKeyRef.current = vaultKey;
      setCredentials(creds);
      setVaultVersion(version);
      setUserId(userIdParam);
      setLocked(false);
      _setupAutoLock();
    },
    [_setupAutoLock]
  );

  // Called on first registration: generates device keys, encrypts an empty vault,
  // and uploads the initial blob to the backend.
  const initVault = useCallback(
    async (masterPassword, userIdParam, clientSecret, vaultSalt) => {
      await setDeviceKeys(userIdParam, clientSecret, vaultSalt);
      const vaultKey = await deriveVaultKey(masterPassword, clientSecret, vaultSalt);
      const blob = await encryptData([], vaultKey);
      const newVersion = await saveVault(userIdParam, blob, 0);

      vaultKeyRef.current = vaultKey;
      setCredentials([]);
      setVaultVersion(newVersion);
      setUserId(userIdParam);
      setLocked(false);
      _setupAutoLock();
    },
    [_setupAutoLock]
  );

  const _syncVault = useCallback(
    async (newCreds, currentVersion) => {
      if (!vaultKeyRef.current || !userId) return;
      const blob = await encryptData(newCreds, vaultKeyRef.current);
      const newVersion = await saveVault(userId, blob, currentVersion);
      setVaultVersion(newVersion);
    },
    [userId]
  );

  const addCredential = useCallback(
    async (credData) => {
      const item = {
        id: `cred-${Date.now()}-${randomHex(4)}`,
        createdAt: new Date().toISOString(),
        ...credData,
      };
      const newCreds = [item, ...credentials];
      setCredentials(newCreds);
      await _syncVault(newCreds, vaultVersion);
      return item;
    },
    [credentials, _syncVault, vaultVersion]
  );

  const updateCredential = useCallback(
    async (id, credData) => {
      const newCreds = credentials.map((c) =>
        c.id === id ? { ...c, ...credData, updatedAt: new Date().toISOString() } : c
      );
      setCredentials(newCreds);
      await _syncVault(newCreds, vaultVersion);
    },
    [credentials, _syncVault, vaultVersion]
  );

  const deleteCredential = useCallback(
    async (id) => {
      const newCreds = credentials.filter((c) => c.id !== id);
      setCredentials(newCreds);
      await _syncVault(newCreds, vaultVersion);
    },
    [credentials, _syncVault, vaultVersion]
  );

  // Encrypts the current credentials with the Export Key (derived from masterPassword
  // + a fresh exportSalt) and returns a portable file object.
  const exportVault = useCallback(
    async (masterPassword) => {
      const exportSalt = randomBase64(16);
      const exportKey = await deriveExportKey(masterPassword, exportSalt);
      const blob = await encryptData(credentials, exportKey);
      return {
        kriptVersion: 1,
        exportSalt,
        blob,
        exportedAt: new Date().toISOString(),
      };
    },
    [credentials]
  );

  // Decrypts an export file (which used the Export Key), then re-encrypts
  // with the Vault Key for this device and uploads.
  const importVault = useCallback(
    async (masterPassword, exportFile, userIdParam) => {
      const exportKey = await deriveExportKey(masterPassword, exportFile.exportSalt);
      const importedCreds = await decryptData(exportFile.blob, exportKey);

      const clientSecret = randomBase64(32);
      const vaultSalt = randomBase64(16);
      await setDeviceKeys(userIdParam, clientSecret, vaultSalt);

      const vaultKey = await deriveVaultKey(masterPassword, clientSecret, vaultSalt);
      const encryptedBlob = await encryptData(importedCreds, vaultKey);
      const newVersion = await saveVault(userIdParam, encryptedBlob, 0);

      vaultKeyRef.current = vaultKey;
      setCredentials(importedCreds);
      setVaultVersion(newVersion);
      setUserId(userIdParam);
      setLocked(false);
      _setupAutoLock();

      return importedCreds;
    },
    [_setupAutoLock]
  );

  useEffect(() => {
    return () => {
      if (autoLockDisposerRef.current) autoLockDisposerRef.current();
    };
  }, []);

  return (
    <VaultCtx.Provider
      value={{
        locked,
        credentials,
        vaultVersion,
        lock,
        unlock,
        initVault,
        addCredential,
        updateCredential,
        deleteCredential,
        exportVault,
        importVault,
      }}
    >
      {children}
    </VaultCtx.Provider>
  );
}

export function useVault() {
  const ctx = useContext(VaultCtx);
  if (!ctx) throw new Error("useVault must be inside <VaultProvider>");
  return ctx;
}
