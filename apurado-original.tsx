import { useState, useEffect } from "react";

// ── Apurado · painel do motorista de app (v2) ───────────────────
// Versão genérica para motoristas que vivem do volante.
// Metas semanais diretas, trajeto opcional e blocos de trabalho
// configuráveis para qualquer dia da semana.

const KEY = "apurado:v1";

const C = {
  bg: "#101318",
  card: "#181D25",
  inset: "#0B0E13",
  line: "#2A313D",
  text: "#E9ECF1",
  dim: "#8C96A5",
  amber: "#F2A93B",
  amberSoft: "rgba(242,169,59,0.14)",
  green: "#3ECF7A",
  greenSoft: "rgba(62,207,122,0.14)",
  red: "#E06770",
};

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MESES_FULL = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const DIAS = ["S", "T", "Q", "Q", "S"];

const pad = (n) => String(n).padStart(2, "0");

const mondayOf = (d) => {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
};

const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

const keyOf = (monday) => `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;

const brl = (n) =>
  "R$ " + (Number.isFinite(n) ? n : 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const parseValor = (s) => {
  if (!s) return NaN;
  let t = String(s).trim().replace(/[R$\s]/g, "");
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  return parseFloat(t);
};

const defaultBlocos = () => [
  { id: "sex", nome: "Sexta à noite" },
  { id: "sab", nome: "Sábado à noite" },
  { id: "dom", nome: "Domingo de manhã" },
];

const defaultData = () => ({
  config: { metaSemanal: 1000, metaBruta: 1600, trajetoAtivo: true, blocos: defaultBlocos() },
  weeks: {},
});

const defaultWeek = () => ({
  ida: [false, false, false, false, false],
  volta: [false, false, false, false, false],
  blocos: {},
  lanc: [],
});

// ── Componentes de apoio ────────────────────────────────────────

const Gauge = ({ pct, color, h = 10 }) => (
  <div
    className="relative w-full rounded-full overflow-hidden"
    style={{ background: C.inset, border: `1px solid ${C.line}`, height: h }}
  >
    <div
      className="rounded-full transition-all duration-500"
      style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color, height: "100%" }}
    />
    {[25, 50, 75].map((t) => (
      <div key={t} className="absolute top-0 bottom-0 w-px" style={{ left: `${t}%`, background: C.line }} />
    ))}
  </div>
);

const Card = ({ children }) => (
  <div className="rounded-2xl p-4" style={{ background: C.card, border: `1px solid ${C.line}` }}>
    {children}
  </div>
);

const Eyebrow = ({ children }) => (
  <div className="font-mono text-xs uppercase tracking-widest mb-2" style={{ color: C.dim }}>
    {children}
  </div>
);

// ── App ─────────────────────────────────────────────────────────

export default function Apurado() {
  const [data, setData] = useState(null);
  const [offset, setOffset] = useState(0);
  const [erroSave, setErroSave] = useState(false);
  const [valEntrada, setValEntrada] = useState("");
  const [valGasto, setValGasto] = useState("");
  const [showCfg, setShowCfg] = useState(false);
  const [cfgMetaS, setCfgMetaS] = useState("");
  const [cfgMetaB, setCfgMetaB] = useState("");
  const [cfgTrajeto, setCfgTrajeto] = useState(true);
  const [cfgBlocos, setCfgBlocos] = useState([]);
  const [novoBloco, setNovoBloco] = useState("");
  const [backupText, setBackupText] = useState("");
  const [copyMsg, setCopyMsg] = useState("");
  const [restoreText, setRestoreText] = useState("");
  const [restoreMsg, setRestoreMsg] = useState("");
  const [lastSaved, setLastSaved] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get(KEY);
        const parsed = r && r.value ? JSON.parse(r.value) : defaultData();
        const merged = { ...defaultData(), ...parsed, config: { ...defaultData().config, ...(parsed.config || {}) } };
        if (!Array.isArray(merged.config.blocos)) merged.config.blocos = defaultBlocos();
        setData(merged);
      } catch {
        setData(defaultData());
      }
    })();
  }, []);

  const persist = async (next) => {
    setData(next);
    try {
      const ok = await window.storage.set(KEY, JSON.stringify(next));
      if (!ok) {
        setErroSave(true);
      } else {
        setErroSave(false);
        setLastSaved(new Date());
      }
    } catch {
      setErroSave(true);
    }
  };

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center font-mono text-sm" style={{ background: C.bg, color: C.dim }}>
        carregando…
      </div>
    );
  }

  // ── Derivados da semana exibida ──
  const cfg = data.config;
  const metaSemanal = cfg.metaSemanal;
  const metaMensal = Math.round((cfg.metaSemanal * 52) / 12);
  const hoje = new Date();
  const monday = addDays(mondayOf(hoje), offset * 7);
  const sunday = addDays(monday, 6);
  const wk = keyOf(monday);
  const week = { ...defaultWeek(), ...(data.weeks[wk] || {}) };

  const bruto = week.lanc.filter((l) => l.tipo === "entrada").reduce((a, l) => a + l.valor, 0);
  const gasto = week.lanc.filter((l) => l.tipo === "gasto").reduce((a, l) => a + l.valor, 0);
  const liquido = bruto - gasto;
  const metaOk = liquido >= metaSemanal;
  const corridasTrajeto = week.ida.filter(Boolean).length + week.volta.filter(Boolean).length;
  const blocosFeitos = cfg.blocos.filter((b) => week.blocos[b.id]).length;

  // ── Mês (semanas agrupadas pela segunda-feira) ──
  let mesLiquido = 0;
  Object.entries(data.weeks).forEach(([k, w]) => {
    const d = new Date(k + "T00:00:00");
    if (d.getMonth() === monday.getMonth() && d.getFullYear() === monday.getFullYear()) {
      (w.lanc || []).forEach((l) => {
        mesLiquido += l.tipo === "entrada" ? l.valor : -l.valor;
      });
    }
  });

  // ── Mutadores ──
  const setWeek = (nw) => persist({ ...data, weeks: { ...data.weeks, [wk]: nw } });

  const toggleDia = (campo, i) => {
    const arr = [...week[campo]];
    arr[i] = !arr[i];
    setWeek({ ...week, [campo]: arr });
  };

  const toggleBloco = (id) => setWeek({ ...week, blocos: { ...week.blocos, [id]: !week.blocos[id] } });

  const addLanc = (tipo) => {
    const raw = tipo === "entrada" ? valEntrada : valGasto;
    const v = parseValor(raw);
    if (!Number.isFinite(v) || v <= 0) return;
    const item = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, tipo, valor: v, ts: Date.now() };
    setWeek({ ...week, lanc: [...week.lanc, item] });
    if (tipo === "entrada") setValEntrada("");
    else setValGasto("");
  };

  const delLanc = (id) => setWeek({ ...week, lanc: week.lanc.filter((l) => l.id !== id) });

  const abrirCfg = () => {
    setCfgMetaS(String(cfg.metaSemanal));
    setCfgMetaB(String(cfg.metaBruta));
    setCfgTrajeto(!!cfg.trajetoAtivo);
    setCfgBlocos(cfg.blocos.map((b) => ({ ...b })));
    setNovoBloco("");
    setShowCfg(!showCfg);
  };

  const addBlocoCfg = () => {
    const nome = novoBloco.trim();
    if (!nome) return;
    setCfgBlocos([...cfgBlocos, { id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, nome }]);
    setNovoBloco("");
  };

  const aplicarCfg = () => {
    const ms = parseValor(cfgMetaS);
    const mb = parseValor(cfgMetaB);
    const blocosLimpos = cfgBlocos.map((b) => ({ ...b, nome: b.nome.trim() })).filter((b) => b.nome.length > 0);
    persist({
      ...data,
      config: {
        metaSemanal: Number.isFinite(ms) && ms > 0 ? ms : cfg.metaSemanal,
        metaBruta: Number.isFinite(mb) && mb > 0 ? mb : cfg.metaBruta,
        trajetoAtivo: cfgTrajeto,
        blocos: blocosLimpos,
      },
    });
    setShowCfg(false);
  };

  const gerarBackup = async () => {
    const txt = JSON.stringify(data);
    setBackupText(txt);
    try {
      await navigator.clipboard.writeText(txt);
      setCopyMsg("Copiado para a área de transferência ✓");
    } catch {
      setCopyMsg("Toca e segura no texto abaixo para copiar.");
    }
  };

  const restaurarBackup = () => {
    try {
      const parsed = JSON.parse(restoreText.trim());
      if (!parsed || typeof parsed !== "object" || !parsed.weeks) throw new Error("formato");
      const next = { ...defaultData(), ...parsed, config: { ...defaultData().config, ...(parsed.config || {}) } };
      if (!Array.isArray(next.config.blocos)) next.config.blocos = defaultBlocos();
      persist(next);
      setRestoreMsg("Dados restaurados ✓");
      setRestoreText("");
    } catch {
      setRestoreMsg("Esse texto não é um backup válido.");
    }
  };

  const rotuloSemana = `${monday.getDate()} ${MESES[monday.getMonth()]} – ${sunday.getDate()} ${MESES[sunday.getMonth()]}`;

  const DiaBtn = ({ campo, i }) => {
    const on = week[campo][i];
    const dNum = addDays(monday, i).getDate();
    return (
      <button type="button" onClick={() => toggleDia(campo, i)} className="flex flex-col items-center gap-1 select-none">
        <span
          className="w-10 h-10 rounded-full flex items-center justify-center font-mono text-sm transition-all duration-200 active:scale-95"
          style={{
            border: `1px solid ${on ? C.amber : C.line}`,
            background: on ? C.amberSoft : "transparent",
            color: on ? C.amber : C.dim,
          }}
        >
          {on ? "✓" : DIAS[i]}
        </span>
        <span className="text-xs font-mono" style={{ color: C.dim }}>
          {pad(dNum)}
        </span>
      </button>
    );
  };

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
            onClick={abrirCfg}
            className="font-mono text-xs px-3 py-2 rounded-lg"
            style={{ border: `1px solid ${C.line}`, color: C.dim }}
          >
            ajustes
          </button>
        </div>

        {erroSave && (
          <div className="rounded-xl px-3 py-2 text-sm" style={{ background: "rgba(224,103,112,0.12)", color: C.red }}>
            O salvar automático não funcionou. Gera um código de backup lá embaixo antes de fechar.
          </div>
        )}

        {/* Ajustes */}
        {showCfg && (
          <Card>
            <Eyebrow>ajustes</Eyebrow>
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span style={{ color: C.dim }}>Meta líquida da semana (R$)</span>
                <input
                  inputMode="decimal"
                  value={cfgMetaS}
                  onChange={(e) => setCfgMetaS(e.target.value)}
                  className="rounded-lg px-3 py-2 font-mono outline-none w-full"
                  style={{ background: C.inset, border: `1px solid ${C.line}`, color: C.text }}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span style={{ color: C.dim }}>Meta bruta da semana, referência (R$)</span>
                <input
                  inputMode="decimal"
                  value={cfgMetaB}
                  onChange={(e) => setCfgMetaB(e.target.value)}
                  className="rounded-lg px-3 py-2 font-mono outline-none w-full"
                  style={{ background: C.inset, border: `1px solid ${C.line}`, color: C.text }}
                />
              </label>
              <div className="text-xs" style={{ color: C.dim }}>
                A meta do mês é calculada sozinha: semanal × 52 ÷ 12.
              </div>

              <button
                type="button"
                onClick={() => setCfgTrajeto(!cfgTrajeto)}
                className="flex items-center justify-between rounded-xl px-3 py-3 text-left active:scale-95 transition-all"
                style={{
                  border: `1px solid ${cfgTrajeto ? C.amber : C.line}`,
                  background: cfgTrajeto ? C.amberSoft : "transparent",
                }}
              >
                <div>
                  <div className="text-sm font-semibold" style={{ color: cfgTrajeto ? C.amber : C.text }}>
                    Trajeto casa ↔ trabalho
                  </div>
                  <div className="text-xs" style={{ color: C.dim }}>
                    Mostra o checklist de corridas no caminho
                  </div>
                </div>
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center font-mono text-sm"
                  style={{ border: `1px solid ${cfgTrajeto ? C.amber : C.line}`, color: cfgTrajeto ? C.amber : C.dim }}
                >
                  {cfgTrajeto ? "✓" : ""}
                </span>
              </button>

              <div>
                <div className="text-sm mb-2" style={{ color: C.dim }}>
                  Blocos de trabalho (qualquer dia da semana)
                </div>
                <div className="flex flex-col gap-2">
                  {cfgBlocos.map((b, idx) => (
                    <div key={b.id} className="flex items-center gap-2">
                      <input
                        value={b.nome}
                        onChange={(e) => {
                          const arr = [...cfgBlocos];
                          arr[idx] = { ...b, nome: e.target.value };
                          setCfgBlocos(arr);
                        }}
                        className="flex-1 min-w-0 rounded-lg px-3 py-2 outline-none text-sm"
                        style={{ background: C.inset, border: `1px solid ${C.line}`, color: C.text }}
                      />
                      <button
                        type="button"
                        onClick={() => setCfgBlocos(cfgBlocos.filter((x) => x.id !== b.id))}
                        className="w-8 h-8 rounded-md text-sm active:scale-95 transition-all"
                        style={{ border: `1px solid ${C.line}`, color: C.red }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <input
                      value={novoBloco}
                      onChange={(e) => setNovoBloco(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addBlocoCfg()}
                      placeholder="Novo bloco, ex.: Quarta à noite"
                      className="flex-1 min-w-0 rounded-lg px-3 py-2 outline-none text-sm"
                      style={{ background: C.inset, border: `1px solid ${C.line}`, color: C.text }}
                    />
                    <button
                      type="button"
                      onClick={addBlocoCfg}
                      className="w-8 h-8 rounded-md text-sm font-bold active:scale-95 transition-all"
                      style={{ border: `1px solid ${C.amber}`, color: C.amber }}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={aplicarCfg}
                className="rounded-lg py-2 font-semibold text-sm active:scale-95 transition-all"
                style={{ background: C.amber, color: "#1A130A" }}
              >
                Aplicar
              </button>
            </div>
          </Card>
        )}

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

        {/* Taxímetro: líquido da semana */}
        <Card>
          <div className="flex items-center justify-between">
            <Eyebrow>líquido da semana</Eyebrow>
            <span
              className="text-xs font-mono px-2 py-1 rounded-full"
              style={{
                background: metaOk ? C.greenSoft : C.amberSoft,
                color: metaOk ? C.green : C.amber,
              }}
            >
              {metaOk ? "meta batida ✓" : `faltam ${brl(metaSemanal - liquido)}`}
            </span>
          </div>
          <div className="rounded-xl px-4 py-3 mb-3" style={{ background: C.inset, border: `1px solid ${C.line}` }}>
            <div
              className="font-mono text-5xl font-bold leading-none text-right tracking-tight"
              style={{ color: metaOk ? C.green : C.amber }}
            >
              {brl(liquido)}
            </div>
            <div className="font-mono text-xs text-right mt-2" style={{ color: C.dim }}>
              meta líquida {brl(metaSemanal)}
            </div>
          </div>
          <Gauge pct={(liquido / metaSemanal) * 100} color={metaOk ? C.green : C.amber} />
          <div className="flex justify-between mt-3 text-sm font-mono">
            <span style={{ color: C.dim }}>
              bruto <span style={{ color: C.text }}>{brl(bruto)}</span>
              <span style={{ color: C.dim }}> / {brl(cfg.metaBruta)}</span>
            </span>
            <span style={{ color: C.red }}>combustível −{brl(gasto)}</span>
          </div>
        </Card>

        {/* Lançar valores */}
        <Card>
          <Eyebrow>lançar</Eyebrow>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <input
                inputMode="decimal"
                placeholder="0,00"
                value={valEntrada}
                onChange={(e) => setValEntrada(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addLanc("entrada")}
                className="rounded-lg px-3 py-2 font-mono outline-none w-full"
                style={{ background: C.inset, border: `1px solid ${C.line}`, color: C.text }}
              />
              <button
                type="button"
                onClick={() => addLanc("entrada")}
                className="rounded-lg py-2 text-sm font-semibold active:scale-95 transition-all"
                style={{ background: C.amber, color: "#1A130A" }}
              >
                + Corrida
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <input
                inputMode="decimal"
                placeholder="0,00"
                value={valGasto}
                onChange={(e) => setValGasto(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addLanc("gasto")}
                className="rounded-lg px-3 py-2 font-mono outline-none w-full"
                style={{ background: C.inset, border: `1px solid ${C.line}`, color: C.text }}
              />
              <button
                type="button"
                onClick={() => addLanc("gasto")}
                className="rounded-lg py-2 text-sm font-semibold active:scale-95 transition-all"
                style={{ border: `1px solid ${C.red}`, color: C.red, background: "transparent" }}
              >
                − Combustível
              </button>
            </div>
          </div>
          <div className="text-xs mt-2" style={{ color: C.dim }}>
            Lança o repasse de cada corrida (ou o total do turno) e cada abastecimento.
          </div>
        </Card>

        {/* Checklist do trajeto */}
        {cfg.trajetoAtivo && (
          <Card>
            <div className="flex items-center justify-between">
              <Eyebrow>trajeto casa ↔ trabalho</Eyebrow>
              <span className="font-mono text-xs" style={{ color: corridasTrajeto >= 8 ? C.green : C.dim }}>
                {corridasTrajeto}/10
              </span>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-12 text-sm" style={{ color: C.dim }}>
                ida
              </span>
              <div className="flex gap-2 flex-1 justify-between">
                {DIAS.map((_, i) => (
                  <DiaBtn key={`ida-${i}`} campo="ida" i={i} />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-12 text-sm" style={{ color: C.dim }}>
                volta
              </span>
              <div className="flex gap-2 flex-1 justify-between">
                {DIAS.map((_, i) => (
                  <DiaBtn key={`volta-${i}`} campo="volta" i={i} />
                ))}
              </div>
            </div>
            <div className="text-xs mt-3" style={{ color: C.dim }}>
              Corrida aproveitada no caminho de outro compromisso. Dá pra desligar nos ajustes.
            </div>
          </Card>
        )}

        {/* Blocos de trabalho */}
        <Card>
          <div className="flex items-center justify-between">
            <Eyebrow>blocos de trabalho</Eyebrow>
            <span className="font-mono text-xs" style={{ color: blocosFeitos === cfg.blocos.length && cfg.blocos.length > 0 ? C.green : C.dim }}>
              {blocosFeitos}/{cfg.blocos.length}
            </span>
          </div>
          {cfg.blocos.length === 0 ? (
            <div className="text-sm py-2" style={{ color: C.dim }}>
              Nenhum bloco configurado. Adiciona teus turnos nos ajustes.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {cfg.blocos.map((b) => {
                const on = !!week.blocos[b.id];
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => toggleBloco(b.id)}
                    className="flex items-center justify-between rounded-xl px-3 py-3 text-left active:scale-95 transition-all"
                    style={{
                      border: `1px solid ${on ? C.amber : C.line}`,
                      background: on ? C.amberSoft : "transparent",
                    }}
                  >
                    <div className="text-sm font-semibold" style={{ color: on ? C.amber : C.text }}>
                      {b.nome}
                    </div>
                    <span
                      className="w-7 h-7 rounded-full flex items-center justify-center font-mono text-sm"
                      style={{ border: `1px solid ${on ? C.amber : C.line}`, color: on ? C.amber : C.dim }}
                    >
                      {on ? "✓" : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        {/* Lançamentos */}
        <Card>
          <Eyebrow>lançamentos da semana</Eyebrow>
          {week.lanc.length === 0 ? (
            <div className="text-sm py-2" style={{ color: C.dim }}>
              Nada lançado ainda. Registra a primeira corrida da semana.
            </div>
          ) : (
            <div className="flex flex-col">
              {[...week.lanc].reverse().map((l) => {
                const d = new Date(l.ts);
                return (
                  <div
                    key={l.id}
                    className="flex items-center justify-between py-2"
                    style={{ borderBottom: `1px solid ${C.line}` }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full" style={{ background: l.tipo === "entrada" ? C.amber : C.red }} />
                      <span className="text-sm">{l.tipo === "entrada" ? "Corrida" : "Combustível"}</span>
                      <span className="text-xs font-mono" style={{ color: C.dim }}>
                        {pad(d.getDate())} {MESES[d.getMonth()]} {pad(d.getHours())}:{pad(d.getMinutes())}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm" style={{ color: l.tipo === "entrada" ? C.text : C.red }}>
                        {l.tipo === "entrada" ? "+" : "−"}
                        {brl(l.valor)}
                      </span>
                      <button
                        type="button"
                        onClick={() => delLanc(l.id)}
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

        {/* Mês */}
        <Card>
          <div className="flex items-center justify-between">
            <Eyebrow>{MESES_FULL[monday.getMonth()]} · líquido acumulado</Eyebrow>
            <span className="font-mono text-xs" style={{ color: C.dim }}>
              meta {brl(metaMensal)}
            </span>
          </div>
          <div className="font-mono text-2xl font-bold mb-2" style={{ color: mesLiquido >= metaMensal ? C.green : C.text }}>
            {brl(mesLiquido)}
          </div>
          <Gauge pct={(mesLiquido / metaMensal) * 100} color={mesLiquido >= metaMensal ? C.green : C.amber} h={8} />
          <div className="text-xs mt-2" style={{ color: C.dim }}>
            Somatório das semanas cuja segunda-feira cai neste mês.
          </div>
        </Card>

        {/* Backup manual */}
        <Card>
          <div className="flex items-center justify-between">
            <Eyebrow>backup dos dados</Eyebrow>
            <span className="font-mono text-xs" style={{ color: erroSave ? C.red : lastSaved ? C.green : C.dim }}>
              {erroSave
                ? "sem salvar automático"
                : lastSaved
                ? `salvo ${pad(lastSaved.getHours())}:${pad(lastSaved.getMinutes())}`
                : "aguardando lançamento"}
            </span>
          </div>
          <div className="text-xs mb-3" style={{ color: C.dim }}>
            Gera o código, guarda nas tuas notas e restaura quando trocar de aparelho.
          </div>
          <button
            type="button"
            onClick={gerarBackup}
            className="w-full rounded-lg py-2 text-sm font-semibold active:scale-95 transition-all"
            style={{ border: `1px solid ${C.amber}`, color: C.amber, background: "transparent" }}
          >
            Gerar código de backup
          </button>
          {copyMsg && (
            <div className="text-xs mt-2" style={{ color: C.dim }}>
              {copyMsg}
            </div>
          )}
          {backupText && (
            <textarea
              readOnly
              value={backupText}
              rows={3}
              onFocus={(e) => e.target.select()}
              className="w-full mt-2 rounded-lg px-3 py-2 font-mono text-xs outline-none"
              style={{ background: C.inset, border: `1px solid ${C.line}`, color: C.dim }}
            />
          )}
          <div className="my-3" style={{ borderTop: `1px solid ${C.line}` }} />
          <textarea
            value={restoreText}
            onChange={(e) => setRestoreText(e.target.value)}
            rows={2}
            placeholder="Cola aqui um código de backup para restaurar"
            className="w-full rounded-lg px-3 py-2 font-mono text-xs outline-none"
            style={{ background: C.inset, border: `1px solid ${C.line}`, color: C.text }}
          />
          <button
            type="button"
            onClick={restaurarBackup}
            className="w-full mt-2 rounded-lg py-2 text-sm font-semibold active:scale-95 transition-all"
            style={{ background: C.amber, color: "#1A130A" }}
          >
            Restaurar backup
          </button>
          {restoreMsg && (
            <div className="text-xs mt-2" style={{ color: restoreMsg.includes("✓") ? C.green : C.red }}>
              {restoreMsg}
            </div>
          )}
        </Card>

        <div className="text-xs text-center px-4" style={{ color: C.dim }}>
          Líquido = corridas lançadas − combustível lançado. Bateu {brl(metaSemanal)} na semana, o mês anda sozinho.
        </div>
      </div>
    </div>
  );
}
