export interface SystemTemplateMealItem {
  foodId?: string;
  name: string;
  quantity: number;
  measure: string;
  notes?: string;
  foodKcal?: number;
  foodProtein?: number;
  foodCarbs?: number;
  foodFat?: number;
}

export interface SystemTemplateMeal {
  name: string;
  time: string;
  notes?: string;
  items: SystemTemplateMealItem[];
}

export interface SystemDietTemplate {
  id: string;
  title: string;
  goal: string;
  category: 'HIPERTROFIA' | 'EMAGRECIMENTO' | 'LOW_CARB' | 'CETOGENICA' | 'MANUTENCAO' | 'VEGETARIANO';
  targetKcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  fiberG: number;
  durationDays: number;
  notes: string;
  isTemplate: true;
  isSystem: true;
  isActive: true;
  createdAt: string;
  updatedAt: string;
  meals: SystemTemplateMeal[];
}

export const SYSTEM_DIET_TEMPLATES: SystemDietTemplate[] = [
  {
    id: 'system-tpl-deficit-1600',
    title: 'Emagrecimento com Alta Densidade Proteica (1.600 kcal)',
    goal: 'Déficit calórico controlado com saciedade máxima e preservação de massa magra',
    category: 'EMAGRECIMENTO',
    targetKcal: 1600,
    proteinG: 140,
    carbsG: 140,
    fatG: 53,
    fiberG: 30,
    durationDays: 30,
    notes: 'Priorizar mastigação lenta, ingestão hídrica mínima de 35ml/kg e inclusão de vegetais verdes escuros livres no almoço e jantar.',
    isTemplate: true,
    isSystem: true,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    meals: [
      {
        name: 'Café da Manhã Energético',
        time: '07:30',
        notes: 'Omelete com aveia para liberação lenta de glicose.',
        items: [
          { name: 'Ovo de galinha inteiro', quantity: 2, measure: 'unidades', notes: 'Preparado sem óleo ou com spray' },
          { name: 'Clara de ovo pasteurizada', quantity: 100, measure: 'g', notes: 'Adicionar à omelete' },
          { name: 'Farelo de aveia', quantity: 30, measure: 'g' },
          { name: 'Morangos frescos', quantity: 120, measure: 'g' },
          { name: 'Café preto ou chá sem açúcar', quantity: 150, measure: 'ml' },
        ],
      },
      {
        name: 'Almoço Sacietogênico',
        time: '12:30',
        notes: 'Iniciar a refeição pelo prato de folhas e vegetais crus temperados com azeite.',
        items: [
          { name: 'Peito de frango grelhado', quantity: 150, measure: 'g', notes: 'Pesado pronto' },
          { name: 'Arroz integral cozido', quantity: 100, measure: 'g' },
          { name: 'Feijão carioca cozido', quantity: 80, measure: 'g', notes: 'Apenas grãos e caldo ralo' },
          { name: 'Brócolis cozido no vapor', quantity: 120, measure: 'g' },
          { name: 'Mix de folhas verdes (alface, rúcula)', quantity: 80, measure: 'g', notes: 'À vontade' },
          { name: 'Azeite de oliva extravirgem', quantity: 8, measure: 'ml', notes: '1 colher de sobremesa' },
        ],
      },
      {
        name: 'Lanche da Tarde Proteico',
        time: '16:00',
        notes: 'Combinação de proteína e gordura boa para evitar picos de fome ao fim da tarde.',
        items: [
          { name: 'Iogurte natural desnatado ou grego zero', quantity: 160, measure: 'g' },
          { name: 'Whey Protein Isolado ou Concentrado', quantity: 20, measure: 'g' },
          { name: 'Castanha-do-pará ou nozes', quantity: 15, measure: 'g', notes: 'Aprox. 3 unidades' },
        ],
      },
      {
        name: 'Jantar Leve & Reparador',
        time: '19:30',
        notes: 'Menor carga glicêmica noturna para otimização da oxidação lipídica durante o sono.',
        items: [
          { name: 'Filé de tilápia ou peixe branco grelhado', quantity: 160, measure: 'g' },
          { name: 'Abóbora cabotiá cozida/assada', quantity: 150, measure: 'g' },
          { name: 'Abobrinha e cenoura raladas ao vapor', quantity: 120, measure: 'g' },
          { name: 'Azeite de oliva extravirgem', quantity: 7, measure: 'ml' },
        ],
      },
    ],
  },
  {
    id: 'system-tpl-hipertrofia-2400',
    title: 'Hipertrofia & Ganho Muscular Limpo (2.400 kcal)',
    goal: 'Superávit calórico controlado para hipertrofia sem acúmulo excessivo de gordura',
    category: 'HIPERTROFIA',
    targetKcal: 2400,
    proteinG: 180,
    carbsG: 280,
    fatG: 62,
    fiberG: 34,
    durationDays: 45,
    notes: 'Distribuir a ingestão de carboidratos com ênfase no pré e pós-treino para suporte de glicogênio.',
    isTemplate: true,
    isSystem: true,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    meals: [
      {
        name: 'Café da Manhã Anabólico',
        time: '07:00',
        items: [
          { name: 'Ovos inteiros mexidos', quantity: 3, measure: 'unidades' },
          { name: 'Pão 100% integral', quantity: 60, measure: 'g', notes: '2 fatias' },
          { name: 'Queijo cottage ou minas frescal', quantity: 40, measure: 'g' },
          { name: 'Banana prata fatiada', quantity: 100, measure: 'g', notes: '1 unidade média' },
          { name: 'Pasta de amendoim integral', quantity: 15, measure: 'g', notes: '1 colher de sopa' },
        ],
      },
      {
        name: 'Almoço de Performance',
        time: '12:00',
        items: [
          { name: 'Patinho moído ou bife magro', quantity: 160, measure: 'g' },
          { name: 'Arroz branco ou parboilizado', quantity: 180, measure: 'g' },
          { name: 'Feijão preto cozido', quantity: 100, measure: 'g' },
          { name: 'Legumes cozidos (cenoura, vagem)', quantity: 100, measure: 'g' },
          { name: 'Salada mista com azeite', quantity: 80, measure: 'g' },
          { name: 'Azeite de oliva extravirgem', quantity: 10, measure: 'ml' },
        ],
      },
      {
        name: 'Lanche Pré-Treino',
        time: '15:30',
        items: [
          { name: 'Iogurte natural integral', quantity: 170, measure: 'g' },
          { name: 'Aveia em flocos grossos', quantity: 40, measure: 'g' },
          { name: 'Mel puro de abelha', quantity: 15, measure: 'g', notes: '1 colher de sobremesa' },
          { name: 'Whey protein concentrado', quantity: 25, measure: 'g' },
        ],
      },
      {
        name: 'Jantar Pós-Treino',
        time: '19:30',
        items: [
          { name: 'Peito de frango desfiado ou grelhado', quantity: 170, measure: 'g' },
          { name: 'Batata doce ou mandioca cozida', quantity: 200, measure: 'g' },
          { name: 'Salada de folhas verdes com tomate', quantity: 100, measure: 'g' },
          { name: 'Azeite de oliva extravirgem', quantity: 8, measure: 'ml' },
        ],
      },
      {
        name: 'Ceia Recuperadora',
        time: '22:00',
        items: [
          { name: 'Queijo cottage ou proteína de caseína/whey', quantity: 100, measure: 'g' },
          { name: 'Castanhas ou amêndoas torradas', quantity: 15, measure: 'g' },
        ],
      },
    ],
  },
  {
    id: 'system-tpl-lowcarb-1500',
    title: 'Low Carb Funcional & Densidade Nutricional (1.500 kcal)',
    goal: 'Restrição moderada de carboidratos com foco em gorduras monoinsaturadas e fibras',
    category: 'LOW_CARB',
    targetKcal: 1500,
    proteinG: 130,
    carbsG: 75,
    fatG: 75,
    fiberG: 28,
    durationDays: 30,
    notes: 'Manter carboidratos predominantemente de hortaliças, sementes e frutas de baixo índice glicêmico (frutas vermelhas, abacate).',
    isTemplate: true,
    isSystem: true,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    meals: [
      {
        name: 'Café da Manhã Low Carb',
        time: '08:00',
        items: [
          { name: 'Ovos mexidos com espinafre', quantity: 2, measure: 'unidades' },
          { name: 'Queijo parmesão ralado', quantity: 15, measure: 'g' },
          { name: 'Abacate fatiado', quantity: 70, measure: 'g' },
          { name: 'Café preto com canela em pó', quantity: 150, measure: 'ml' },
        ],
      },
      {
        name: 'Almoço Equilibrado',
        time: '12:30',
        items: [
          { name: 'Sobrecoxa de frango sem pele assada', quantity: 160, measure: 'g' },
          { name: 'Purê de couve-flor com azeite', quantity: 150, measure: 'g' },
          { name: 'Salada de rúcula, tomate cereja e pepino', quantity: 120, measure: 'g' },
          { name: 'Azeite de oliva extravirgem', quantity: 12, measure: 'ml' },
        ],
      },
      {
        name: 'Lanche da Tarde Saciedade',
        time: '16:30',
        items: [
          { name: 'Iogurte grego natural sem açúcar', quantity: 140, measure: 'g' },
          { name: 'Semente de chia', quantity: 15, measure: 'g' },
          { name: 'Mirtilos ou amoras', quantity: 60, measure: 'g' },
        ],
      },
      {
        name: 'Jantar Cetogênico Suave',
        time: '20:00',
        items: [
          { name: 'Salmão grelhado ou carne magra grelhada', quantity: 150, measure: 'g' },
          { name: 'Aspargos ou brócolis salteados no azeite', quantity: 140, measure: 'g' },
          { name: 'Mix de folhas verdes', quantity: 80, measure: 'g' },
          { name: 'Azeite de oliva extravirgem', quantity: 10, measure: 'ml' },
        ],
      },
    ],
  },
  {
    id: 'system-tpl-ceto-1700',
    title: 'Cetogênica Terapêutica & Alta Saciedade (1.700 kcal)',
    goal: 'Indução e manutenção de cetose nutricional estável com alta proporção de lipídios saudáveis',
    category: 'CETOGENICA',
    targetKcal: 1700,
    proteinG: 105,
    carbsG: 28,
    fatG: 130,
    fiberG: 20,
    durationDays: 30,
    notes: 'Ingerir eletrólitos (sódio, magnésio, potássio) adequadamente para prevenir a fase de adaptação cetogênica.',
    isTemplate: true,
    isSystem: true,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    meals: [
      {
        name: 'Primeira Refeição Cetogênica',
        time: '09:00',
        items: [
          { name: 'Ovos caipiras fritos no azeite ou ghee', quantity: 3, measure: 'unidades' },
          { name: 'Bacon artesanal grelhado', quantity: 30, measure: 'g' },
          { name: 'Abacate maduro com sal marinho', quantity: 90, measure: 'g' },
        ],
      },
      {
        name: 'Almoço Densidade Lipídica',
        time: '13:30',
        items: [
          { name: 'Costelinha de porco ou corte bovino gordo', quantity: 160, measure: 'g' },
          { name: 'Couve refogada no alho e azeite', quantity: 120, measure: 'g' },
          { name: 'Salada de agrião com azeitonas pretas', quantity: 80, measure: 'g' },
          { name: 'Azeite de oliva extravirgem', quantity: 15, measure: 'ml' },
        ],
      },
      {
        name: 'Lanche Rápido',
        time: '17:00',
        items: [
          { name: 'Castanha de caju e nozes pecã', quantity: 30, measure: 'g' },
          { name: 'Queijo gouda ou prato em cubos', quantity: 40, measure: 'g' },
        ],
      },
      {
        name: 'Jantar Cetogênico',
        time: '20:30',
        items: [
          { name: 'Sobrecoxa de frango com pele assada', quantity: 170, measure: 'g' },
          { name: 'Abobrinha salteada com ervas', quantity: 130, measure: 'g' },
          { name: 'Azeite de oliva extravirgem', quantity: 12, measure: 'ml' },
        ],
      },
    ],
  },
  {
    id: 'system-tpl-manutencao-2000',
    title: 'Normocalórica / Manutenção Saudável (2.000 kcal)',
    goal: 'Estabilização de peso, homeostase metabólica e flexibilidade de rotina',
    category: 'MANUTENCAO',
    targetKcal: 2000,
    proteinG: 135,
    carbsG: 235,
    fatG: 58,
    fiberG: 32,
    durationDays: 60,
    notes: 'Cardápio balanceado com fontes integrais e variedade de fitoquímicos coloridos.',
    isTemplate: true,
    isSystem: true,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    meals: [
      {
        name: 'Café da Manhã Completo',
        time: '07:30',
        items: [
          { name: 'Pão integral ou tapioca com aveia', quantity: 50, measure: 'g' },
          { name: 'Ovos mexidos com queijo branco', quantity: 2, measure: 'unidades' },
          { name: 'Mamão papaia com aveia', quantity: 140, measure: 'g' },
          { name: 'Café com leite desnatado ou vegetal', quantity: 150, measure: 'ml' },
        ],
      },
      {
        name: 'Almoço Tradicional Saudável',
        time: '12:30',
        items: [
          { name: 'Filé de frango ou carne magra grelhada', quantity: 140, measure: 'g' },
          { name: 'Arroz branco ou integral', quantity: 140, measure: 'g' },
          { name: 'Feijão preto ou carioca', quantity: 90, measure: 'g' },
          { name: 'Salada mista crua abundante', quantity: 100, measure: 'g' },
          { name: 'Legume cozido (chuchu, abobrinha)', quantity: 100, measure: 'g' },
          { name: 'Azeite de oliva extravirgem', quantity: 10, measure: 'ml' },
        ],
      },
      {
        name: 'Lanche da Tarde Equilibrado',
        time: '16:00',
        items: [
          { name: 'Iogurte natural integral', quantity: 160, measure: 'g' },
          { name: 'Maçã picada com canela', quantity: 120, measure: 'g' },
          { name: 'Granola sem adição de açúcar', quantity: 25, measure: 'g' },
        ],
      },
      {
        name: 'Jantar Nutritivo',
        time: '19:30',
        items: [
          { name: 'Filé de pescada ou tilápia', quantity: 150, measure: 'g' },
          { name: 'Batata inglesa cozida ou assada', quantity: 160, measure: 'g' },
          { name: 'Salada verde com tomate e pepino', quantity: 100, measure: 'g' },
          { name: 'Azeite de oliva extravirgem', quantity: 8, measure: 'ml' },
        ],
      },
    ],
  },
  {
    id: 'system-tpl-vegano-1900',
    title: 'Vegetariano / Plant-Based Equilibrado (1.900 kcal)',
    goal: 'Alimentação baseada em plantas com perfil completo de aminoácidos e fibras biodisponíveis',
    category: 'VEGETARIANO',
    targetKcal: 1900,
    proteinG: 110,
    carbsG: 245,
    fatG: 53,
    fiberG: 40,
    durationDays: 30,
    notes: 'Garantir consumo de vitamina C junto às fontes de ferro vegetal (ex: limão espremido nas folhas e leguminosas).',
    isTemplate: true,
    isSystem: true,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    meals: [
      {
        name: 'Café da Manhã Plant-Based',
        time: '07:30',
        items: [
          { name: 'Mingau de aveia com leite de soja enriquecido', quantity: 200, measure: 'ml' },
          { name: 'Farelo de aveia', quantity: 35, measure: 'g' },
          { name: 'Proteína vegetal de ervilha/arroz', quantity: 20, measure: 'g' },
          { name: 'Frutas vermelhas ou banana', quantity: 100, measure: 'g' },
          { name: 'Sementes de linhaça moída', quantity: 10, measure: 'g' },
        ],
      },
      {
        name: 'Almoço Rico em Leguminosas',
        time: '12:30',
        items: [
          { name: 'Tofu grelhado com cúrcuma e gengibre', quantity: 160, measure: 'g' },
          { name: 'Quinoa cozida ou arroz integral', quantity: 120, measure: 'g' },
          { name: 'Lentilha ou grão-de-bico cozido', quantity: 110, measure: 'g' },
          { name: 'Couve e folhas escuras com limão', quantity: 100, measure: 'g' },
          { name: 'Azeite de oliva extravirgem', quantity: 10, measure: 'ml' },
        ],
      },
      {
        name: 'Lanche da Tarde Energético',
        time: '16:00',
        items: [
          { name: 'Pasta de grão-de-bico (Homus)', quantity: 50, measure: 'g' },
          { name: 'Palitinhos de cenoura e pepino', quantity: 100, measure: 'g' },
          { name: 'Torradas integrais', quantity: 30, measure: 'g' },
        ],
      },
      {
        name: 'Jantar Confortável',
        time: '19:30',
        items: [
          { name: 'Hambúrguer de lentilha ou feijão artesanal', quantity: 140, measure: 'g' },
          { name: 'Purê de abóbora com noz-moscada', quantity: 150, measure: 'g' },
          { name: 'Salada de brócolis, tomate e sementes de girassol', quantity: 120, measure: 'g' },
          { name: 'Azeite de oliva extravirgem', quantity: 8, measure: 'ml' },
        ],
      },
    ],
  },
];
