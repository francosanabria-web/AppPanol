/** Ubicación tipo 10065C: pañol 1, estantería 0065, posición vertical C. */
export type ParsedUbicacion = {
  panol: number;
  estanteria: string;
  posicion: string;
  raw: string;
};

/**
 * Interpreta cadenas sin separadores: primer dígito 1–4, 3 o 4 dígitos de estantería, letra(s) de posición.
 * La estantería se normaliza a 4 dígitos.
 * Ej.: "10065C" → pañol 1, estantería "0065", posición "C".
 * Ej.: "4000SP" → pañol 4, estantería "0000", posición "SP" (sala de pintura).
 */
export function parseUbicacion(raw: unknown): ParsedUbicacion | null {
  if (raw == null) return null;
  const s = String(raw).trim().replace(/\s+/g, "");
  if (!s) return null;
  const m = s.match(/^([1-4])(\d{3,4})([A-Za-z]+)$/);
  if (!m) return null;
  return {
    panol: Number(m[1]),
    estanteria: m[2].padStart(4, "0"),
    posicion: m[3].toUpperCase(),
    raw: s,
  };
}
