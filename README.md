# Plataforma de estudos para residência

App pessoal de preparação para residência médica: banco de questões de provas oficiais, registro de cada erro,
painel de pontos fracos e fortes, fila de revisão e cards dos erros da semana. Funciona no celular, tablet e
computador como app instalável (PWA) e não chama nenhuma IA, então o uso não gasta tokens.

## Como rodar

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # testes da análise de erros e validação das provas
npm run build
```

No celular: abra o endereço publicado no navegador e use "Adicionar à tela inicial".

## Organização

| Pasta | O que tem |
| --- | --- |
| `app/` | Telas: Início, Questões (montar caderno), Resolver, Painel, Erros |
| `lib/tipos.ts` | Formato de questão, prova, tentativa e revisão |
| `lib/taxonomia.ts` | Árvore de temas (grande área > especialidade > tema). Os ids não devem mudar |
| `lib/analise.ts` | Acerto ajustado, prioridade por tema, estratégia de revisão, cards da semana |
| `lib/db.ts` | Banco local no aparelho (IndexedDB) |
| `data/provas/` | Provas oficiais importadas, uma por arquivo JSON |

## Como a análise funciona

- Cada resposta guarda a alternativa, o tempo e a confiança (certeza, dúvida, chute). Ao errar, você marca o tipo
  de erro e escreve uma linha do que aprendeu.
- **Acerto ajustado** das últimas 20 respostas do tema: acerto com certeza vale 1, com dúvida 0,5, no chute 0.
- **Prioridade** = (1 − acerto ajustado) × incidência do tema nas provas importadas × fator de esquecimento (1 a 2).
- **Revisão**: errou volta em 1 dia; acertos com certeza avançam pelos intervalos 1, 3, 7, 15, 30 e 60 dias.

## Importar uma prova

1. Salve o JSON da prova em `data/provas/` no formato `Prova` de `lib/tipos.ts`.
2. Importe-o em `data/provas/index.ts` e coloque na lista `PROVAS`.
3. Rode `npm run validar-provas` (confere gabarito, alternativas e temas).

## Próximas etapas

- Sincronizar as respostas entre aparelhos (Supabase). Hoje elas ficam no aparelho; use "Baixar cópia" na aba Erros.
- Biblioteca: busca nas apostilas do Google Drive com abertura do PDF na página.
