import { useState } from "react";
import type { Bloco, Config, Lancamento, Semana, TipoLanc } from "../lib/types";
import { DIAS, DIAS_CURTO, MESES, MESES_FULL, addDays, brl, pad } from "../lib/format";
import { C, inputStyle } from "../theme";
import { Card, CheckRow, DiaPill, Eyebrow, Gauge } from "./ui";

// ── Taxímetro: líquido da semana ──

export function Taximetro({ bruto, gasto, cfg }: { bruto: number; gasto: number; cfg: Config }) {
  const liquido = bruto - gasto;
  const metaOk = liquido >= cfg.metaSemanal;
  return (
    <Card>
      <div className="flex items-center justify-between">
        <Eyebrow>líquido da semana</Eyebrow>
        <span
          className="text-xs font-mono px-2 py-1 rounded-full"
          style={{ background: metaOk ? C.greenSoft : C.amberSoft, color: metaOk ? C.green : C.amber }}
        >
          {metaOk ? "meta batida ✓" : `faltam ${brl(cfg.metaSemanal - liquido)}`}
        </span>
      </div>
      <div className="rounded-xl px-4 py-3 mb-3" style={{ background: C.inset, border: `1px solid ${C.line}` }}>
        <div className="font-mono text-5xl font-bold leading-none text-right tracking-tight" style={{ color: metaOk ? C.green : C.amber }}>
          {brl(liquido)}
        </div>
        <div className="font-mono text-xs text-right mt-2" style={{ color: C.dim }}>
          meta líquida {brl(cfg.metaSemanal)}
        </div>
      </div>
      <Gauge pct={(liquido / cfg.metaSemanal) * 100} color={metaOk ? C.green : C.amber} />
      <div className="flex justify-between mt-3 text-sm font-mono">
        <span style={{ color: C.dim }}>
          bruto <span style={{ color: C.text }}>{brl(bruto)}</span>
          <span style={{ color: C.dim }}> / {brl(cfg.metaBruta)}</span>
        </span>
        <span style={{ color: C.red }}>combustível −{brl(gasto)}</span>
      </div>
    </Card>
  );
}

// ── Lançar valores ──

