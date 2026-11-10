import { useState } from "react";
import type { Dados } from "../lib/types";
import { pad } from "../lib/format";
import { importarJSON } from "../lib/storage";
import { C, inputStyle } from "../theme";
import { Card, Eyebrow } from "./ui";

const btnContorno = { border: `1px solid ${C.amber}`, color: C.amber, background: "transparent" };
const btnCheio = { background: C.amber, color: "#1A130A" };

export default function Backup({
  data,
  erroSave,
  lastSaved,
  onRestaurar,
}: {
  data: Dados;
  erroSave: boolean;
  lastSaved: Date | null;
  onRestaurar: (d: Dados) => void;
}) {
  const [backupText, setBackupText] = useState("");
  const [copyMsg, setCopyMsg] = useState("");
  const [restoreText, setRestoreText] = useState("");
  const [restoreMsg, setRestoreMsg] = useState("");

  const gerarCodigo = async () => {
    const txt = JSON.stringify(data);
    setBackupText(txt);
    try {
      await navigator.clipboard.writeText(txt);
      setCopyMsg("Copiado para a área de transferência ✓");
    } catch {
      setCopyMsg("Toca e segura no texto abaixo para copiar.");
    }
  };

  const restaurar = (txt: string) => {
    try {
      onRestaurar(importarJSON(txt));
      setRestoreMsg("Dados restaurados ✓");
      setRestoreText("");
    } catch {
      setRestoreMsg("Esse conteúdo não é um backup válido.");
    }
  };

  return (
    <Card>
      <div className="flex items-center justify-between">
        <Eyebrow>backup dos dados</Eyebrow>
        <span className="font-mono text-xs" style={{ color: erroSave ? C.red : lastSaved ? C.green : C.dim }}>
          {erroSave
            ? "sem salvar automático"
            : lastSaved
              ? `salvo ${pad(lastSaved.getHours())}:${pad(lastSaved.getMinutes())}`
              : "salvo neste aparelho"}
        </span>
      </div>
      <div className="text-xs mb-3" style={{ color: C.dim }}>
        Os dados ficam só neste aparelho. Pra guardar um arquivo, usa “Exportar backup” em ajustes. Aqui dá pra copiar os dados como código e colar no aparelho novo.
      </div>
      <div className="grid gap-2">
        <button type="button" onClick={gerarCodigo} className="w-full rounded-lg py-2 text-sm font-semibold active:scale-95 transition-all" style={btnContorno}>
          Copiar código
        </button>
      </div>
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
          style={{ ...inputStyle, color: C.dim }}
        />
      )}

      <div className="my-3" style={{ borderTop: `1px solid ${C.line}` }} />

      <textarea
        value={restoreText}
        onChange={(e) => setRestoreText(e.target.value)}
        rows={2}
        placeholder="Cola aqui um código de backup"
        className="w-full rounded-lg px-3 py-2 font-mono text-xs outline-none"
        style={inputStyle}
      />
      <button
        type="button"
        onClick={() => restoreText.trim() && restaurar(restoreText)}
        className="w-full mt-2 rounded-lg py-2 text-sm font-semibold active:scale-95 transition-all"
        style={btnCheio}
      >
        Restaurar backup
      </button>
      {restoreMsg && (
        <div className="text-xs mt-2" style={{ color: restoreMsg.includes("✓") ? C.green : C.red }}>
          {restoreMsg}
        </div>
      )}
    </Card>
  );
}
