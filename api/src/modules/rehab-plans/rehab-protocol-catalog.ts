import { MuscleGroup, RehabItemCategory } from '@prisma/client';
import {
  normalizeExerciseName,
  SAFEMOVE_EXERCISE_CATALOG,
} from '../workouts/exercise-catalog';
import {
  findCatalogDemonstration,
  presentDemonstration,
} from '../workouts/exercise-demonstration';
import type {
  DemonstrationPresentation,
  DemonstrationSnapshot,
} from '../workouts/exercise-demonstration.types';

export interface RehabModalityParams {
  modality: string;
  frequency?: string;
  pulseWidth?: string;
  intensity?: string;
  emissionMode?: string;
  durationMinutes?: number;
  applicationSite?: string;
}

export interface CuratedRehabProtocolExercise {
  name: string;
  category: RehabItemCategory;
  sets?: string;
  reps?: string;
  notes?: string;
  modalityParams?: RehabModalityParams;
  isHomeExercise?: boolean;
  homeFrequency?: string;
  patientInstructions?: string;
  catalogExerciseId?: string;
}

export interface CuratedRehabProtocolSession {
  name: string;
  focus: string;
  estimatedWeeks: number;
  progressionCriteria: string;
  exercises: CuratedRehabProtocolExercise[];
}

export interface CuratedRehabProtocol {
  id: string;
  conditionArea: string;
  title: string;
  goal: string;
  durationWeeks: number;
  notes: string;
  sessions: CuratedRehabProtocolSession[];
}

export interface PhysioExerciseCatalogItem {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: string;
  notes: string | null;
  hasIllustration: boolean;
  demonstration: DemonstrationPresentation | null;
}

