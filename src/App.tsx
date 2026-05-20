import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { collection, doc, getDocs, getDocsFromServer, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { parseUbicacion } from "./parseUbicacion";

export type Articulo = {
  id: string;
  codigo?: string;
  desc?: string;
  alias?: string;
  stock?: string | number;
  ubicacion?: string;
};

type ThemeName = "light" | "dark";

const Colors: Record<
  ThemeName,
  { background: string; card: string; text: string; border: string; primary: string; stock: string; ubic: string; icon: string }
> = {
  light: {
    background: "#ecf0f1",
    card: "white",
    text: "#2c3e50",
    border: "#bdc3c7",
    primary: "#3498db",
    stock: "#27ae60",
    ubic: "#e67e22",
    icon: "#7f8c8d",
  },
  dark: {
    background: "#121212",
    card: "#1e1e1e",
    text: "#ecf0f1",
    border: "#333",
    primary: "#3498db",
    stock: "#2ecc71",
    ubic: "#f39c12",
    icon: "#bdc3c7",
  },
};

const CLAVE_SECRETA = "1379";

type AppCtx = {
  themeName: ThemeName;
  theme: (typeof Colors)["light"];
  isDarkMode: boolean;
  toggleTheme: () => void;
  isModoPanolero: boolean;
  setIsModoPanolero: (v: boolean) => void;
  articulos: Articulo[];
  loading: boolean;
  loadError: string | null;
  refreshArticulos: (opts?: { fromServer?: boolean }) => Promise<void>;
};

const AppContext = createContext<AppCtx | null>(null);

function useApp() {
  const v = useContext(AppContext);
  if (!v) throw new Error("AppContext");
  return v;
}

function IconSearch({ active }: { active: boolean }) {
  const c = active ? "var(--primary)" : "var(--icon)";
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3-3" strokeLinecap="round" />
    </svg>
  );
}

function IconShelf({ active }: { active: boolean }) {
  const c = active ? "var(--primary)" : "var(--icon)";
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2">
      <path d="M4 6h16M4 12h16M4 18h10" strokeLinecap="round" />
      <path d="M18 16v4M16 18h4" strokeLinecap="round" />
    </svg>
  );
}

