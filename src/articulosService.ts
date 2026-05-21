import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getDocsFromServer,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Articulo } from "./types";

const CATALOG_VERSION_KEY = "panol-catalog-version";

let memoryCatalog: Articulo[] | null = null;
let catalogLoadPromise: Promise<Articulo[]> | null = null;

function snapToLista(
  snap: Awaited<ReturnType<typeof getDocs>>
): Articulo[] {
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

/** 1 lectura: documento de versión del catálogo (lo actualiza la app de escritorio). */
export async function fetchRemoteCatalogVersion(): Promise<number> {
  try {
    const ref = doc(db, "config", "catalogo");
    const snap = await getDocFromServer(ref);
    const v = snap.data()?.version;
    return typeof v === "number" ? v : Number(v) || 0;
  } catch {
    return 0;
  }
}

function getLocalCatalogVersion(): number {
  return Number(localStorage.getItem(CATALOG_VERSION_KEY) ?? "0") || 0;
}

function setLocalCatalogVersion(version: number): void {
  try {
    localStorage.setItem(CATALOG_VERSION_KEY, String(version));
  } catch {
    /* ignore */
  }
}

/**
 * Carga el catálogo solo cuando hace falta (búsqueda, estanterías o actualizar manual).
 * Si la versión local coincide con la nube, intenta usar caché de Firestore (0 lecturas de documentos).
 */
export async function ensureCatalogLoaded(opts?: {
  forceServer?: boolean;
}): Promise<Articulo[]> {
  if (opts?.forceServer) memoryCatalog = null;

  if (memoryCatalog && !opts?.forceServer) return memoryCatalog;
  if (catalogLoadPromise && !opts?.forceServer) return catalogLoadPromise;

  catalogLoadPromise = (async () => {
    const remoteVersion = await fetchRemoteCatalogVersion();
    const localVersion = getLocalCatalogVersion();
    const versionChanged = remoteVersion !== localVersion;

    const col = collection(db, "articulos");
    const snap =
      opts?.forceServer || versionChanged
        ? await getDocsFromServer(col)
        : await getDocs(col);

    memoryCatalog = snapToLista(snap);
    setLocalCatalogVersion(remoteVersion);
    return memoryCatalog;
  })();

  try {
    return await catalogLoadPromise;
  } finally {
    catalogLoadPromise = null;
  }
}

export function filterArticulos(catalog: Articulo[], query: string): Articulo[] {
  const q = query.trim();
  if (!q) return [];
  const palabras = q.toLowerCase().split(/\s+/).filter(Boolean);
  return catalog.filter((item) => {
    const codigo = item.codigo ? item.codigo.toLowerCase() : "";
    const desc = item.desc ? item.desc.toLowerCase() : "";
    const alias = item.alias ? item.alias.toLowerCase() : "";
    const textoCompleto = `${codigo} ${desc} ${alias}`;
    return palabras.every((palabra) => textoCompleto.includes(palabra));
  });
}

/** Tras guardar alias: 1 lectura del documento, no del catálogo completo. */
export async function fetchArticuloById(id: string): Promise<Articulo | null> {
  const ref = doc(db, "articulos", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Articulo;
}
