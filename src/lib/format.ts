export const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export const MESES_FULL = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

// Segunda a domingo
export const DIAS = ["S", "T", "Q", "Q", "S", "S", "D"];
export const DIAS_CURTO = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];

export const pad = (n: number) => String(n).padStart(2, "0");

export const mondayOf = (d: Date) => {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
};

export const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

/** Índice do dia com segunda = 0 … domingo = 6. */
export const diaIdx = (d: Date) => (d.getDay() + 6) % 7;

export const keyOf = (monday: Date) => `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;

export const brl = (n: number) =>
  "R$ " + (Number.isFinite(n) ? n : 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const parseValor = (s: string) => {
  if (!s) return NaN;
  let t = String(s).trim().replace(/[R$\s]/g, "");
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  return parseFloat(t);
};

export const novoId = (n = 5) => `${Date.now()}-${Math.random().toString(36).slice(2, 2 + n)}`;
