import { useRef, useState, type ChangeEvent } from "react";
import type { Dados } from "../lib/types";
import { MESES, brl } from "../lib/format";
import { exportarBackup, resumir, validarBackup, type ResumoBackup } from "../lib/backup";
import { C } from "../theme";
import { Card, Eyebrow } from "./ui";

const btnContorno = { border: `1px solid ${C.amber}`, color: C.amber, background: "transparent" };
const btnCheio = { background: C.amber, color: "#1A130A" };

const dataCurta = (k: string) => {
  const [a, m, d] = k.split("-").map(Number);
  return `${d} ${MESES[m - 1]} ${a}`;
};

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

const LinhasResumo = ({ r }: { r: ResumoBackup }) => (
  <ul className="text-sm font-mono flex flex-col gap-1">
    <li>{plural(r.semanas, "semana", "semanas")}</li>
    <li>{plural(r.entradas, "corrida lançada", "corridas lançadas")}</li>
    <li>
      {plural(r.despesas, "despesa", "despesas")}
      {r.despesas > 0 && <span style={{ color: C.dim }}> · {brl(r.totalDespesas)}</span>}
    </li>
    <li>{plural(r.blocos, "bloco de pico", "blocos de pico")}</li>
    {r.periodo && (
      <li style={{ color: C.dim }}>
        {r.periodo.de === r.periodo.ate ? `semana de ${dataCurta(r.periodo.de)}` : `${dataCurta(r.periodo.de)} → ${dataCurta(r.periodo.ate)}`}
      </li>
    )}
  </ul>
);

type Pendente = { dados: Dados; resumo: ResumoBackup; exportadoEm: string | null; formatoAntigo: boolean; nome: string };

export default function BackupArquivo({ data, onImportar }: { data: Dados; onImportar: (d: Dados) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ texto: string; ok: boolean } | null>(null);
  const [pendente, setPendente] = useState<Pendente | null>(null);

  const exportar = async () => {
    setMsg(null);
    try {
      const r = await exportarBackup(data);
      if (r === "cancelado") return;
      setMsg({ texto: r === "compartilhado" ? "Backup exportado ✓" : "Arquivo baixado ✓", ok: true });
    } catch {
      setMsg({ texto: "Não deu pra gerar o arquivo. Tenta de novo.", ok: false });
    }
  };

  const lerArquivo = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setMsg(null);
    setPendente(null);
    let txt: string;
    try {
      txt = await f.text();
    } catch {
      setMsg({ texto: "Não consegui ler o arquivo.", ok: false });
      return;
    }
    const v = validarBackup(txt);
    if (!v.ok) {
      setMsg({ texto: v.erro, ok: false });
      return;
    }
    setPendente({ dados: v.dados, resumo: v.resumo, exportadoEm: v.exportadoEm, formatoAntigo: v.formatoAntigo, nome: f.name });
  };

  const confirmar = () => {
    if (!pendente) return;
    onImportar(pendente.dados);
    setPendente(null);
    setMsg({ texto: "Backup importado ✓ Os dados deste aparelho foram substituídos.", ok: true });
  };

  const exportadoEm = pendente?.exportadoEm ? new Date(pendente.exportadoEm) : null;

  return (
    <Card>
      <Eyebrow>backup em arquivo</Eyebrow>
      <div className="text-xs mb-3" style={{ color: C.dim }}>
        Exporta um arquivo com todos os dados para guardar em Arquivos, iCloud ou mandar pra você mesmo. Para trocar de celular, importa
        esse arquivo no aparelho novo.
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={exportar} className="rounded-lg py-2 text-sm font-semibold active:scale-95 transition-all" style={btnContorno}>
          Exportar backup
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="rounded-lg py-2 text-sm font-semibold active:scale-95 transition-all"
          style={btnContorno}
        >
          Importar backup
        </button>
      </div>
      <input ref={fileRef} type="file" accept=".json,application/json,text/plain" className="hidden" onChange={lerArquivo} />

      {pendente && (
        <div className="mt-3 rounded-xl p-3" style={{ background: C.amberSoft, border: `1px solid ${C.amber}` }}>
          <div className="text-sm font-semibold mb-1">Importar “{pendente.nome}”?</div>
          {exportadoEm && !Number.isNaN(exportadoEm.getTime()) && (
            <div className="text-xs mb-2" style={{ color: C.dim }}>
              Exportado em {exportadoEm.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
            </div>
          )}
          {pendente.formatoAntigo && (
            <div className="text-xs mb-2" style={{ color: C.dim }}>
              Backup no formato antigo, sem data de exportação.
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-mono text-xs uppercase mb-1" style={{ color: C.amber }}>
                no arquivo
              </div>
              <LinhasResumo r={pendente.resumo} />
            </div>
            <div>
              <div className="font-mono text-xs uppercase mb-1" style={{ color: C.dim }}>
                neste aparelho
              </div>
              <div style={{ color: C.dim }}>
                <LinhasResumo r={resumir(data)} />
              </div>
            </div>
          </div>
          <div className="text-xs mt-3 font-semibold" style={{ color: C.amber }}>
            ⚠ Isto substitui todos os dados deste aparelho. Não dá pra desfazer.
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button
              type="button"
              onClick={() => setPendente(null)}
              className="rounded-lg py-2 text-sm font-semibold active:scale-95 transition-all"
              style={{ border: `1px solid ${C.line}`, color: C.dim }}
            >
              Cancelar
            </button>
            <button type="button" onClick={confirmar} className="rounded-lg py-2 text-sm font-semibold active:scale-95 transition-all" style={btnCheio}>
              Substituir dados
            </button>
          </div>
        </div>
      )}

      {msg && (
        <div className="text-xs mt-2" style={{ color: msg.ok ? C.green : C.red }}>
          {msg.texto}
        </div>
      )}
    </Card>
  );
}