function IconSettings({ active }: { active: boolean }) {
  const c = active ? "var(--primary)" : "var(--icon)";
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path
        d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BuscadorScreen() {
  const { theme, isModoPanolero, articulos, loading, refreshArticulos } = useApp();
  const [filtered, setFiltered] = useState<Articulo[]>([]);
  const [searchText, setSearchText] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [itemEditando, setItemEditando] = useState<Articulo | null>(null);
  const [nuevoAlias, setNuevoAlias] = useState("");

  useEffect(() => {
    setFiltered(articulos);
  }, [articulos]);

  const handleSearch = (text: string) => {
    setSearchText(text);
    if (text.trim() === "") {
      setFiltered(articulos);
      return;
    }
    const palabrasBuscadas = text.toLowerCase().trim().split(/\s+/);
    const filtrados = articulos.filter((item) => {
      const codigo = item.codigo ? item.codigo.toLowerCase() : "";
      const desc = item.desc ? item.desc.toLowerCase() : "";
      const alias = item.alias ? item.alias.toLowerCase() : "";
      const textoCompleto = `${codigo} ${desc} ${alias}`;
      return palabrasBuscadas.every((palabra) => textoCompleto.includes(palabra));
    });
    setFiltered(filtrados);
  };

  const abrirModalAlias = (item: Articulo) => {
    setItemEditando(item);
    setNuevoAlias(item.alias || "");
    setModalVisible(true);
  };

  const guardarAlias = async () => {
    if (!itemEditando) return;
    const articuloRef = doc(db, "articulos", itemEditando.id);
    await updateDoc(articuloRef, { alias: nuevoAlias.trim() });
    setModalVisible(false);
    setItemEditando(null);
    await refreshArticulos({ fromServer: true });
  };

  if (loading) {
    return (
      <div className="screen centro">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="header-row">
        <h1 className="title">Pañol</h1>
      </div>

      <input
        className="input-search"
        placeholder="Buscar por código, descripción o alias..."
        value={searchText}
        onChange={(e) => handleSearch(e.target.value)}
      />

      {filtered.length === 0 ? (
        <p className="empty">No hay artículos.</p>
      ) : (
        filtered.map((item) => (
          <div key={item.id} className="card">
            <div className="row-between">
              <span className="codigo">{item.codigo}</span>
              {isModoPanolero && (
                <button type="button" className="btn-alias" onClick={() => abrirModalAlias(item)}>
                  ✎ Alias
                </button>
              )}
            </div>
            <div className="desc">{item.desc}</div>
            {item.alias ? <div className="alias">🗣️ {item.alias}</div> : null}
            <div className="datos">
              <span className="stock">Stock: {item.stock}</span>
              <span className="ubic">{item.ubicacion}</span>
            </div>
          </div>
        ))
      )}

      {modalVisible && (
        <div className="modal-backdrop" role="presentation" onClick={() => setModalVisible(false)}>
          <div className="modal" role="dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Asignar nombre fácil</div>
            <p className="hint" style={{ marginBottom: 12 }}>
              {itemEditando?.desc}
            </p>
            <input
              className="input-search"
              style={{ marginBottom: 0 }}
              placeholder="Ej: Manguera negra chica"
              value={nuevoAlias}
              onChange={(e) => setNuevoAlias(e.target.value)}
              autoFocus
            />
            <div className="modal-actions">
              <button type="button" className="btn btn-cancel" onClick={() => setModalVisible(false)}>
                Cancelar
              </button>
              <button type="button" className="btn btn-primary" onClick={() => void guardarAlias()}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ConfigScreen() {
  const {
    isDarkMode,
    toggleTheme,
    isModoPanolero,
    setIsModoPanolero,
    loadError,
  } = useApp();
  const [modalClaveVisible, setModalClaveVisible] = useState(false);
  const [claveIngresada, setClaveIngresada] = useState("");

  const handleTogglePanolero = () => {
    if (isModoPanolero) {
      setIsModoPanolero(false);
    } else {
      setModalClaveVisible(true);
    }
  };

  const verificarClave = () => {
    if (claveIngresada === CLAVE_SECRETA) {
      setIsModoPanolero(true);
      setModalClaveVisible(false);
      setClaveIngresada("");
      window.alert("Acceso Autorizado. Modo Pañolero activado.");
    } else {
      window.alert("Acceso Denegado. La clave ingresada es incorrecta.");
      setClaveIngresada("");
    }
  };

  return (
    <div className="screen">
      <h1 className="title" style={{ marginTop: 15, marginBottom: 15 }}>
        Configuración
      </h1>

      {loadError ? <p className="empty" style={{ marginTop: 0 }}>{loadError}</p> : null}

      <div className="card-config">
        <div className="config-row">
          <div className="row-between" style={{ width: "100%", gap: 12 }}>
            <span className="desc" style={{ margin: 0, fontSize: 16 }}>
              {isDarkMode ? "🌙" : "☀️"} Modo oscuro
            </span>
            <input
              type="checkbox"
              className="switch"
              checked={isDarkMode}
              onChange={() => toggleTheme()}
              aria-label="Modo oscuro"
            />
          </div>
        </div>
        <div className="config-row">
          <div style={{ flex: 1 }}>
            <div className="desc" style={{ margin: 0, fontSize: 16 }}>
              {isModoPanolero ? "🔓" : "🔒"} Modo Pañolero
            </div>
            <div className="hint">Habilita la edición de nombres/alias y la pestaña Estanterías.</div>
          </div>
          <input
            type="checkbox"
            className="switch"
            checked={isModoPanolero}
            onChange={handleTogglePanolero}
            aria-label="Modo Pañolero"
          />
        </div>
      </div>

      <p className="empty" style={{ marginTop: 40 }}>
        App web — Pañol
      </p>

      {modalClaveVisible && (
        <div className="modal-backdrop" role="presentation" onClick={() => setModalClaveVisible(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Seguridad</div>
            <p className="hint" style={{ marginBottom: 12 }}>
              Ingrese la clave de supervisor para habilitar la edición:
            </p>
            <input
              className="input-search"
              style={{ textAlign: "center", letterSpacing: 5, marginBottom: 0 }}
              placeholder="****"
              type="password"
              inputMode="numeric"
              value={claveIngresada}
              onChange={(e) => setClaveIngresada(e.target.value)}
              autoFocus
            />
            <div className="modal-actions" style={{ justifyContent: "space-between" }}>
              <button
                type="button"
                className="btn btn-cancel"
                onClick={() => {
                  setModalClaveVisible(false);
                  setClaveIngresada("");
                }}
              >
                Cancelar
              </button>
              <button type="button" className="btn btn-stock" onClick={verificarClave}>
                Desbloquear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function sortEstanterias(a: string, b: string) {
  return Number(a) - Number(b);
}

function sortPosiciones(a: string, b: string) {
  return a.localeCompare(b, "es", { sensitivity: "base" });
}

function EstanteriasScreen() {
  const { articulos, loading } = useApp();
  const [estSearch, setEstSearch] = useState("");

  const articulosFiltrados = useMemo(() => {
    const q = estSearch.trim().toLowerCase();
    if (!q) return articulos;
    const palabras = q.split(/\s+/).filter(Boolean);
    return articulos.filter((art) => {
      const p = parseUbicacion(art.ubicacion);
      if (!p) return false;
      const hay = `${p.raw} ${p.panol} ${p.estanteria} ${p.posicion}`.toLowerCase();
      return palabras.every((w) => hay.includes(w));
    });
  }, [articulos, estSearch]);

  const tree = useMemo(() => {
    const t: Record<number, Record<string, Record<string, Articulo[]>>> = {};
    for (const art of articulosFiltrados) {
      const p = parseUbicacion(art.ubicacion);
      if (!p) continue;
      if (!t[p.panol]) t[p.panol] = {};
      if (!t[p.panol][p.estanteria]) t[p.panol][p.estanteria] = {};
      if (!t[p.panol][p.estanteria][p.posicion]) t[p.panol][p.estanteria][p.posicion] = [];
      t[p.panol][p.estanteria][p.posicion].push(art);
    }
    return t;
  }, [articulosFiltrados]);

  const panoles = useMemo(() => Object.keys(tree).map(Number).sort((a, b) => a - b), [tree]);

  if (loading) {
    return (
      <div className="screen centro">
        <div className="spinner" />
      </div>
    );
  }

  const emptyMsg = estSearch.trim()
    ? "Ningún artículo coincide con la búsqueda en formato de estantería."
    : "No hay artículos con ubicación en formato pañol/estantería/posición (ej. 10065C o 4000SP).";

  if (panoles.length === 0) {
    return (
      <div className="screen">
        <div className="header-row">
          <h1 className="title">Estanterías</h1>
        </div>
        <input
          className="input-search"
          placeholder="Buscar ubicación (ej. 10065C, 4000SP, pañol 2…)…"
          value={estSearch}
          onChange={(e) => setEstSearch(e.target.value)}
        />
        <p className="empty">{emptyMsg}</p>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="header-row">
        <h1 className="title">Estanterías</h1>
      </div>
      <input
        className="input-search"
        placeholder="Buscar ubicación (ej. 10065C, 4000SP, 0065, SP)…"
        value={estSearch}
        onChange={(e) => setEstSearch(e.target.value)}
      />
      <p className="hint" style={{ marginBottom: 12 }}>
        Formato: primer dígito = pañol (1–4), cuatro dígitos = estantería, letras = altura (ej. C o SP). Podés usar varias palabras.
      </p>

      {panoles.map((panol) => {
        const ests = tree[panol];
        const estKeys = Object.keys(ests).sort(sortEstanterias);
        const totalPanol = estKeys.reduce(
          (acc, e) => acc + Object.values(ests[e]).reduce((a2, arr) => a2 + arr.length, 0),
          0
        );
        return (
          <details key={panol} className="details-nested">
            <summary>
              Pañol {panol} — {totalPanol} artículo{totalPanol === 1 ? "" : "s"}
            </summary>
            <div className="details-body">
              {estKeys.map((est) => {
                const posMap = ests[est];
                const posKeys = Object.keys(posMap).sort(sortPosiciones);
                const totalEst = posKeys.reduce((acc, pk) => acc + posMap[pk].length, 0);
                return (
                  <details key={`${panol}-${est}`} className="details-nested">
                    <summary>
                      Estantería {est} — {totalEst} artículo{totalEst === 1 ? "" : "s"}
                    </summary>
                    <div className="details-body">
                      {posKeys.map((pos) => {
                        const items = posMap[pos];
                        const n = items.length;
                        return (
                          <details key={`${panol}-${est}-${pos}`} className="details-nested">
                            <summary>
                              Posición {pos} — {n} artículo{n === 1 ? "" : "s"}
                            </summary>
                            <div className="details-body">
                              {items.map((item) => (
                                <div key={item.id} className="mini-card">
                                  <div className="row-between">
                                    <span className="codigo">{item.codigo}</span>
                                    <span className="stock">Stock: {item.stock}</span>
                                  </div>
                                  <div className="desc" style={{ fontSize: 15 }}>
                                    {item.desc}
                                  </div>
                                  <div className="ubic">{item.ubicacion}</div>
                                </div>
                              ))}
                            </div>
                          </details>
                        );
                      })}
                    </div>
                  </details>
                );
              })}
            </div>
          </details>
        );
      })}
    </div>
  );
}

type TabId = "buscador" | "estanterias" | "config";

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isModoPanolero, setIsModoPanolero] = useState(false);
  const [tab, setTab] = useState<TabId>("buscador");
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const themeName: ThemeName = isDarkMode ? "dark" : "light";
  const theme = Colors[themeName];

  const refreshArticulos = useCallback(async (opts?: { fromServer?: boolean }) => {
    setLoadError(null);
    try {
      const col = collection(db, "articulos");
      const snap = opts?.fromServer ? await getDocsFromServer(col) : await getDocs(col);
      const lista: Articulo[] = [];
      snap.forEach((d) => lista.push({ id: d.id, ...d.data() } as Articulo));
      setArticulos(lista);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Error al cargar artículos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = themeName;
  }, [themeName]);

  useEffect(() => {
    void refreshArticulos();
  }, [refreshArticulos]);

  useEffect(() => {
    if (!isModoPanolero && tab === "estanterias") setTab("buscador");
  }, [isModoPanolero, tab]);

  const ctx: AppCtx = {
    themeName,
    theme,
    isDarkMode,
    toggleTheme: () => setIsDarkMode((v) => !v),
    isModoPanolero,
    setIsModoPanolero,
    articulos,
    loading,
    loadError,
    refreshArticulos,
  };

  return (
    <AppContext.Provider value={ctx}>
      <div className="app-shell">
        {tab === "buscador" ? <BuscadorScreen /> : null}
        {tab === "estanterias" ? <EstanteriasScreen /> : null}
        {tab === "config" ? <ConfigScreen /> : null}

        <nav className="tabbar">
          <button type="button" className={`tab ${tab === "buscador" ? "active" : ""}`} onClick={() => setTab("buscador")}>
            <IconSearch active={tab === "buscador"} />
            Buscador
          </button>
          {isModoPanolero ? (
            <button
              type="button"
              className={`tab ${tab === "estanterias" ? "active" : ""}`}
              onClick={() => setTab("estanterias")}
            >
              <IconShelf active={tab === "estanterias"} />
              Estanterías
            </button>
          ) : null}
          <button type="button" className={`tab ${tab === "config" ? "active" : ""}`} onClick={() => setTab("config")}>
            <IconSettings active={tab === "config"} />
            Ajustes
          </button>
        </nav>
      </div>
    </AppContext.Provider>
  );
}
