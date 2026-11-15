import { useEffect, useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import { track } from "@vercel/analytics";
import type { Config, Dados, Semana, TipoLanc } from "./lib/types";
import { MESES, addDays, brl, diaIdx, keyOf, mondayOf, novoId, parseValor } from "./lib/format";
import { carregar, defaultWeek, pedirPersistencia, salvar } from "./lib/storage";
import { C } from "./theme";
import Ajustes from "./components/Ajustes";
import Backup from "./components/Backup";
import BackupArquivo from "./components/BackupArquivo";
import { Blocos, Lancamentos, Lancar, Mes, Taximetro, Trajeto } from "./components/Painel";

// ── Apurado · painel do motorista de app (v2) ───────────────────
// Versão genérica para motoristas que vivem do volante.
// Metas semanais diretas, trajeto opcional e blocos de pico
// configuráveis para qualquer dia da semana.

// O numero de contato nao fica no codigo. Defina VITE_FEEDBACK_PHONE no
// ambiente de build (Vercel). Sem a variavel, o botao abre as issues do repo.
const FEEDBACK_PHONE = import.meta.env.VITE_FEEDBACK_PHONE;
const FEEDBACK_URL = FEEDBACK_PHONE
  ? `https://wa.me/${FEEDBACK_PHONE}?text=${encodeURIComponent("Feedback Apurado:")}`
  : "https://github.com/filipeppedroso/apurado/issues";

export default function App() {
  const [data, setData] = useState<Dados>(carregar);
  const [offset, setOffset] = useState(0);
  const [erroSave, setErroSave] = useState(false);
  const [showCfg, setShowCfg] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(pedirPersistencia, []);

  const persist = (next: Dados) => {
    setData(next);
    if (salvar(next)) {
      setErroSave(false);
      setLastSaved(new Date());
    } else {
      setErroSave(true);
    }
  };

  // ── Derivados da semana exibida ──
  const cfg = data.config;
  const metaMensal = cfg.metaMensal ?? Math.round((cfg.metaSemanal * 52) / 12);
  const hoje = new Date();
  const monday = addDays(mondayOf(hoje), offset * 7);
  const sunday = addDays(monday, 6);
  const wk = keyOf(monday);
  const week: Semana = data.weeks[wk] ?? defaultWeek();

  const bruto = week.lanc.filter((l) => l.tipo === "entrada").reduce((a, l) => a + l.valor, 0);
  const gasto = week.lanc.filter((l) => l.tipo === "gasto").reduce((a, l) => a + l.valor, 0);

  // ── Mês (semanas agrupadas pela segunda-feira) ──
  let mesLiquido = 0;
  Object.entries(data.weeks).forEach(([k, w]) => {
    const d = new Date(k + "T00:00:00");
    if (d.getMonth() === monday.getMonth() && d.getFullYear() === monday.getFullYear()) {
      w.lanc.forEach((l) => {
        mesLiquido += l.tipo === "entrada" ? l.valor : -l.valor;
      });
    }
  });

  // ── Mutadores ──
  const setWeek = (nw: Semana) => persist({ ...data, weeks: { ...data.weeks, [wk]: nw } });

  const toggleDia = (campo: "ida" | "volta", i: number) => setWeek({ ...week, [campo]: week[campo].map((v, j) => (j === i ? !v : v)) });

  const toggleBloco = (id: string) => {
    const marcado = !week.blocos[id];
    setWeek({ ...week, blocos: { ...week.blocos, [id]: marcado } });
    if (marcado) track("turno_planejado");
  };

  const addLanc = (tipo: TipoLanc, raw: string) => {
    const v = parseValor(raw);
    if (!Number.isFinite(v) || v <= 0) return false;
    setWeek({ ...week, lanc: [...week.lanc, { id: novoId(), tipo, valor: v, ts: Date.now() }] });
    track(tipo === "entrada" ? "ganho_registrado" : "combustivel_registrado");
    return true;
  };

  const delLanc = (id: string) => setWeek({ ...week, lanc: week.lanc.filter((l) => l.id !== id) });

  const aplicarCfg = (config: Config) => {
    persist({ ...data, config });
    setShowCfg(false);
  };

  const rotuloSemana = `${monday.getDate()} ${MESES[monday.getMonth()]} – ${sunday.getDate()} ${MESES[sunday.getMonth()]}`;

  return (
    <div className="min-h-screen pb-10" style={{ background: C.bg, color: C.text }}>
      <div className="max-w-md mx-auto px-4 pt-6 flex flex-col gap-4">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest" style={{ color: C.amber }}>
              painel do motorista de app
            </div>
            <h1 className="text-2xl font-bold leading-tight mt-1">Apurado</h1>
          </div>
          <button
            type="button"
            onClick={() => setShowCfg(!showCfg)}
            className="font-mono text-xs px-3 py-2 rounded-lg"
            style={{ border: `1px solid ${showCfg ? C.amber : C.line}`, color: showCfg ? C.amber : C.dim }}
          >
            {showCfg ? "fechar" : "ajustes"}
          </button>
        </div>

        {erroSave && (
          <div className="rounded-xl px-3 py-2 text-sm" style={{ background: "rgba(224,103,112,0.12)", color: C.red }}>
            O salvar automático não funcionou. Baixa um backup lá embaixo antes de fechar.
          </div>
        )}

        {showCfg && <Ajustes cfg={cfg} onAplicar={aplicarCfg} />}
        {showCfg && <BackupArquivo data={data} onImportar={persist} />}

        {/* Navegação de semana */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setOffset(offset - 1)}
            className="w-10 h-10 rounded-lg font-mono active:scale-95 transition-all"
            style={{ border: `1px solid ${C.line}`, color: C.dim }}
          >
            ‹
          </button>
          <div className="text-center">
            <div className="font-mono text-sm">{rotuloSemana}</div>
            <div className="text-xs" style={{ color: offset === 0 ? C.amber : C.dim }}>
              {offset === 0 ? "esta semana" : offset === -1 ? "semana passada" : `${Math.abs(offset)} semanas atrás`}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOffset(offset + 1)}
            disabled={offset >= 0}
            className="w-10 h-10 rounded-lg font-mono active:scale-95 transition-all disabled:opacity-30"
            style={{ border: `1px solid ${C.line}`, color: C.dim }}
          >
            ›
          </button>
        </div>

        <Taximetro bruto={bruto} gasto={gasto} cfg={cfg} />
        <Lancar onAdd={addLanc} />
        {cfg.trajetoAtivo && <Trajeto week={week} monday={monday} dias={cfg.trajetoDias} onToggle={toggleDia} />}
        <Blocos blocos={cfg.blocos} week={week} hojeIdx={offset === 0 ? diaIdx(hoje) : null} onToggle={toggleBloco} />
        <Lancamentos lanc={week.lanc} onDel={delLanc} />
        <Mes mes={monday.getMonth()} liquido={mesLiquido} meta={metaMensal} automatica={cfg.metaMensal === null} />
        <Backup data={data} erroSave={erroSave} lastSaved={lastSaved} onRestaurar={persist} />

        <div className="text-xs text-center px-4" style={{ color: C.dim }}>
          Líquido = corridas lançadas − combustível lançado. Bateu {brl(cfg.metaSemanal)} na semana, o mês anda sozinho.
        </div>

        <a
          href={FEEDBACK_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="self-center font-mono text-xs px-3 py-2 rounded-lg active:scale-95 transition-all"
          style={{ border: `1px solid ${C.line}`, color: C.dim }}
        >
          Mandar feedback
        </a>
      </div>
      <Analytics />
    </div>
  );
}
