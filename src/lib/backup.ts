// ── Backup em arquivo (exportar / importar) ──────────────────────
// Formato do arquivo:
//   { app: "apurado", schemaVersion: 2, exportadoEm: "<ISO>", dados: Dados }
// `schemaVersion` acompanha `Dados.versao`. Se o formato dos dados mudar,
// suba os dois juntos e trate a migração em `validarBackup`.
//
// Também aceita o formato antigo (o objeto `Dados` cru, sem envelope),
// que era o que o botão "Baixar .json" gerava antes.

import type { Dados } from "./types";
import { keyOf } from "./format";
import { normalizar } from "./storage";

export const SCHEMA_VERSION = 2;
const APP = "apurado";

export interface BackupArquivo {
  app: typeof APP;
  schemaVersion: number;
  exportadoEm: string;
  dados: Dados;
}

export interface ResumoBackup {
  semanas: number;
  entradas: number;
  despesas: number;
  totalDespesas: number;
  blocos: number;
  /** Primeira e última semana (segunda-feira, "AAAA-MM-DD"), ou null sem semanas. */
  periodo: { de: string; ate: string } | null;
}

export type ResultadoValidacao =
  | { ok: true; dados: Dados; resumo: ResumoBackup; schemaVersion: number; exportadoEm: string | null; formatoAntigo: boolean }
  | { ok: false; erro: string };

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const RE_SEMANA = /^\d{4}-\d{2}-\d{2}$/;

export const criarBackup = (dados: Dados, agora = new Date()): BackupArquivo => ({
  app: APP,
  schemaVersion: SCHEMA_VERSION,
  exportadoEm: agora.toISOString(),
  dados,
});

export const nomeArquivoBackup = (agora = new Date()) => `apurado-backup-${keyOf(agora)}.json`;

export const resumir = (d: Dados): ResumoBackup => {
  const chaves = Object.keys(d.weeks).sort();
  let entradas = 0;
  let despesas = 0;
  let totalDespesas = 0;
  for (const w of Object.values(d.weeks)) {
    for (const l of w.lanc) {
      if (l.tipo === "entrada") entradas++;
      else {
        despesas++;
        totalDespesas += l.valor;
      }
    }
  }
  return {
    semanas: chaves.length,
    entradas,
    despesas,
    totalDespesas,
    blocos: d.config.blocos.length,
    periodo: chaves.length ? { de: chaves[0], ate: chaves[chaves.length - 1] } : null,
  };
};

/** Confere a estrutura dos dados (antes de normalizar). Devolve a mensagem do primeiro problema, ou null. */
const problemaNosDados = (d: unknown): string | null => {
  if (!isObj(d)) return "Os dados do backup estão vazios ou corrompidos.";
  if (d.versao !== undefined && d.versao !== SCHEMA_VERSION && d.versao !== 1)
    return `Versão de dados desconhecida (${String(d.versao)}).`;
  if (!isObj(d.weeks)) return "O backup não tem a lista de semanas.";
  if (d.config !== undefined && !isObj(d.config)) return "As configurações do backup estão corrompidas.";
  if (isObj(d.config) && d.config.blocos !== undefined && !Array.isArray(d.config.blocos))
    return "A lista de blocos do backup está corrompida.";

  for (const [k, w] of Object.entries(d.weeks)) {
    if (!RE_SEMANA.test(k) || Number.isNaN(new Date(`${k}T00:00:00`).getTime())) return `Semana com data inválida: "${k}".`;
    if (!isObj(w)) return `A semana ${k} está corrompida.`;
    if (w.lanc === undefined) continue;
    if (!Array.isArray(w.lanc)) return `Os lançamentos da semana ${k} estão corrompidos.`;
    for (const l of w.lanc) {
      if (!isObj(l) || (l.tipo !== "entrada" && l.tipo !== "gasto"))
        return `Lançamento com tipo inválido na semana ${k}.`;
      if (typeof l.valor !== "number" || !Number.isFinite(l.valor)) return `Lançamento com valor inválido na semana ${k}.`;
    }
  }
  return null;
};

/** Lê o texto de um arquivo de backup e diz se dá pra importar. Nunca lança. */
export const validarBackup = (txt: string): ResultadoValidacao => {
  let raw: unknown;
  try {
    raw = JSON.parse(txt.replace(/^﻿/, "").trim());
  } catch {
    return { ok: false, erro: "O arquivo não é um JSON válido." };
  }
  if (!isObj(raw)) return { ok: false, erro: "O arquivo não é um backup do Apurado." };

  const temEnvelope = "schemaVersion" in raw || "dados" in raw || "app" in raw;
  let schemaVersion: number;
  let exportadoEm: string | null = null;
  let dadosBrutos: unknown;

  if (temEnvelope) {
    if (raw.app !== APP) return { ok: false, erro: "O arquivo não é um backup do Apurado." };
    const v = raw.schemaVersion;
    if (typeof v !== "number" || !Number.isInteger(v) || v < 1)
      return { ok: false, erro: "O backup não informa uma versão válida." };
    if (v > SCHEMA_VERSION)
      return { ok: false, erro: `Este backup é de uma versão mais nova do app (v${v}). Atualiza o Apurado e tenta de novo.` };
    schemaVersion = v;
    exportadoEm = typeof raw.exportadoEm === "string" ? raw.exportadoEm : null;
    dadosBrutos = raw.dados;
  } else if ("weeks" in raw) {
    // Formato antigo: o próprio objeto Dados.
    schemaVersion = typeof raw.versao === "number" ? raw.versao : 1;
    if (schemaVersion > SCHEMA_VERSION)
      return { ok: false, erro: `Este backup é de uma versão mais nova do app (v${schemaVersion}). Atualiza o Apurado e tenta de novo.` };
    dadosBrutos = raw;
  } else {
    return { ok: false, erro: "O arquivo não é um backup do Apurado." };
  }

  const problema = problemaNosDados(dadosBrutos);
  if (problema) return { ok: false, erro: problema };

  const dados = normalizar(dadosBrutos);
  return { ok: true, dados, resumo: resumir(dados), schemaVersion, exportadoEm, formatoAntigo: !temEnvelope };
};

// ── Saída do arquivo: compartilhar (iPhone) ou baixar ──

export type ResultadoExportacao = "compartilhado" | "baixado" | "cancelado";

const baixar = (arquivo: File) => {
  const url = URL.createObjectURL(arquivo);
  const a = document.createElement("a");
  a.href = url;
  a.download = arquivo.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/**
 * Gera o arquivo e abre a folha de compartilhar (no iPhone: "Salvar em Arquivos",
 * AirDrop, WhatsApp…). Sem suporte a compartilhar arquivos, baixa direto.
 * Chamar direto no clique: o Safari exige o gesto do usuário para `navigator.share`.
 */
export const exportarBackup = async (dados: Dados, agora = new Date()): Promise<ResultadoExportacao> => {
  const json = JSON.stringify(criarBackup(dados, agora), null, 2);
  const arquivo = new File([json], nomeArquivoBackup(agora), { type: "application/json" });

  if (typeof navigator.share === "function" && navigator.canShare?.({ files: [arquivo] })) {
    try {
      await navigator.share({ files: [arquivo], title: arquivo.name });
      return "compartilhado";
    } catch (e) {
      // Fechou a folha de compartilhar: não baixa por cima.
      if (e instanceof DOMException && e.name === "AbortError") return "cancelado";
      // Outro erro (ex.: NotAllowedError): cai para o download.
    }
  }
  baixar(arquivo);
  return "baixado";
};
