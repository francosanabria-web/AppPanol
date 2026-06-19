import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import type { Articulo } from "./types";

/** Máximo de resultados mostrados por búsqueda (filtrado en cliente, sin lecturas extra). */
export const MAX_SEARCH_RESULTS = 100;

let memoryCatalog: Articulo[] | null = null;
let catalogLoadPromise: Promise<Articulo[]> | null = null;

function snapToLista(snap: Awaited<ReturnType<typeof getDocs>>): Articulo[] {
  const lista: Articulo[] = [];
  snap.forEach((d) => lista.push({ id: d.id, ...d.data() } as Articulo));
  return lista;
}

export function getCatalogFromMemory(): Articulo[] {
  return memoryCatalog ?? [];
}

export function isCatalogLoaded(): boolean {
  return memoryCatalog !== null && memoryCatalog.length > 0;
}

export function patchArticuloInCatalog(id: string, partial: Partial<Articulo>): void {
  if (!memoryCatalog) return;
  memoryCatalog = memoryCatalog.map((a) =>
    a.id === id ? { ...a, ...partial } : a
  );
}

/**
 * Sincroniza con Firestore usando solo getDocs (caché persistente del navegador).
 * No fuerza lectura del servidor: documentos sin cambios no generan lecturas facturables.
 * El caché en el celular permanece hasta que el usuario borre datos del sitio.
 */
export async function ensureCatalogLoaded(): Promise<Articulo[]> {
  if (memoryCatalog) return memoryCatalog;
  if (catalogLoadPromise) return catalogLoadPromise;

  catalogLoadPromise = (async () => {
    const col = collection(db, "articulos");
    const snap = await getDocs(col);
    memoryCatalog = snapToLista(snap);
    return memoryCatalog;
  })();

  try {
    return await catalogLoadPromise;
  } finally {
    catalogLoadPromise = null;
  }
}

export function filterArticulos(
  catalog: Articulo[],
  query: string
): { items: Articulo[]; totalMatches: number } {
  const q = query.trim();
  if (!q) return { items: [], totalMatches: 0 };

  const palabras = q.toLowerCase().split(/\s+/).filter(Boolean);
  const items: Articulo[] = [];
  let totalMatches = 0;

  for (const item of catalog) {
    const codigo = item.codigo ? item.codigo.toLowerCase() : "";
    const desc = item.desc ? item.desc.toLowerCase() : "";
    const alias = item.alias ? item.alias.toLowerCase() : "";
    const textoCompleto = `${codigo} ${desc} ${alias}`;
    if (!palabras.every((palabra) => textoCompleto.includes(palabra))) continue;

    totalMatches += 1;
    if (items.length < MAX_SEARCH_RESULTS) items.push(item);
  }

  return { items, totalMatches };
}
