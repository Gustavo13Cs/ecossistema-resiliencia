# Decisões de execução — biblioteca visual Personal

Ordem original de decisão. Complementa a especificação aprovada; registra escolhas do coordenador e custo de revisão.

1. Aplicar o limite64KiB somente nas fronteiras de persistência/finalização de rascunhos, incluindo snapshots resolvidos/históricos. O resolver compartilhado não impõe esse limite nem normalização de rascunho ao POST direto legado. A especificação vincula o limite ao rascunho e exige compatibilidade da criação manual/direta; os limites anteriores de CreateWorkoutDto e a validação de referências permanecem. Custo se revisto: separar/revisar política, chamadas e testes, sem schema nem autorização novos. Regressão real comprova prescrição direta maior que64KiB aceita com valores preservados e rascunho equivalente rejeitado413.

2. Acrescentar o código estável `DEMONSTRATION_SELECTION_STALE` à resposta409 do resolver, preservando mensagem/status, para distinguir seleção de mídia obsoleta dos conflitos de versão/base do rascunho. A integração pode ajustar somente esse contrato e seus testes no backend; a interface não depende do texto em português para escolher a ação. Custo se revisto: um campo aditivo de erro, um ramo consumidor e testes focados, sem schema, autenticação ou semântica de status novos.
