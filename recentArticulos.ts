import type { Articulo } from "./types";

const STORAGE_KEY = "panol-recent-articulos";
const MAX_RECENT = 10;

export function getRecentArticulos(): Articulo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Articulo[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

export function addRecentArticulo(art: Articulo): void {
  try {
    const prev = getRecentArticulos().filter((a) => a.id !== art.id);
    const next = [art, ...prev].slice(0, MAX_RECENT);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* almacenamiento lleno o modo privado */
  }
}

export function updateRecentArticulo(art: Articulo): void {
  addRecentArticulo(art);
}
