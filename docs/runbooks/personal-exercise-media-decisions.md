# Decisões de execução — biblioteca visual Personal

Ordem original de decisão. Complementa a especificação aprovada; registra escolhas do coordenador e custo de revisão.

1. Aplicar o limite64KiB somente nas fronteiras de persistência/finalização de rascunhos, incluindo snapshots resolvidos/históricos. O resolver compartilhado não impõe esse limite nem normalização de rascunho ao POST direto legado. A especificação vincula o limite ao rascunho e exige compatibilidade da criação manual/direta; os limites anteriores de CreateWorkoutDto e a validação de referências permanecem. Custo se revisto: separar/revisar política, chamadas e testes, sem schema nem autorização novos. Regressão real comprova prescrição direta maior que64KiB aceita com valores preservados e rascunho equivalente rejeitado413.
