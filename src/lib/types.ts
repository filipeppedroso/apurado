export type TipoLanc = "entrada" | "gasto";

export interface Lancamento {
  id: string;
  tipo: TipoLanc;
  valor: number;
  ts: number;
}

/** Bloco de pico. `dia`: 0 = segunda … 6 = domingo; null = qualquer dia. */
export interface Bloco {
  id: string;
  nome: string;
  dia: number | null;
}

export interface Config {
  metaSemanal: number;
  metaBruta: number;
  /** null = calculada sozinha (semanal × 52 ÷ 12). */
  metaMensal: number | null;
  trajetoAtivo: boolean;
  /** 7 posições, segunda a domingo: dias em que o trajeto aparece. */
  trajetoDias: boolean[];
  blocos: Bloco[];
}

export interface Semana {
  /** 7 posições, segunda a domingo. */
  ida: boolean[];
  volta: boolean[];
  blocos: Record<string, boolean>;
  lanc: Lancamento[];
}

export interface Dados {
  versao: 2;
  config: Config;
  /** Chave = segunda-feira da semana, "AAAA-MM-DD". */
  weeks: Record<string, Semana>;
}
