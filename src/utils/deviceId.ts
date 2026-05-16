import { uid } from "./uid";

const STORAGE_KEY = "adamenu_device_id";

/**
 * Anonymous per-device identifier for QR ordering.
 * Generated on first call, persisted in localStorage, stable across reloads.
 * Lets the KDS distinguish concurrent guests sharing one table QR.
 */
export function getDeviceId(): string {
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = uid();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    return uid();
  }
}

/** 4-char uppercase prefix used to label the device on the kitchen display. */
export function getDeviceIdShort(): string {
  return getDeviceId().slice(0, 4).toUpperCase();
}
