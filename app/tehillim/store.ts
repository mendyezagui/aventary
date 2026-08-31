// Client-only localStorage helpers for saved Psalms (kept for kaddish / family).
// Saved per-device (the app has no login).

export type Saved = { ch: number; note?: string };

const KEY = "tehillim.saved";

export function getSaved(): Saved[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(v) ? v.filter((s) => typeof s?.ch === "number") : [];
  } catch {
    return [];
  }
}

export function setSaved(list: Saved[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable — ignore */
  }
}

export function isSaved(list: Saved[], ch: number): boolean {
  return list.some((s) => s.ch === ch);
}

// Toggle a chapter and return the new list. New chapters are appended at the
// end so the user's custom order is preserved (no re-sorting).
export function toggleSaved(ch: number): Saved[] {
  const list = getSaved();
  const i = list.findIndex((s) => s.ch === ch);
  if (i >= 0) list.splice(i, 1);
  else list.push({ ch });
  setSaved(list);
  return list;
}

// Move a saved chapter one place earlier (-1) or later (+1); returns the list.
export function moveSaved(ch: number, dir: -1 | 1): Saved[] {
  const list = getSaved();
  const i = list.findIndex((s) => s.ch === ch);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return list;
  [list[i], list[j]] = [list[j], list[i]];
  setSaved(list);
  return list;
}

export function setNote(ch: number, note: string): Saved[] {
  const list = getSaved();
  const s = list.find((x) => x.ch === ch);
  if (s) s.note = note.trim() || undefined;
  setSaved(list);
  return list;
}

export function removeSaved(ch: number): Saved[] {
  const list = getSaved().filter((s) => s.ch !== ch);
  setSaved(list);
  return list;
}