export const SAFEMOVE_REHAB_PROTOCOLS: readonly CuratedRehabProtocol[] = [
  {
    id: 'proto-lca-pos-op',
    conditionArea: 'Joelho',
    title: 'Pós-Operatório de Reconstrução de LCA',
    goal: 'Controle de edema e dor, recuperação de extensão total e retorno funcional seguro',
    durationWeeks: 16,
    notes:
      'Evitar cadeia cinética aberta em ângulos finais nas semanas iniciais conforme orientação cirúrgica. Aplicar compressa fria por 15 a 20 minutos após os exercícios domiciliares se houver desconforto ou edema.',
    sessions: [
      {
        name: 'Fase 1 - Proteção e Analgesia',
        focus:
          'Controle de dor/edema, extensão completa e ativação quadricipital',
        estimatedWeeks: 4,
        progressionCriteria:
          'Extensão passiva simétrica (0°), flexão ativa >= 90°, redução importante do derrame articular e bom recrutamento de quadríceps sem lag extensor.',
        exercises: [
          {
            name: 'FES + Ativação Isométrica de Quadríceps',
            category: RehabItemCategory.ELECTROTHERAPY,
            sets: '20 min',
            reps: '10s ON / 10s OFF',
            notes:
              'Eletrodos no vasto medial e reto femoral durante contração voluntária.',
            modalityParams: {
              modality: 'FES',
              frequency: '50 Hz',
              pulseWidth: '300 µs',
              intensity: 'Contração muscular visível e confortável',
              emissionMode: 'Síncrono 10s/10s',
              durationMinutes: 20,
              applicationSite: 'Quadríceps femoral (vasto medial / lateral)',
            },
          },
          {
            name: 'Crioterapia Compressiva Pós-Sessão',
            category: RehabItemCategory.THERMOTHERAPY,
            sets: '20 min',
            reps: 'Contínuo',
            notes: 'Proteger incisão cirúrgica com barreira fina.',
            modalityParams: {
              modality: 'Crioterapia',
              emissionMode: 'Compressa fria + elevação',
              durationMinutes: 20,
              applicationSite: 'Articulação do joelho (face anterior)',
            },
          },
          {
            name: 'Mobilização Patelofemoral e Deslizamento para Extensão',
            category: RehabItemCategory.MANUAL_THERAPY,
            sets: '3',
            reps: '10 ciclos lentos',
            notes: 'Restaurar mobilidade superior/inferior da patela.',
            isHomeExercise: true,
            homeFrequency: '2x ao dia',
            patientInstructions:
              'Sentado com a perna esticada e uma toalha enrolada sob o calcanhar, relaxe o joelho deixando a parte posterior aproximar suavemente do apoio por 30 segundos.',
          },
        ],
      },
      {
        name: 'Fase 2 - Ganho de ADM e Fortalecimento Inicial',
        focus: 'Cadeia cinética fechada controlada e fortalecimento posterior',
        estimatedWeeks: 6,
        progressionCriteria:
          'Flexão >= 125°, marcha sem muletas e sem claudicação, EVA <= 2 após sessão e equilíbrio unipodal estável por 30 segundos.',
        exercises: [
          {
            name: 'Agachamento livre (amplitude controlada)',
            category: RehabItemCategory.KINESIOTHERAPY,
            catalogExerciseId: 'cat-quads-01',
            sets: '3',
            reps: '12',
            notes:
              'Executar entre 0° e 60° de flexão, sem valgo dinâmico e sem carga axial externa no início.',
            isHomeExercise: true,
            homeFrequency: '1x ao dia (dias alternados)',
            patientInstructions:
              'Com os pés afastados na largura dos ombros, agache apenas até metade do movimento mantendo os joelhos alinhados aos pés e retorne devagar.',
          },
          {
            name: 'Mesa flexora',
            category: RehabItemCategory.KINESIOTHERAPY,
            catalogExerciseId: 'cat-hams-05',
            sets: '3',
            reps: '12',
            notes: 'Carga leve a moderada protegendo o enxerto.',
          },
        ],
      },
      {
        name: 'Fase 3 - Força, Estabilidade de Core e Retorno Funcional',
        focus: 'Controle neuromuscular lombo-pélvico e fortalecimento global',
        estimatedWeeks: 6,
        progressionCriteria:
          'Simetria de força >= 85%, LEFS >= 68/80 e ausência de edema reativo após treinos funcionais.',
        exercises: [
          {
            name: 'Prancha abdominal (ventral)',
            category: RehabItemCategory.KINESIOTHERAPY,
            catalogExerciseId: 'cat-core-01',
            sets: '3',
            reps: '30 segundos',
            notes:
              'Integrar controle pélvico para prevenção de valgo dinâmico.',
            isHomeExercise: true,
            homeFrequency: '3x na semana',
            patientInstructions:
              'Apoie os antebraços e as pontas dos pés mantendo o tronco alinhado, sem deixar a lombar cair. Respire normalmente durante os 30 segundos.',
          },
        ],
      },
    ],
  },
  {
    id: 'proto-entorse-tornozelo',
    conditionArea: 'Tornozelo / Pé',
    title: 'Entorse Lateral de Tornozelo (Grau I–II)',
    goal: 'Reduzir dor e edema agudo, restaurar dorsiflexão e recuperar propriocepção para marcha e esporte',
    durationWeeks: 6,
    notes:
      'Utilizar calçado estável nas primeiras semanas e evitar superfícies irregulares sem supervisão. Suspender exercícios caso apareça dor aguda pontual lateral.',
    sessions: [
      {
        name: 'Fase 1 - Proteção e Redução do Edema',
        focus:
          'Analgesia, drenagem e mobilidade ativa livre de carga excessiva',
        estimatedWeeks: 2,
        progressionCriteria:
          'Descarga de peso completa sem dor intensa (EVA <= 3), redução visível do edema maleolar.',
        exercises: [
          {
            name: 'TENS Convencional + Elevação',
            category: RehabItemCategory.ELECTROTHERAPY,
            sets: '20 min',
            reps: 'Contínuo',
            notes:
              'Aplicar ao redor do compartimento lateral sem sobrepor áreas com lesão cutânea.',
            modalityParams: {
              modality: 'TENS',
              frequency: '100 Hz',
              pulseWidth: '80 µs',
              intensity: 'Limiar sensitivo forte e confortável',
              emissionMode: 'Convencional contínuo',
              durationMinutes: 20,
              applicationSite: 'Região perimaleolar lateral',
            },
          },
          {
            name: 'Crioterapia Pós-Carga',
            category: RehabItemCategory.THERMOTHERAPY,
            sets: '15 min',
            reps: 'Contínuo',
            modalityParams: {
              modality: 'Crioterapia',
              emissionMode: 'Bolsa de gelo protegida por tecido',
              durationMinutes: 15,
              applicationSite: 'Tornozelo lateral',
            },
          },
          {
            name: 'Bombeamento Tíbio-Társico e Alfabeto com o Pé',
            category: RehabItemCategory.KINESIOTHERAPY,
            sets: '3',
            reps: '20 movimentos',
            notes: 'Mobilização ativa em amplitude indolor.',
            isHomeExercise: true,
            homeFrequency: '2x ao dia',
            patientInstructions:
              'Sentado com o pé apoiado ou elevado, movimente o tornozelo para cima e para baixo devagar e desenhe as letras no ar sem forçar a dor.',
          },
        ],
      },
      {
        name: 'Fase 2 - Dorsiflexão e Esversores',
        focus: 'Ganho de dorsiflexão e fortalecimento dos fibulares',
        estimatedWeeks: 2,
        progressionCriteria:
          'Dorsiflexão em cadeia fechada com diferença < 2 cm em relação ao lado contralateral.',
        exercises: [
          {
            name: 'Mobilização Posterior do Tálus + Lunge de Dorsiflexão',
            category: RehabItemCategory.MANUAL_THERAPY,
            sets: '3',
            reps: '12',
            notes:
              'Avançar joelho sobre o 2º dedo mantendo o calcanhar apoiado.',
            isHomeExercise: true,
            homeFrequency: '1x ao dia',
            patientInstructions:
              'Em pé próximo à parede, leve o joelho à frente em direção à parede sem tirar o calcanhar do chão e retorne devagar.',
          },
        ],
      },
      {
        name: 'Fase 3 - Propriocepção e Retorno Funcional',
        focus: 'Equilíbrio unipodal e estabilidade dinâmica',
        estimatedWeeks: 2,
        progressionCriteria:
          'Apoio unipodal estável por 30s com olhos abertos/fechados e saltitos leves indolores.',
        exercises: [
          {
            name: 'Equilíbrio Unipodal com Alcances Controlados',
            category: RehabItemCategory.KINESIOTHERAPY,
            sets: '3',
            reps: '30 segundos por lado',
            isHomeExercise: true,
            homeFrequency: '1x ao dia',
            patientInstructions:
              'Fique apoiado em um pé só próximo a uma cadeira de apoio. Mantenha o tornozelo firme evitando balançar excessivamente.',
          },
        ],
      },
    ],
  },
  {
    id: 'proto-lombalgia-mecanica',
    conditionArea: 'Coluna Lombar',
    title: 'Lombalgia Mecânica & Controle Motor Lombar',
    goal: 'Controlar dor aguda, evitar imobilismo prolongado e construir resistência de core sem sobrecarga lombar',
    durationWeeks: 8,
    notes:
      'Manter caminhadas leves diárias conforme tolerado e evitar longos períodos sentado sem pausas de 45 minutos.',
    sessions: [
      {
        name: 'Fase 1 - Modulação da Dor e Mobilidade Suave',
        focus: 'Analgesia, descompressão ativa e controle respiratório',
        estimatedWeeks: 2,
        progressionCriteria:
          'EVA em repouso <= 3, ausência de irradiação distal progressiva e sono preservado.',
        exercises: [
          {
            name: 'TENS Lombar + Termoterapia Superficial',
            category: RehabItemCategory.ELECTROTHERAPY,
            sets: '20 min',
            reps: 'Contínuo',
            modalityParams: {
              modality: 'TENS',
              frequency: '80 Hz',
              pulseWidth: '100 µs',
              intensity: 'Sensação de formigamento confortável',
              emissionMode: 'Modulado (VIF)',
              durationMinutes: 20,
              applicationSite: 'Musculatura paravertebral lombar (L3–S1)',
            },
          },
          {
            name: 'Calor Superficial (Bolsa Térmica)',
            category: RehabItemCategory.THERMOTHERAPY,
            sets: '15 min',
            reps: 'Contínuo',
            modalityParams: {
              modality: 'Termoterapia',
              intensity: 'Calor agradável sem risco térmico',
              emissionMode: 'Contínuo',
              durationMinutes: 15,
              applicationSite: 'Região lombar',
            },
            isHomeExercise: true,
            homeFrequency: '1x ao dia antes dos exercícios',
            patientInstructions:
              'Aplique compressa morna envolvida em toalha sobre a região lombar por 15 minutos antes de iniciar os exercícios suaves.',
          },
        ],
      },
      {
        name: 'Fase 2 - Controle Motor de Core',
        focus:
          'Estabilização lombar em baixa carga e coordenação tronco-quadril',
        estimatedWeeks: 3,
        progressionCriteria:
          'Execução de 3 séries limpas de Dead Bug e Bird Dog sem hiperextensão lombar ou dor após a sessão.',
        exercises: [
          {
            name: 'Dead bug',
            category: RehabItemCategory.KINESIOTHERAPY,
            catalogExerciseId: 'cat-core-10',
            sets: '3',
            reps: '10 alternadas',
            notes: 'Monitorar contato suave da lombar sem prender respiração.',
            isHomeExercise: true,
            homeFrequency: '1x ao dia',
            patientInstructions:
              'Deite-se de barriga para cima, levante braços e pernas dobradas e estenda lentamente um braço e a perna oposta mantendo a barriga levemente firme.',
          },
          {
            name: 'Perdigueiro (Bird dog)',
            category: RehabItemCategory.KINESIOTHERAPY,
            catalogExerciseId: 'cat-core-11',
            sets: '3',
            reps: '10 por lado',
            notes: 'Evitar rotação pélvica durante a extensão do quadril.',
            isHomeExercise: true,
            homeFrequency: '1x ao dia',
            patientInstructions:
              'Em quatro apoios no colchonete, estenda um braço à frente e a perna oposta para trás mantendo as costas retas. Retorne devagar.',
          },
        ],
      },
      {
        name: 'Fase 3 - Resistência Funcional e Prevenção',
        focus: 'Estabilidade lateral e força global de membros inferiores',
        estimatedWeeks: 3,
        progressionCriteria:
          'Oswestry <= 14% e tolerância completa às atividades diárias e laborais.',
        exercises: [
          {
            name: 'Prancha lateral',
            category: RehabItemCategory.KINESIOTHERAPY,
            catalogExerciseId: 'cat-core-02',
            sets: '3',
            reps: '25 segundos cada lado',
            notes:
              'Pode iniciar com joelhos flexionados se houver fadiga precoce.',
            isHomeExercise: true,
            homeFrequency: '3x na semana',
            patientInstructions:
              'Apoiado de lado no antebraço, eleve o quadril alinhando o corpo e sustente pelo tempo orientado sem deixar o tronco girar.',
          },
        ],
      },
    ],
  },
  {
    id: 'proto-manguito-impacto',
    conditionArea: 'Ombro',
    title: 'Síndrome do Impacto Subacromial / Manguito Rotador',
    goal: 'Reduzir irritabilidade subacromial, melhorar discinesia escapular e fortalecer manguito rotador',
    durationWeeks: 8,
    notes:
      'Evitar elevações repetidas acima de 90° com carga elevada na fase inicial e adaptar posições de sono evitando deitar sobre o ombro sintomático.',
    sessions: [
      {
        name: 'Fase 1 - Analgesia e Mobilidade Escapular',
        focus: 'Descompressão articular, terapia manual e controle escapular',
        estimatedWeeks: 2,
        progressionCriteria:
          'Dor noturna controlada e elevação ativa indolor até 100° no plano da escápula.',
        exercises: [
          {
            name: 'Liberação Miofascial Peitoral Menor e Infraespinal + Mobilização Posterior',
            category: RehabItemCategory.MANUAL_THERAPY,
            sets: '12 min',
            reps: 'Grau II-III indolor',
            notes: 'Associar mobilização torácica em extensão.',
          },
          {
            name: 'Educação Postural e Higiene de Movimentos Acima da Cabeça',
            category: RehabItemCategory.EDUCATION,
            sets: 'Contínuo',
            reps: 'Diário',
            isHomeExercise: true,
            homeFrequency: 'Diário',
            patientInstructions:
              'Ao alcançar objetos altos, aproxime o corpo antes de elevar o braço e mantenha os ombros relaxados longe das orelhas.',
          },
        ],
      },
      {
        name: 'Fase 2 - Fortalecimento Escapular e Elevação Controlada',
        focus: 'Retratores escapulares e deltoide no plano escapular',
        estimatedWeeks: 3,
        progressionCriteria:
          'Elevação ativa > 150° sem arco doloroso intenso e SPADI reduzido em >= 15 pontos.',
        exercises: [
          {
            name: 'Remada sentado na polia baixa',
            category: RehabItemCategory.KINESIOTHERAPY,
            catalogExerciseId: 'cat-back-10',
            sets: '3',
            reps: '12',
            notes: 'Focar em retração e depressão escapular sem elevar ombros.',
          },
          {
            name: 'Elevação lateral com halteres (plano da escápula)',
            category: RehabItemCategory.KINESIOTHERAPY,
            catalogExerciseId: 'cat-shoulders-05',
            sets: '3',
            reps: '12',
            notes:
              'Executar a 30° à frente do plano frontal, até 90° de abdução com carga leve.',
            isHomeExercise: true,
            homeFrequency: '3x na semana',
            patientInstructions:
              'Em pé, eleve os braços levemente à frente do corpo (em V aberto) até a altura dos ombros com pesos leves ou sem peso, controlando a descida.',
          },
        ],
      },
      {
        name: 'Fase 3 - Resistência Funcional de Ombro',
        focus: 'Estabilidade dinâmica acima da linha do ombro',
        estimatedWeeks: 3,
        progressionCriteria:
          'Força MRC 5/5 em abdução e rotações sem dor compensatória.',
        exercises: [
          {
            name: 'Elevação frontal alternada com halteres',
            category: RehabItemCategory.KINESIOTHERAPY,
            catalogExerciseId: 'cat-shoulders-08',
            sets: '3',
            reps: '10 por braço',
            notes:
              'Subida controlada até amplitude prescrita sem compensar com lombar.',
            isHomeExercise: true,
            homeFrequency: '3x na semana',
            patientInstructions:
              'Em pé, eleve um braço de cada vez à frente do corpo com o cotovelo levemente dobrado e retorne devagar.',
          },
        ],
      },
    ],
  },
  {
    id: 'proto-dor-patelofemoral',
    conditionArea: 'Joelho',
    title: 'Dor Patelofemoral / Condromalácia',
    goal: 'Controlar sobrecarga patelofemoral e fortalecer abdutores do quadril e quadríceps',
    durationWeeks: 8,
    notes:
      'Reduzir temporariamente corridas em descida e agachamentos profundos que reproduzam dor > 3/10.',
    sessions: [
      {
        name: 'Fase 1 - Controle de Sintomas e Ativação Quadril/Quadríceps',
        focus: 'Redução de irritabilidade e recrutamento em ângulos protegidos',
        estimatedWeeks: 3,
        progressionCriteria:
          'Descer escadas com dor <= 2/10 e ausência de crepitação dolorosa nas séries básicas.',
        exercises: [
          {
            name: 'TENS + Crioterapia em Caso de Sobrecarga',
            category: RehabItemCategory.ELECTROTHERAPY,
            sets: '20 min',
            reps: 'Contínuo',
            modalityParams: {
              modality: 'TENS',
              frequency: '100 Hz',
              pulseWidth: '60 µs',
              intensity: 'Limiar sensitivo confortável',
              emissionMode: 'Convencional',
              durationMinutes: 20,
              applicationSite: 'Região peripatelar',
            },
          },
          {
            name: 'Prancha lateral (foco em glúteo médio e core)',
            category: RehabItemCategory.KINESIOTHERAPY,
            catalogExerciseId: 'cat-core-02',
            sets: '3',
            reps: '25 segundos por lado',
            isHomeExercise: true,
            homeFrequency: '1x ao dia',
            patientInstructions:
              'Apoie o antebraço lateralmente e mantenha quadril elevado e alinhado por 25 segundos de cada lado.',
          },
        ],
      },
      {
        name: 'Fase 2 - Fortalecimento Posterolateral e Cadeia Fechada',
        focus: 'Controle de alinhamento patelar em cadeia fechada',
        estimatedWeeks: 5,
        progressionCriteria:
          'Agachamento em 60° e descida de degrau sem valgo dinâmico e LEFS >= 70/80.',
        exercises: [
          {
            name: 'Agachamento livre (alinhamento de joelhos)',
            category: RehabItemCategory.KINESIOTHERAPY,
            catalogExerciseId: 'cat-quads-01',
            sets: '3',
            reps: '12',
            notes: 'Controle rigoroso do alinhamento joelho–segundo dedo.',
            isHomeExercise: true,
            homeFrequency: '3x na semana',
            patientInstructions:
              'Agache de forma controlada até onde estiver confortável mantendo os joelhos alinhados para frente (sem cair para dentro).',
          },
          {
            name: 'Cadeira flexora',
            category: RehabItemCategory.KINESIOTHERAPY,
            catalogExerciseId: 'cat-hams-06',
            sets: '3',
            reps: '12',
            notes: 'Equilibrar relação isquiotibiais/quadríceps.',
          },
        ],
      },
    ],
  },
  {
    id: 'proto-cervicalgia-tensional',
    conditionArea: 'Coluna Cervical',
    title: 'Cervicalgia Mecânica & Disfunção Cervicoescapular',
    goal: 'Aliviar tensão cervical e escapular, restaurar ADM cervical e fortalecer estabilizadores escapulares',
    durationWeeks: 6,
    notes:
      'Realizar pausas ergonômicas a cada 50 minutos ajustando a altura do monitor na linha dos olhos.',
    sessions: [
      {
        name: 'Fase 1 - Analgesia, Terapia Manual e Higiene Postural',
        focus:
          'Redução de espasmo de trapézio superior/elevador da escápula e mobilidade cervical',
        estimatedWeeks: 2,
        progressionCriteria:
          'Rotação cervical simétrica com EVA <= 3 e redução de cefaleia tensional associada.',
        exercises: [
          {
            name: 'Termoterapia Superficial Cervical + Liberação Miofascial',
            category: RehabItemCategory.THERMOTHERAPY,
            sets: '15 min',
            reps: 'Contínuo',
            modalityParams: {
              modality: 'Termoterapia',
              intensity: 'Calor morno confortável',
              emissionMode: 'Contínuo',
              durationMinutes: 15,
              applicationSite: 'Região cervical posterior e trapézio superior',
            },
            isHomeExercise: true,
            homeFrequency: '1x ao dia no fim da tarde',
            patientInstructions:
              'Use bolsa térmica morna envolvida em toalha nos ombros e nuca por 15 minutos mantendo os ombros soltos.',
          },
          {
            name: 'Mobilização Articular Cervical e Flexão Crânio-Cervical',
            category: RehabItemCategory.MANUAL_THERAPY,
            sets: '3',
            reps: '10 segundos x 8',
            notes: 'Ativação suave de flexores profundos sem recrutar ECM.',
            isHomeExercise: true,
            homeFrequency: '2x ao dia',
            patientInstructions:
              'Sentado com as costas apoiadas, faça um leve movimento de "sim" deslizando o queixo suavemente para dentro sem tensões.',
          },
        ],
      },
      {
        name: 'Fase 2 - Fortalecimento Escapular e Resistência Postural',
        focus: 'Melhora da capacidade de suporte escapulotorácico',
        estimatedWeeks: 4,
        progressionCriteria:
          'NDI <= 10% e jornada de trabalho completa sem dor cervical limitante.',
        exercises: [
          {
            name: 'Remada sentado na polia baixa',
            category: RehabItemCategory.KINESIOTHERAPY,
            catalogExerciseId: 'cat-back-10',
            sets: '3',
            reps: '12',
          },
          {
            name: 'Encolhimento com halteres (controle excêntrico)',
            category: RehabItemCategory.KINESIOTHERAPY,
            catalogExerciseId: 'cat-back-14',
            sets: '3',
            reps: '12',
            notes:
              'Ênfase em retorno lento para controle neuromuscular do trapézio superior.',
            isHomeExercise: true,
            homeFrequency: '2x na semana',
            patientInstructions:
              'Em pé com pesos leves nas mãos ao lado do corpo, eleve suavemente os ombros e desça bem devagar até relaxar completamente.',
          },
        ],
      },
    ],
  },
];

