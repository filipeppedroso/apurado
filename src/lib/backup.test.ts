import { describe, expect, it } from "vitest";
import { SCHEMA_VERSION, criarBackup, nomeArquivoBackup, resumir, validarBackup } from "./backup";
import { defaultData } from "./storage";
import type { Dados } from "./types";

const dadosExemplo = (): Dados => {
  const d = defaultData();
  d.weeks["2026-11-02"] = {
    ida: Array(7).fill(false),
    volta: Array(7).fill(false),
    blocos: { sex: true },
    lanc: [
      { id: "a", tipo: "entrada", valor: 250, ts: 1 },
      { id: "b", tipo: "gasto", valor: 80.5, ts: 2 },
    ],
  };
  d.weeks["2026-10-26"] = {
    ida: Array(7).fill(true),
    volta: Array(7).fill(false),
    blocos: {},
    lanc: [{ id: "c", tipo: "gasto", valor: 19.5, ts: 3 }],
  };
  return d;
};

const envelope = (patch: Record<string, unknown> = {}) =>
  JSON.stringify({ ...criarBackup(dadosExemplo(), new Date("2026-11-10T12:00:00Z")), ...patch });

const erroDe = (txt: string) => {
  const r = validarBackup(txt);
  if (r.ok) throw new Error("esperava falha, mas validou");
  return r.erro;
};

describe("validarBackup — arquivo válido", () => {
  it("aceita o que o próprio app exporta e devolve os mesmos dados", () => {
    const r = validarBackup(envelope());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.dados).toEqual(dadosExemplo());
    expect(r.schemaVersion).toBe(SCHEMA_VERSION);
    expect(r.exportadoEm).toBe("2026-11-10T12:00:00.000Z");
    expect(r.formatoAntigo).toBe(false);
  });

  it("monta o resumo de semanas, despesas e blocos", () => {
    const r = validarBackup(envelope());
    if (!r.ok) throw new Error(r.erro);
    expect(r.resumo).toEqual({
      semanas: 2,
      entradas: 1,
      despesas: 2,
      totalDespesas: 100,
      blocos: 3,
      periodo: { de: "2026-10-26", ate: "2026-11-02" },
    });
  });

  it("aceita o formato antigo (Dados cru, sem envelope)", () => {
    const r = validarBackup(JSON.stringify(dadosExemplo()));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.formatoAntigo).toBe(true);
    expect(r.exportadoEm).toBeNull();
    expect(r.resumo.semanas).toBe(2);
  });

  it("aceita o formato do artifact original (sem versao nem config)", () => {
    const r = validarBackup(JSON.stringify({ weeks: { "2026-01-05": { lanc: [{ tipo: "entrada", valor: 10 }] } } }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.schemaVersion).toBe(1);
    expect(r.dados.config.blocos).toHaveLength(3); // blocos padrão
    expect(r.resumo.entradas).toBe(1);
  });

  it("ignora BOM e espaços em volta do JSON", () => {
    expect(validarBackup(`﻿  ${envelope()}\n`).ok).toBe(true);
  });

  it("aceita backup sem nenhuma semana", () => {
    const r = validarBackup(JSON.stringify(criarBackup(defaultData())));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.resumo.periodo).toBeNull();
  });
});

describe("validarBackup — versão", () => {
  it("recusa versão mais nova que a do app", () => {
    expect(erroDe(envelope({ schemaVersion: SCHEMA_VERSION + 1 }))).toMatch(/versão mais nova/);
  });

  it("recusa formato antigo com versao mais nova", () => {
    expect(erroDe(JSON.stringify({ ...dadosExemplo(), versao: 99 }))).toMatch(/versão mais nova/);
  });

  it.each([["2"], [0], [-1], [1.5], [null]])("recusa schemaVersion inválida: %j", (v) => {
    expect(erroDe(envelope({ schemaVersion: v }))).toMatch(/versão válida/);
  });

  it("recusa envelope sem schemaVersion", () => {
    const { schemaVersion: _, ...semVersao } = criarBackup(dadosExemplo());
    expect(erroDe(JSON.stringify(semVersao))).toMatch(/versão válida/);
  });
});

describe("validarBackup — estrutura", () => {
  it.each([
    ["texto qualquer", "não é JSON"],
    ["[1,2,3]", "array"],
    ["null", "null"],
    ['"oi"', "string"],
    ['{"foo":1}', "objeto sem nada do Apurado"],
  ])("recusa %s (%s)", (txt) => {
    expect(validarBackup(txt).ok).toBe(false);
  });

  it("recusa JSON truncado", () => {
    expect(erroDe(envelope().slice(0, 50))).toMatch(/JSON válido/);
  });

  it("recusa arquivo de outro app", () => {
    expect(erroDe(envelope({ app: "outro" }))).toMatch(/não é um backup do Apurado/);
  });

  it("recusa envelope sem dados", () => {
    expect(erroDe(envelope({ dados: undefined }))).toMatch(/vazios ou corrompidos/);
  });

  it("recusa dados sem weeks", () => {
    expect(erroDe(envelope({ dados: { versao: 2, config: {} } }))).toMatch(/lista de semanas/);
  });

  it("recusa chave de semana fora do formato AAAA-MM-DD", () => {
    const d = dadosExemplo() as unknown as { weeks: Record<string, unknown> };
    d.weeks["semana-1"] = { lanc: [] };
    expect(erroDe(envelope({ dados: d }))).toMatch(/data inválida/);
  });

  it("recusa lançamentos que não são lista", () => {
    expect(erroDe(envelope({ dados: { versao: 2, weeks: { "2026-11-02": { lanc: {} } } } }))).toMatch(/lançamentos/);
  });

  it("recusa lançamento com tipo desconhecido", () => {
    const dados = { versao: 2, weeks: { "2026-11-02": { lanc: [{ tipo: "pix", valor: 10 }] } } };
    expect(erroDe(envelope({ dados }))).toMatch(/tipo inválido/);
  });

  it.each([["10"], [null], [Infinity]])("recusa lançamento com valor %j", (valor) => {
    // Infinity vira null no JSON.stringify — ainda assim tem que falhar.
    const dados = { versao: 2, weeks: { "2026-11-02": { lanc: [{ tipo: "gasto", valor }] } } };
    expect(erroDe(envelope({ dados }))).toMatch(/valor inválido/);
  });

  it("recusa blocos que não são lista", () => {
    expect(erroDe(envelope({ dados: { versao: 2, config: { blocos: "sex" }, weeks: {} } }))).toMatch(/blocos/);
  });

  it("recusa versão de dados desconhecida dentro do envelope", () => {
    expect(erroDe(envelope({ dados: { versao: 7, weeks: {} } }))).toMatch(/Versão de dados desconhecida/);
  });
});

describe("helpers", () => {
  it("nome do arquivo segue apurado-backup-AAAA-MM-DD.json", () => {
    expect(nomeArquivoBackup(new Date(2026, 0, 5, 23, 59))).toBe("apurado-backup-2026-01-05.json");
  });

  it("criarBackup inclui app, versão e data", () => {
    const b = criarBackup(defaultData(), new Date("2026-11-10T00:00:00Z"));
    expect(b).toMatchObject({ app: "apurado", schemaVersion: SCHEMA_VERSION, exportadoEm: "2026-11-10T00:00:00.000Z" });
  });

  it("resumir conta zero em dados vazios", () => {
    expect(resumir(defaultData())).toMatchObject({ semanas: 0, despesas: 0, totalDespesas: 0, blocos: 3 });
  });
});