export function Lancar({ onAdd }: { onAdd: (tipo: TipoLanc, raw: string) => boolean }) {
  const [entrada, setEntrada] = useState("");
  const [gasto, setGasto] = useState("");

  const add = (tipo: TipoLanc) => {
    if (!onAdd(tipo, tipo === "entrada" ? entrada : gasto)) return;
    if (tipo === "entrada") setEntrada("");
    else setGasto("");
  };

  const coluna = (tipo: TipoLanc, value: string, set: (v: string) => void) => (
    <div className="flex flex-col gap-2">
      <input
        inputMode="decimal"
        placeholder="0,00"
        value={value}
        onChange={(e) => set(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && add(tipo)}
        className="rounded-lg px-3 py-2 font-mono outline-none w-full"
        style={inputStyle}
      />
      <button
        type="button"
        onClick={() => add(tipo)}
        className="rounded-lg py-2 text-sm font-semibold active:scale-95 transition-all"
        style={
          tipo === "entrada"
            ? { background: C.amber, color: "#1A130A" }
            : { border: `1px solid ${C.red}`, color: C.red, background: "transparent" }
        }
      >
        {tipo === "entrada" ? "+ Corrida" : "− Combustível"}
      </button>
    </div>
  );

  return (
    <Card>
      <Eyebrow>lançar</Eyebrow>
      <div className="grid grid-cols-2 gap-3">
        {coluna("entrada", entrada, setEntrada)}
        {coluna("gasto", gasto, setGasto)}
      </div>
      <div className="text-xs mt-2" style={{ color: C.dim }}>
        Lança o repasse de cada corrida (ou o total do turno) e cada abastecimento.
      </div>
    </Card>
  );
}

// ── Checklist do trajeto ──

export function Trajeto({
  week,
  monday,
  dias,
  onToggle,
}: {
  week: Semana;
  monday: Date;
  dias: boolean[];
  onToggle: (campo: "ida" | "volta", i: number) => void;
}) {
  const ativos = DIAS.map((_, i) => i).filter((i) => dias[i]);
  const total = ativos.length * 2;
  const feitas = ativos.filter((i) => week.ida[i]).length + ativos.filter((i) => week.volta[i]).length;

  const linha = (campo: "ida" | "volta") => (
    <div className="flex items-center gap-2">
      <span className="w-12 text-sm" style={{ color: C.dim }}>
        {campo}
      </span>
      <div className="flex gap-1 flex-1 justify-between">
        {ativos.map((i) => (
          <DiaPill
            key={`${campo}-${i}`}
            on={week[campo][i]}
            label={DIAS[i]}
            sub={pad(addDays(monday, i).getDate())}
            onClick={() => onToggle(campo, i)}
          />
        ))}
      </div>
    </div>
  );

  return (
    <Card>
      <div className="flex items-center justify-between">
        <Eyebrow>trajeto casa ↔ trabalho</Eyebrow>
        <span className="font-mono text-xs" style={{ color: total > 0 && feitas >= total * 0.8 ? C.green : C.dim }}>
          {feitas}/{total}
        </span>
      </div>
      {ativos.length === 0 ? (
        <div className="text-sm py-2" style={{ color: C.dim }}>
          Nenhum dia marcado. Escolhe os dias do trajeto nos ajustes.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {linha("ida")}
          {linha("volta")}
        </div>
      )}
      <div className="text-xs mt-3" style={{ color: C.dim }}>
        Corrida aproveitada no caminho de outro compromisso. Dá pra desligar nos ajustes.
      </div>
    </Card>
  );
}

// ── Blocos de pico ──

export function Blocos({ blocos, week, hojeIdx, onToggle }: { blocos: Bloco[]; week: Semana; hojeIdx: number | null; onToggle: (id: string) => void }) {
  const ordenados = [...blocos].sort((a, b) => (a.dia ?? 7) - (b.dia ?? 7));
  const feitos = blocos.filter((b) => week.blocos[b.id]).length;
  return (
    <Card>
      <div className="flex items-center justify-between">
        <Eyebrow>blocos de pico</Eyebrow>
        <span className="font-mono text-xs" style={{ color: feitos === blocos.length && blocos.length > 0 ? C.green : C.dim }}>
          {feitos}/{blocos.length}
        </span>
      </div>
      {blocos.length === 0 ? (
        <div className="text-sm py-2" style={{ color: C.dim }}>
          Nenhum bloco configurado. Adiciona teus turnos nos ajustes.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {ordenados.map((b) => {
            const hoje = b.dia !== null && b.dia === hojeIdx;
            return (
              <CheckRow
                key={b.id}
                on={!!week.blocos[b.id]}
                onClick={() => onToggle(b.id)}
                title={b.nome}
                tag={
                  <span
                    className="font-mono text-xs w-9 shrink-0 text-center rounded-md py-1"
                    style={{ background: hoje ? C.amberSoft : C.inset, color: hoje ? C.amber : C.dim }}
                  >
                    {b.dia === null ? "todo" : DIAS_CURTO[b.dia]}
                  </span>
                }
              />
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ── Lançamentos da semana ──

export function Lancamentos({ lanc, onDel }: { lanc: Lancamento[]; onDel: (id: string) => void }) {
  return (
    <Card>
      <Eyebrow>lançamentos da semana</Eyebrow>
      {lanc.length === 0 ? (
        <div className="text-sm py-2" style={{ color: C.dim }}>
          Nada lançado ainda. Registra a primeira corrida da semana.
        </div>
      ) : (
        <div className="flex flex-col">
          {[...lanc].reverse().map((l) => {
            const d = new Date(l.ts);
            const entrada = l.tipo === "entrada";
            return (
              <div key={l.id} className="flex items-center justify-between py-2" style={{ borderBottom: `1px solid ${C.line}` }}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full" style={{ background: entrada ? C.amber : C.red }} />
                  <span className="text-sm">{entrada ? "Corrida" : "Combustível"}</span>
                  <span className="text-xs font-mono" style={{ color: C.dim }}>
                    {pad(d.getDate())} {MESES[d.getMonth()]} {pad(d.getHours())}:{pad(d.getMinutes())}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm" style={{ color: entrada ? C.text : C.red }}>
                    {entrada ? "+" : "−"}
                    {brl(l.valor)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onDel(l.id)}
                    className="w-6 h-6 rounded-md text-xs active:scale-95 transition-all"
                    style={{ border: `1px solid ${C.line}`, color: C.dim }}
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ── Mês ──

export function Mes({ mes, liquido, meta, automatica }: { mes: number; liquido: number; meta: number; automatica: boolean }) {
  const ok = liquido >= meta;
  return (
    <Card>
      <div className="flex items-center justify-between">
        <Eyebrow>{MESES_FULL[mes]} · líquido acumulado</Eyebrow>
        <span className="font-mono text-xs" style={{ color: C.dim }}>
          meta {brl(meta)}
        </span>
      </div>
      <div className="font-mono text-2xl font-bold mb-2" style={{ color: ok ? C.green : C.text }}>
        {brl(liquido)}
      </div>
      <Gauge pct={(liquido / meta) * 100} color={ok ? C.green : C.amber} h={8} />
      <div className="text-xs mt-2" style={{ color: C.dim }}>
        Somatório das semanas cuja segunda-feira cai neste mês.{automatica ? " Meta = semanal × 52 ÷ 12." : ""}
      </div>
    </Card>
  );
}
