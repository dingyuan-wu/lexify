import { storage } from 'wxt/utils/storage';
import { DEFAULT_SETTINGS, type Settings } from './types';

const settingsItem = storage.defineItem<Settings>('sync:settings', {
  fallback: DEFAULT_SETTINGS,
});

export async function getSettings(): Promise<Settings> {
  return settingsItem.getValue();
}

export async function setSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await settingsItem.getValue()), ...patch };
  await settingsItem.setValue(next);
  return next;
}

export function watchSettings(cb: (s: Settings) => void): () => void {
  return settingsItem.watch(cb);
}
