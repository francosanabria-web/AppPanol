import type { Articulo } from "./types";
import type { ConteoMap } from "./conteoStore";

/** Convierte stock/conteo (texto o número, con coma o punto) a número seguro. */
export function aNumero(valor: unknown): number {
  if (valor == null) return 0;
  const n = Number(String(valor).replace(",", ".").trim());
  return Number.isFinite(n) ? n : 0;
}

export type ModoExport = "parcial" | "final";

type Fila = (string | number)[];

/**
 * Arma las filas del conteo.
 * - parcial: solo artículos con conteo cargado.
 * - final: todos los artículos recibidos (los no contados quedan con conteo/diferencia vacíos).
 */
function construirFilas(
  articulos: Articulo[],
  conteo: ConteoMap,
  modo: ModoExport
): Fila[] {
  const filas: Fila[] = [["Codigo", "Descripcion", "Ubicacion", "Stock", "Conteo", "Diferencia"]];

  for (const art of articulos) {
    const tieneConteo = Object.prototype.hasOwnProperty.call(conteo, art.id);
    if (modo === "parcial" && !tieneConteo) continue;

    const stockNum = aNumero(art.stock);
    const conteoNum = tieneConteo ? aNumero(conteo[art.id]) : "";
    const diferencia = tieneConteo ? aNumero(conteo[art.id]) - stockNum : "";

    filas.push([
      art.codigo ?? "",
      art.desc ?? "",
      art.ubicacion ?? "",
      stockNum,
      conteoNum,
      diferencia,
    ]);
  }

  return filas;
}

function descargar(nombre: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/**
 * Genera un .xlsx y lo comparte con el menú nativo del celular (WhatsApp, Gmail, Drive…).
 * Si el dispositivo no soporta compartir archivos, lo descarga.
 */
export async function exportarYCompartir(
  prefijo: string,
  articulos: Articulo[],
  conteo: ConteoMap,
  modo: ModoExport
): Promise<void> {
  const XLSX = await import("xlsx");
  const filas = construirFilas(articulos, conteo, modo);
  const ws = XLSX.utils.aoa_to_sheet(filas);
  ws["!cols"] = [
    { wch: 14 },
    { wch: 40 },
    { wch: 12 },
    { wch: 10 },
    { wch: 10 },
    { wch: 12 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Conteo");

  const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  const blob = new Blob([buffer], { type: XLSX_MIME });
  const nombre = nombreArchivo(prefijo);

  try {
    const file = new File([blob], nombre, { type: XLSX_MIME });
    const nav = navigator as Navigator & {
      canShare?: (data?: ShareData) => boolean;
    };
    if (nav.canShare && nav.canShare({ files: [file] })) {
      await nav.share({
        files: [file],
        title: "Conteo de inventario",
        text: "Adjunto el conteo de inventario en Excel.",
      });
      return;
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return;
  }

  descargar(nombre, blob);
}

export function nombreArchivo(prefijo: string): string {
  const f = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${prefijo}_${f.getFullYear()}${p(f.getMonth() + 1)}${p(f.getDate())}_${p(f.getHours())}${p(f.getMinutes())}.xlsx`;
}
