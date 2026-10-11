# Apurado

Painel do motorista de app: líquido da semana, metas, combustível, trajeto casa ↔ trabalho e blocos de pico. PWA instalável, funciona offline; os dados ficam no `localStorage` do aparelho (com backup/restauração em JSON).

```
npm install
npm run dev       # desenvolvimento
npm run build     # gera dist/ (com service worker)
npm run preview   # serve o build em http://localhost:4173
```

`apurado-original.tsx` é o componente original do artifact, mantido só como referência (não entra no build).
