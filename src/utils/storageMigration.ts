export function migrateStorageKey(oldKey: string, newKey: string): void {
  if (!localStorage.getItem(newKey)) {
    const old = localStorage.getItem(oldKey);
    if (old) { localStorage.setItem(newKey, old); localStorage.removeItem(oldKey); }
  }
}
