import type { Bloco, Config, Dados, Lancamento, Semana } from "./types";
import { keyOf, pad } from "./format";

const KEY = "apurado:v1";

const DIA_POR_ID: Record<string, number> = { sex: 4, sab: 5, dom: 6 };

export const defaultBlocos = (): Bloco[] => [
  { id: "sex", nome: "Sexta à noite", dia: 4 },
  { id: "sab", nome: "Sábado à noite", dia: 5 },
  { id: "dom", nome: "Domingo de manhã", dia: 6 },
];

export const defaultConfig = (): Config => ({
  metaSemanal: 1000,
  metaBruta: 1600,
  metaMensal: null,
  trajetoAtivo: true,
  trajetoDias: [true, true, true, true, true, false, false],
  blocos: defaultBlocos(),
});

export const defaultData = (): Dados => ({ versao: 2, config: defaultConfig(), weeks: {} });

export const defaultWeek = (): Semana => ({
  ida: Array(7).fill(false),
  volta: Array(7).fill(false),
  blocos: {},
  lanc: [],
});

// ── Normalização (aceita o formato antigo do artifact e backups parciais) ──

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const numPos = (v: unknown, fb: number) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : fb);
const bool7 = (v: unknown, fb: boolean[]) =>
  Array.from({ length: 7 }, (_, i) => (Array.isArray(v) && i < v.length ? !!v[i] : fb[i]));

const normBloco = (v: unknown): Bloco | null => {
  if (!isObj(v) || typeof v.nome !== "string" || !v.nome.trim()) return null;
  const id = typeof v.id === "string" && v.id ? v.id : `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  let dia: number | null = null;
  if (typeof v.dia === "number" && v.dia >= 0 && v.dia <= 6) dia = Math.floor(v.dia);
  else if (v.dia === undefined && id in DIA_POR_ID) dia = DIA_POR_ID[id];
  return { id, nome: v.nome, dia };
};

const normConfig = (v: unknown): Config => {
  const d = defaultConfig();
  if (!isObj(v)) return d;
  return {
    metaSemanal: numPos(v.metaSemanal, d.metaSemanal),
    metaBruta: numPos(v.metaBruta, d.metaBruta),
    metaMensal: typeof v.metaMensal === "number" && v.metaMensal > 0 ? v.metaMensal : null,
    trajetoAtivo: typeof v.trajetoAtivo === "boolean" ? v.trajetoAtivo : d.trajetoAtivo,
    trajetoDias: bool7(v.trajetoDias, d.trajetoDias),
    blocos: Array.isArray(v.blocos) ? v.blocos.map(normBloco).filter((b): b is Bloco => b !== null) : d.blocos,
  };
};

const normLanc = (v: unknown): Lancamento | null => {
  if (!isObj(v)) return null;
  if (v.tipo !== "entrada" && v.tipo !== "gasto") return null;
  if (typeof v.valor !== "number" || !Number.isFinite(v.valor)) return null;
  const ts = typeof v.ts === "number" ? v.ts : Date.now();
  const id = typeof v.id === "string" ? v.id : `${ts}-${Math.random().toString(36).slice(2, 7)}`;
  return { id, tipo: v.tipo, valor: v.valor, ts };
};

const normWeek = (v: unknown): Semana => {
  const d = defaultWeek();
  if (!isObj(v)) return d;
  const blocos: Record<string, boolean> = {};
  if (isObj(v.blocos)) for (const [k, b] of Object.entries(v.blocos)) blocos[k] = !!b;
  return {
    ida: bool7(v.ida, d.ida),
    volta: bool7(v.volta, d.volta),
    blocos,
    lanc: Array.isArray(v.lanc) ? v.lanc.map(normLanc).filter((l): l is Lancamento => l !== null) : [],
  };
};

export const normalizar = (raw: unknown): Dados => {
  if (!isObj(raw)) return defaultData();
  const weeks: Record<string, Semana> = {};
  if (isObj(raw.weeks)) {
    for (const [k, w] of Object.entries(raw.weeks)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(k)) weeks[k] = normWeek(w);
    }
  }
  return { versao: 2, config: normConfig(raw.config), weeks };
};

// ── localStorage ──

export const carregar = (): Dados => {
  let txt: string | null = null;
  try {
    txt = localStorage.getItem(KEY);
    return txt ? normalizar(JSON.parse(txt)) : defaultData();
  } catch {
    // Guarda o conteúdo ilegível antes que o próximo salvar o sobrescreva.
    try {
      if (txt) localStorage.setItem(`${KEY}:corrompido:${Date.now()}`, txt);
    } catch {
      /* sem espaço: segue com dados vazios */
    }
    return defaultData();
  }
};

export const salvar = (d: Dados): boolean => {
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
    return true;
  } catch {
    return false;
  }
};

/** Pede ao navegador para não apagar os dados sob pressão de espaço (PWA instalado costuma ganhar). */
export const pedirPersistencia = () => {
  try {
    navigator.storage?.persist?.().catch(() => {});
  } catch {
    /* navegador sem suporte */
  }
};

// ── Backup em JSON ──

export const exportarJSON = (d: Dados) => JSON.stringify(d, null, 2);

/** Lança erro se o texto não for um backup válido. */
export const importarJSON = (txt: string): Dados => {
  const parsed: unknown = JSON.parse(txt.trim());
  if (!isObj(parsed) || !isObj(parsed.weeks)) throw new Error("formato");
  return normalizar(parsed);
};

export const baixarBackup = (d: Dados) => {
  const hoje = new Date();
  const nome = `apurado-backup-${keyOf(hoje)}-${pad(hoje.getHours())}${pad(hoje.getMinutes())}.json`;
  const url = URL.createObjectURL(new Blob([exportarJSON(d)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
