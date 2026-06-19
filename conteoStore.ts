const STORAGE_KEY = "panol-conteo-actual";

export type ConteoMap = Record<string, string>;

let cache: ConteoMap | null = null;

function read(): ConteoMap {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    cache = raw ? (JSON.parse(raw) as ConteoMap) : {};
  } catch {
    cache = {};
  }
  return cache;
}

function persist(map: ConteoMap): void {
  cache = map;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* almacenamiento lleno o modo privado */
  }
}

export function getConteoMap(): ConteoMap {
  return { ...read() };
}

export function getConteo(id: string): string {
  return read()[id] ?? "";
}

export function setConteo(id: string, valor: string): void {
  const map = { ...read() };
  if (valor.trim() === "") {
    delete map[id];
  } else {
    map[id] = valor;
  }
  persist(map);
}

export function contarCargados(): number {
  return Object.keys(read()).length;
}

export function limpiarConteo(): void {
  persist({});
}
