import { useState } from "react";
import type { Bloco, Config } from "../lib/types";
import { DIAS, DIAS_CURTO, novoId, parseValor } from "../lib/format";
import { C, inputStyle } from "../theme";
import { Card, CheckRow, DiaPill, Eyebrow } from "./ui";

const DiaSelect = ({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) => (
  <select
    value={value === null ? "" : String(value)}
    onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
    className="rounded-lg px-2 py-2 outline-none text-sm font-mono"
    style={inputStyle}
  >
    <option value="">todo dia</option>
    {DIAS_CURTO.map((d, i) => (
      <option key={d} value={i}>
        {d}
      </option>
    ))}
  </select>
);

const Campo = ({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) => (
  <label className="flex flex-col gap-1 text-sm">
    <span style={{ color: C.dim }}>{label}</span>
    <input
      inputMode="decimal"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg px-3 py-2 font-mono outline-none w-full"
      style={inputStyle}
    />
  </label>
);

export default function Ajustes({ cfg, onAplicar }: { cfg: Config; onAplicar: (c: Config) => void }) {
  const [metaS, setMetaS] = useState(String(cfg.metaSemanal));
  const [metaB, setMetaB] = useState(String(cfg.metaBruta));
  const [metaM, setMetaM] = useState(cfg.metaMensal === null ? "" : String(cfg.metaMensal));
  const [trajeto, setTrajeto] = useState(cfg.trajetoAtivo);
  const [trajetoDias, setTrajetoDias] = useState([...cfg.trajetoDias]);
  const [blocos, setBlocos] = useState<Bloco[]>(cfg.blocos.map((b) => ({ ...b })));
  const [novoNome, setNovoNome] = useState("");
  const [novoDia, setNovoDia] = useState<number | null>(null);

  const msPreview = parseValor(metaS);
  const autoMensal = Math.round(((Number.isFinite(msPreview) && msPreview > 0 ? msPreview : cfg.metaSemanal) * 52) / 12);

  const setBloco = (idx: number, b: Bloco) => setBlocos(blocos.map((x, i) => (i === idx ? b : x)));

  const addBloco = () => {
    const nome = novoNome.trim();
    if (!nome) return;
    setBlocos([...blocos, { id: novoId(4), nome, dia: novoDia }]);
    setNovoNome("");
  };

  const aplicar = () => {
    const ms = parseValor(metaS);
    const mb = parseValor(metaB);
    const mm = parseValor(metaM);
    onAplicar({
      metaSemanal: Number.isFinite(ms) && ms > 0 ? ms : cfg.metaSemanal,
      metaBruta: Number.isFinite(mb) && mb > 0 ? mb : cfg.metaBruta,
      metaMensal: Number.isFinite(mm) && mm > 0 ? mm : null,
      trajetoAtivo: trajeto,
      trajetoDias,
      blocos: blocos.map((b) => ({ ...b, nome: b.nome.trim() })).filter((b) => b.nome.length > 0),
    });
  };

  return (
    <Card>
      <Eyebrow>ajustes</Eyebrow>
      <div className="flex flex-col gap-3">
        <Campo label="Meta líquida da semana (R$)" value={metaS} onChange={setMetaS} />
        <Campo label="Meta bruta da semana, referência (R$)" value={metaB} onChange={setMetaB} />
        <Campo label="Meta líquida do mês (R$)" value={metaM} onChange={setMetaM} placeholder={`automática: ${autoMensal}`} />
        <div className="text-xs" style={{ color: C.dim }}>
          Deixa a meta do mês em branco para calcular sozinha: semanal × 52 ÷ 12.
        </div>

        <CheckRow
          on={trajeto}
          onClick={() => setTrajeto(!trajeto)}
          title="Trajeto casa ↔ trabalho"
          subtitle="Mostra o checklist de corridas no caminho"
        />
        {trajeto && (
          <div>
            <div className="text-xs mb-2" style={{ color: C.dim }}>
              Dias em que tu faz o trajeto
            </div>
            <div className="flex justify-between">
              {DIAS.map((d, i) => (
                <DiaPill
                  key={i}
                  on={trajetoDias[i]}
                  label={d}
                  onClick={() => setTrajetoDias(trajetoDias.map((v, j) => (j === i ? !v : v)))}
                />
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="text-sm mb-2" style={{ color: C.dim }}>
            Blocos de pico (qualquer dia da semana)
          </div>
          <div className="flex flex-col gap-2">
            {blocos.map((b, idx) => (
              <div key={b.id} className="flex items-center gap-2">
                <DiaSelect value={b.dia} onChange={(dia) => setBloco(idx, { ...b, dia })} />
                <input
                  value={b.nome}
                  onChange={(e) => setBloco(idx, { ...b, nome: e.target.value })}
                  className="flex-1 min-w-0 rounded-lg px-3 py-2 outline-none text-sm"
                  style={inputStyle}
                />
                <button
                  type="button"
                  onClick={() => setBlocos(blocos.filter((x) => x.id !== b.id))}
                  className="w-8 h-8 shrink-0 rounded-md text-sm active:scale-95 transition-all"
                  style={{ border: `1px solid ${C.line}`, color: C.red }}
                >
                  ×
                </button>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <DiaSelect value={novoDia} onChange={setNovoDia} />
              <input
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addBloco()}
                placeholder="Novo bloco, ex.: Quarta à noite"
                className="flex-1 min-w-0 rounded-lg px-3 py-2 outline-none text-sm"
                style={inputStyle}
              />
              <button
                type="button"
                onClick={addBloco}
                className="w-8 h-8 shrink-0 rounded-md text-sm font-bold active:scale-95 transition-all"
                style={{ border: `1px solid ${C.amber}`, color: C.amber }}
              >
                +
              </button>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={aplicar}
          className="rounded-lg py-2 font-semibold text-sm active:scale-95 transition-all"
          style={{ background: C.amber, color: "#1A130A" }}
        >
          Aplicar
        </button>
      </div>
    </Card>
  );
}