export function resolveRehabCatalogSnapshot(
  catalogExerciseId?: string | null,
): { found: boolean; snapshot: DemonstrationSnapshot | null } {
  if (!catalogExerciseId) return { found: true, snapshot: null };
  const entry = SAFEMOVE_EXERCISE_CATALOG.find(
    (item) => item.id === catalogExerciseId,
  );
  if (!entry) return { found: false, snapshot: null };
  return { found: true, snapshot: findCatalogDemonstration(catalogExerciseId) };
}

export function presentRehabPlan<
  T extends {
    sessions?: Array<{
      exercises?: Array<{
        demonstrationSnapshot?: unknown;
      }>;
    }>;
  },
>(plan: T): T {
  if (!Array.isArray(plan.sessions)) return plan;
  return {
    ...plan,
    sessions: plan.sessions.map((session) => ({
      ...session,
      exercises: Array.isArray(session.exercises)
        ? session.exercises.map((exercise) => ({
            ...exercise,
            demonstrationSnapshot: presentDemonstration(
              (exercise.demonstrationSnapshot ??
                null) as DemonstrationSnapshot | null,
            ),
          }))
        : session.exercises,
    })),
  };
}

export function listPhysioExerciseCatalog(query: {
  q?: string;
  muscleGroup?: MuscleGroup;
  onlyWithIllustration?: 'true' | 'false';
}): PhysioExerciseCatalogItem[] {
  const normalizedQuery = query.q ? normalizeExerciseName(query.q) : '';
  return SAFEMOVE_EXERCISE_CATALOG.flatMap((entry) => {
    if (query.muscleGroup && entry.muscleGroup !== query.muscleGroup) {
      return [];
    }
    if (
      normalizedQuery &&
      !normalizeExerciseName(entry.name).includes(normalizedQuery)
    ) {
      return [];
    }
    const presentation = presentDemonstration(
      findCatalogDemonstration(entry.id),
    );
    const hasIllustration = Boolean(
      presentation?.assets?.some(
        (asset) => asset.type === 'IMAGE' && asset.displayAllowed,
      ),
    );
    if (query.onlyWithIllustration === 'true' && !hasIllustration) {
      return [];
    }
    return [
      {
        id: entry.id,
        name: entry.name,
        muscleGroup: entry.muscleGroup,
        equipment: entry.equipment,
        notes: entry.notes ?? null,
        hasIllustration,
        demonstration: presentation,
      },
    ];
  });
}
