import { ExerciseEquipment, MuscleGroup } from '@prisma/client';
import type { DemonstrationPresentation } from './exercise-demonstration.types';

export interface CatalogExerciseSeed {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: ExerciseEquipment;
  notes?: string;
}

export interface ExerciseLibraryItem {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: ExerciseEquipment | null;
  notes: string | null;
  source: 'CATALOG' | 'CUSTOM';
  hasDemonstration: boolean;
  demonstrationTypes: ('IMAGE' | 'VIDEO')[];
}

export interface ExerciseLibraryDetail extends ExerciseLibraryItem {
  demonstration: DemonstrationPresentation | null;
  mediaVersion: number | null;
}

export function normalizeExerciseName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export const SAFEMOVE_EXERCISE_CATALOG: readonly CatalogExerciseSeed[] = [
  // CHEST (Peitoral)
  {
    id: 'cat-chest-01',
    name: 'Supino reto com barra',
    muscleGroup: 'CHEST',
    equipment: 'BARBELL',
  },
  {
    id: 'cat-chest-02',
    name: 'Supino reto com halteres',
    muscleGroup: 'CHEST',
    equipment: 'DUMBBELL',
  },
  {
    id: 'cat-chest-03',
    name: 'Supino inclinado com barra',
    muscleGroup: 'CHEST',
    equipment: 'BARBELL',
  },
  {
    id: 'cat-chest-04',
    name: 'Supino inclinado com halteres',
    muscleGroup: 'CHEST',
    equipment: 'DUMBBELL',
  },
  {
    id: 'cat-chest-05',
    name: 'Supino declinado com barra',
    muscleGroup: 'CHEST',
    equipment: 'BARBELL',
  },
  {
    id: 'cat-chest-06',
    name: 'Supino articulado na máquina',
    muscleGroup: 'CHEST',
    equipment: 'MACHINE',
  },
  {
    id: 'cat-chest-07',
    name: 'Supino inclinado no Smith',
    muscleGroup: 'CHEST',
    equipment: 'SMITH',
  },
  {
    id: 'cat-chest-08',
    name: 'Crucifixo reto com halteres',
    muscleGroup: 'CHEST',
    equipment: 'DUMBBELL',
  },
  {
    id: 'cat-chest-09',
    name: 'Crucifixo inclinado com halteres',
    muscleGroup: 'CHEST',
    equipment: 'DUMBBELL',
  },
  {
    id: 'cat-chest-10',
    name: 'Voador peitoral (Peck Deck)',
    muscleGroup: 'CHEST',
    equipment: 'MACHINE',
  },
  {
    id: 'cat-chest-11',
    name: 'Crossover polia alta',
    muscleGroup: 'CHEST',
    equipment: 'CABLE',
  },
  {
    id: 'cat-chest-12',
    name: 'Crossover polia média',
    muscleGroup: 'CHEST',
    equipment: 'CABLE',
  },
  {
    id: 'cat-chest-13',
    name: 'Crossover polia baixa',
    muscleGroup: 'CHEST',
    equipment: 'CABLE',
  },
  {
    id: 'cat-chest-14',
    name: 'Flexão de braços no solo',
    muscleGroup: 'CHEST',
    equipment: 'BODYWEIGHT',
  },
  {
    id: 'cat-chest-15',
    name: 'Paralelas foco peitoral',
    muscleGroup: 'CHEST',
    equipment: 'BODYWEIGHT',
  },

  // BACK (Costas / Dorsal)
  {
    id: 'cat-back-01',
    name: 'Puxada frontal aberta na polia',
    muscleGroup: 'BACK',
    equipment: 'CABLE',
  },
  {
    id: 'cat-back-02',
    name: 'Puxada frontal com triângulo',
    muscleGroup: 'BACK',
    equipment: 'CABLE',
  },
  {
    id: 'cat-back-03',
    name: 'Puxada supinada na polia',
    muscleGroup: 'BACK',
    equipment: 'CABLE',
  },
  {
    id: 'cat-back-04',
    name: 'Barra fixa pronada',
    muscleGroup: 'BACK',
    equipment: 'BODYWEIGHT',
  },
  {
    id: 'cat-back-05',
    name: 'Barra fixa supinada (Chin-up)',
    muscleGroup: 'BACK',
    equipment: 'BODYWEIGHT',
  },
  {
    id: 'cat-back-06',
    name: 'Remada curvada com barra pronada',
    muscleGroup: 'BACK',
    equipment: 'BARBELL',
  },
  {
    id: 'cat-back-07',
    name: 'Remada curvada supinada (Yates Row)',
    muscleGroup: 'BACK',
    equipment: 'BARBELL',
  },
  {
    id: 'cat-back-08',
    name: 'Remada cavalinho (T-Bar)',
    muscleGroup: 'BACK',
    equipment: 'BARBELL',
  },
  {
    id: 'cat-back-09',
    name: 'Remada unilateral com halter (Serrote)',
    muscleGroup: 'BACK',
    equipment: 'DUMBBELL',
  },
  {
    id: 'cat-back-10',
    name: 'Remada baixa sentada na polia',
    muscleGroup: 'BACK',
    equipment: 'CABLE',
  },
  {
    id: 'cat-back-11',
    name: 'Remada articulada na máquina',
    muscleGroup: 'BACK',
    equipment: 'MACHINE',
  },
  {
    id: 'cat-back-12',
    name: 'Remada peito apoiado com halteres',
    muscleGroup: 'BACK',
    equipment: 'DUMBBELL',
  },
  {
    id: 'cat-back-13',
    name: 'Pulldown na polia com corda ou barra',
    muscleGroup: 'BACK',
    equipment: 'CABLE',
  },
  {
    id: 'cat-back-14',
    name: 'Encolhimento de ombros com halteres',
    muscleGroup: 'BACK',
    equipment: 'DUMBBELL',
  },
  {
    id: 'cat-back-15',
    name: 'Extensão lombar no banco romano',
    muscleGroup: 'BACK',
    equipment: 'BODYWEIGHT',
  },

  // SHOULDERS (Ombros / Deltoides)
  {
    id: 'cat-shoulders-01',
    name: 'Desenvolvimento com halteres sentado',
    muscleGroup: 'SHOULDERS',
    equipment: 'DUMBBELL',
  },
  {
    id: 'cat-shoulders-02',
    name: 'Desenvolvimento militar em pé com barra',
    muscleGroup: 'SHOULDERS',
    equipment: 'BARBELL',
  },
  {
    id: 'cat-shoulders-03',
    name: 'Desenvolvimento Arnold com halteres',
    muscleGroup: 'SHOULDERS',
    equipment: 'DUMBBELL',
  },
  {
    id: 'cat-shoulders-04',
    name: 'Desenvolvimento articulado na máquina',
    muscleGroup: 'SHOULDERS',
    equipment: 'MACHINE',
  },
  {
    id: 'cat-shoulders-05',
    name: 'Elevação lateral com halteres',
    muscleGroup: 'SHOULDERS',
    equipment: 'DUMBBELL',
  },
  {
    id: 'cat-shoulders-06',
    name: 'Elevação lateral unilateral na polia',
    muscleGroup: 'SHOULDERS',
    equipment: 'CABLE',
  },
  {
    id: 'cat-shoulders-07',
    name: 'Elevação lateral na máquina',
    muscleGroup: 'SHOULDERS',
    equipment: 'MACHINE',
  },
  {
    id: 'cat-shoulders-08',
    name: 'Elevação frontal com halteres',
    muscleGroup: 'SHOULDERS',
    equipment: 'DUMBBELL',
  },
  {
    id: 'cat-shoulders-09',
    name: 'Elevação frontal na polia com corda',
    muscleGroup: 'SHOULDERS',
    equipment: 'CABLE',
  },
  {
    id: 'cat-shoulders-10',
    name: 'Crucifixo inverso com halteres',
    muscleGroup: 'SHOULDERS',
    equipment: 'DUMBBELL',
  },
  {
    id: 'cat-shoulders-11',
    name: 'Crucifixo inverso no Peck Deck',
    muscleGroup: 'SHOULDERS',
    equipment: 'MACHINE',
  },
  {
    id: 'cat-shoulders-12',
    name: 'Face Pull na polia com corda',
    muscleGroup: 'SHOULDERS',
    equipment: 'CABLE',
  },
  {
    id: 'cat-shoulders-13',
    name: 'Remada alta na polia ou barra',
    muscleGroup: 'SHOULDERS',
    equipment: 'CABLE',
  },

  // BICEPS (Bíceps)
  {
    id: 'cat-biceps-01',
    name: 'Rosca direta com barra reta',
    muscleGroup: 'BICEPS',
    equipment: 'BARBELL',
  },
  {
    id: 'cat-biceps-02',
    name: 'Rosca direta com barra W',
    muscleGroup: 'BICEPS',
    equipment: 'BARBELL',
  },
  {
    id: 'cat-biceps-03',
    name: 'Rosca alternada com halteres',
    muscleGroup: 'BICEPS',
    equipment: 'DUMBBELL',
  },
  {
    id: 'cat-biceps-04',
    name: 'Rosca martelo com halteres',
    muscleGroup: 'BICEPS',
    equipment: 'DUMBBELL',
  },
  {
    id: 'cat-biceps-05',
    name: 'Rosca inclinada 45° com halteres',
    muscleGroup: 'BICEPS',
    equipment: 'DUMBBELL',
  },
  {
    id: 'cat-biceps-06',
    name: 'Rosca Scott com barra W',
    muscleGroup: 'BICEPS',
    equipment: 'BARBELL',
  },
  {
    id: 'cat-biceps-07',
    name: 'Rosca Scott na máquina',
    muscleGroup: 'BICEPS',
    equipment: 'MACHINE',
  },
  {
    id: 'cat-biceps-08',
    name: 'Rosca concentrada com halter',
    muscleGroup: 'BICEPS',
    equipment: 'DUMBBELL',
  },
  {
    id: 'cat-biceps-09',
    name: 'Rosca direta na polia baixa',
    muscleGroup: 'BICEPS',
    equipment: 'CABLE',
  },
  {
    id: 'cat-biceps-10',
    name: 'Rosca martelo na polia com corda',
    muscleGroup: 'BICEPS',
    equipment: 'CABLE',
  },
  {
    id: 'cat-biceps-11',
    name: 'Rosca Bayesiana unilateral na polia',
    muscleGroup: 'BICEPS',
    equipment: 'CABLE',
  },

  // TRICEPS (Tríceps)
  {
    id: 'cat-triceps-01',
    name: 'Tríceps pulley com barra reta ou V',
    muscleGroup: 'TRICEPS',
    equipment: 'CABLE',
  },
  {
    id: 'cat-triceps-02',
    name: 'Tríceps na polia com corda',
    muscleGroup: 'TRICEPS',
    equipment: 'CABLE',
  },
  {
    id: 'cat-triceps-03',
    name: 'Tríceps testa com barra W',
    muscleGroup: 'TRICEPS',
    equipment: 'BARBELL',
  },
  {
    id: 'cat-triceps-04',
    name: 'Tríceps testa com halteres',
    muscleGroup: 'TRICEPS',
    equipment: 'DUMBBELL',
  },
  {
    id: 'cat-triceps-05',
    name: 'Tríceps francês bilateral com halter',
    muscleGroup: 'TRICEPS',
    equipment: 'DUMBBELL',
  },
  {
    id: 'cat-triceps-06',
    name: 'Tríceps francês na polia com corda',
    muscleGroup: 'TRICEPS',
    equipment: 'CABLE',
  },
  {
    id: 'cat-triceps-07',
    name: 'Tríceps coice unilateral na polia',
    muscleGroup: 'TRICEPS',
    equipment: 'CABLE',
  },
  {
    id: 'cat-triceps-08',
    name: 'Supino fechado com barra',
    muscleGroup: 'TRICEPS',
    equipment: 'BARBELL',
  },
  {
    id: 'cat-triceps-09',
    name: 'Mergulho nas paralelas foco tríceps',
    muscleGroup: 'TRICEPS',
    equipment: 'BODYWEIGHT',
  },
  {
    id: 'cat-triceps-10',
    name: 'Mergulho na máquina de tríceps',
    muscleGroup: 'TRICEPS',
    equipment: 'MACHINE',
  },

  // FOREARMS (Antebraço)
  {
    id: 'cat-forearms-01',
    name: 'Rosca inversa com barra ou polia',
    muscleGroup: 'FOREARMS',
    equipment: 'BARBELL',
  },
  {
    id: 'cat-forearms-02',
    name: 'Flexão de punho com barra ou halter',
    muscleGroup: 'FOREARMS',
    equipment: 'DUMBBELL',
  },
  {
    id: 'cat-forearms-03',
    name: 'Extensão de punho com halter',
    muscleGroup: 'FOREARMS',
    equipment: 'DUMBBELL',
  },
  {
    id: 'cat-forearms-04',
    name: 'Caminhada do fazendeiro (Farmer Walk)',
    muscleGroup: 'FOREARMS',
    equipment: 'DUMBBELL',
  },
  {
    id: 'cat-forearms-05',
    name: 'Sustentação isométrica na barra fixa',
    muscleGroup: 'FOREARMS',
    equipment: 'BODYWEIGHT',
  },

  // CORE (Abdômen e Core)
  {
    id: 'cat-core-01',
    name: 'Prancha isométrica ventral',
    muscleGroup: 'CORE',
    equipment: 'BODYWEIGHT',
  },
  {
    id: 'cat-core-02',
    name: 'Prancha lateral isométrica',
    muscleGroup: 'CORE',
    equipment: 'BODYWEIGHT',
  },
  {
    id: 'cat-core-03',
    name: 'Abdominal supra no solo ou banco',
    muscleGroup: 'CORE',
    equipment: 'BODYWEIGHT',
  },
  {
    id: 'cat-core-04',
    name: 'Abdominal na polia alta (Crunch ajoelhado)',
    muscleGroup: 'CORE',
    equipment: 'CABLE',
  },
  {
    id: 'cat-core-05',
    name: 'Abdominal na máquina',
    muscleGroup: 'CORE',
    equipment: 'MACHINE',
  },
  {
    id: 'cat-core-06',
    name: 'Elevação de pernas suspenso ou paralela',
    muscleGroup: 'CORE',
    equipment: 'BODYWEIGHT',
  },
  {
    id: 'cat-core-07',
    name: 'Abdominal infra no banco',
    muscleGroup: 'CORE',
    equipment: 'BODYWEIGHT',
  },
  {
    id: 'cat-core-08',
    name: 'Ab Wheel (Roda abdominal)',
    muscleGroup: 'CORE',
    equipment: 'OTHER',
  },
  {
    id: 'cat-core-09',
    name: 'Pallof Press na polia ou elástico',
    muscleGroup: 'CORE',
    equipment: 'CABLE',
  },
  {
    id: 'cat-core-10',
    name: 'Dead Bug (Estabilização de core)',
    muscleGroup: 'CORE',
    equipment: 'BODYWEIGHT',
  },
  {
    id: 'cat-core-11',
    name: 'Perdigueiro (Bird-Dog)',
    muscleGroup: 'CORE',
    equipment: 'BODYWEIGHT',
  },

  // QUADRICEPS (Quadríceps)
  {
    id: 'cat-quads-01',
    name: 'Agachamento livre com barra',
    muscleGroup: 'QUADRICEPS',
    equipment: 'BARBELL',
  },
  {
    id: 'cat-quads-02',
    name: 'Agachamento frontal com barra',
    muscleGroup: 'QUADRICEPS',
    equipment: 'BARBELL',
  },
  {
    id: 'cat-quads-03',
    name: 'Agachamento no Smith',
    muscleGroup: 'QUADRICEPS',
    equipment: 'SMITH',
  },
  {
    id: 'cat-quads-04',
    name: 'Agachamento cálice (Goblet Squat)',
    muscleGroup: 'QUADRICEPS',
    equipment: 'DUMBBELL',
  },
  {
    id: 'cat-quads-05',
    name: 'Agachamento Hack na máquina',
    muscleGroup: 'QUADRICEPS',
    equipment: 'MACHINE',
  },
  {
    id: 'cat-quads-06',
    name: 'Agachamento pêndulo na máquina',
    muscleGroup: 'QUADRICEPS',
    equipment: 'MACHINE',
  },
  {
    id: 'cat-quads-07',
    name: 'Leg Press 45°',
    muscleGroup: 'QUADRICEPS',
    equipment: 'MACHINE',
  },
  {
    id: 'cat-quads-08',
    name: 'Leg Press horizontal',
    muscleGroup: 'QUADRICEPS',
    equipment: 'MACHINE',
  },
  {
    id: 'cat-quads-09',
    name: 'Cadeira extensora bilateral',
    muscleGroup: 'QUADRICEPS',
    equipment: 'MACHINE',
  },
  {
    id: 'cat-quads-10',
    name: 'Cadeira extensora unilateral',
    muscleGroup: 'QUADRICEPS',
    equipment: 'MACHINE',
  },
  {
    id: 'cat-quads-11',
    name: 'Agachamento búlgaro com halteres',
    muscleGroup: 'QUADRICEPS',
    equipment: 'DUMBBELL',
  },
  {
    id: 'cat-quads-12',
    name: 'Afundo estático com halteres',
    muscleGroup: 'QUADRICEPS',
    equipment: 'DUMBBELL',
  },
  {
    id: 'cat-quads-13',
    name: 'Passada (Avanço) com halteres',
    muscleGroup: 'QUADRICEPS',
    equipment: 'DUMBBELL',
  },
  {
    id: 'cat-quads-14',
    name: 'Subida no caixote (Step-up)',
    muscleGroup: 'QUADRICEPS',
    equipment: 'DUMBBELL',
  },
  {
    id: 'cat-quads-15',
    name: 'Agachamento Sissy',
    muscleGroup: 'QUADRICEPS',
    equipment: 'BODYWEIGHT',
  },

  // HAMSTRINGS (Posteriores de coxa / Isquiotibiais)
  {
    id: 'cat-hams-01',
    name: 'Stiff com barra',
    muscleGroup: 'HAMSTRINGS',
    equipment: 'BARBELL',
  },
  {
    id: 'cat-hams-02',
    name: 'Stiff com halteres',
    muscleGroup: 'HAMSTRINGS',
    equipment: 'DUMBBELL',
  },
  {
    id: 'cat-hams-03',
    name: 'Levantamento terra romeno (RDL)',
    muscleGroup: 'HAMSTRINGS',
    equipment: 'BARBELL',
  },
  {
    id: 'cat-hams-04',
    name: 'RDL unilateral com halter',
    muscleGroup: 'HAMSTRINGS',
    equipment: 'DUMBBELL',
  },
  {
    id: 'cat-hams-05',
    name: 'Mesa flexora deitado',
    muscleGroup: 'HAMSTRINGS',
    equipment: 'MACHINE',
  },
  {
    id: 'cat-hams-06',
    name: 'Cadeira flexora sentado',
    muscleGroup: 'HAMSTRINGS',
    equipment: 'MACHINE',
  },
  {
    id: 'cat-hams-07',
    name: 'Flexora vertical unilateral em pé',
    muscleGroup: 'HAMSTRINGS',
    equipment: 'MACHINE',
  },
  {
    id: 'cat-hams-08',
    name: 'Bom dia (Good Morning) com barra',
    muscleGroup: 'HAMSTRINGS',
    equipment: 'BARBELL',
  },
  {
    id: 'cat-hams-09',
    name: 'Flexão nórdica de isquiotibiais',
    muscleGroup: 'HAMSTRINGS',
    equipment: 'BODYWEIGHT',
  },
  {
    id: 'cat-hams-10',
    name: 'Flexão de joelhos na bola suíça',
    muscleGroup: 'HAMSTRINGS',
    equipment: 'OTHER',
  },

  // GLUTES (Glúteos)
  {
    id: 'cat-glutes-01',
    name: 'Elevação pélvica (Hip Thrust) com barra',
    muscleGroup: 'GLUTES',
    equipment: 'BARBELL',
  },
  {
    id: 'cat-glutes-02',
    name: 'Elevação pélvica na máquina',
    muscleGroup: 'GLUTES',
    equipment: 'MACHINE',
  },
  {
    id: 'cat-glutes-03',
    name: 'Ponte de glúteos no solo',
    muscleGroup: 'GLUTES',
    equipment: 'BODYWEIGHT',
  },
  {
    id: 'cat-glutes-04',
    name: 'Cadeira abdutora',
    muscleGroup: 'GLUTES',
    equipment: 'MACHINE',
  },
  {
    id: 'cat-glutes-05',
    name: 'Coice de glúteo na polia baixa',
    muscleGroup: 'GLUTES',
    equipment: 'CABLE',
  },
  {
    id: 'cat-glutes-06',
    name: 'Glúteo na máquina (Coice articulado)',
    muscleGroup: 'GLUTES',
    equipment: 'MACHINE',
  },
  {
    id: 'cat-glutes-07',
    name: 'Abdução de quadril em pé na polia',
    muscleGroup: 'GLUTES',
    equipment: 'CABLE',
  },
  {
    id: 'cat-glutes-08',
    name: 'Agachamento sumô com halter ou kettlebell',
    muscleGroup: 'GLUTES',
    equipment: 'DUMBBELL',
  },
  {
    id: 'cat-glutes-09',
    name: 'Passada lateral com miniband (Monster Walk)',
    muscleGroup: 'GLUTES',
    equipment: 'BAND',
  },
  {
    id: 'cat-glutes-10',
    name: 'Extensão lombar 45° foco glúteos',
    muscleGroup: 'GLUTES',
    equipment: 'BODYWEIGHT',
  },

  // ADDUCTORS (Adutores)
  {
    id: 'cat-adductors-01',
    name: 'Cadeira adutora',
    muscleGroup: 'ADDUCTORS',
    equipment: 'MACHINE',
  },
  {
    id: 'cat-adductors-02',
    name: 'Adução de quadril na polia baixa',
    muscleGroup: 'ADDUCTORS',
    equipment: 'CABLE',
  },
  {
    id: 'cat-adductors-03',
    name: 'Prancha Copenhague (Adutores)',
    muscleGroup: 'ADDUCTORS',
    equipment: 'BODYWEIGHT',
  },
  {
    id: 'cat-adductors-04',
    name: 'Agachamento lateral (Cossack Squat)',
    muscleGroup: 'ADDUCTORS',
    equipment: 'DUMBBELL',
  },

  // CALVES (Panturrilhas)
  {
    id: 'cat-calves-01',
    name: 'Panturrilha em pé na máquina',
    muscleGroup: 'CALVES',
    equipment: 'MACHINE',
  },
  {
    id: 'cat-calves-02',
    name: 'Panturrilha sentado (Sóleo)',
    muscleGroup: 'CALVES',
    equipment: 'MACHINE',
  },
  {
    id: 'cat-calves-03',
    name: 'Panturrilha no Leg Press',
    muscleGroup: 'CALVES',
    equipment: 'MACHINE',
  },
  {
    id: 'cat-calves-04',
    name: 'Panturrilha em pé no Smith',
    muscleGroup: 'CALVES',
    equipment: 'SMITH',
  },
  {
    id: 'cat-calves-05',
    name: 'Panturrilha unilateral no degrau com halter',
    muscleGroup: 'CALVES',
    equipment: 'DUMBBELL',
  },
  {
    id: 'cat-calves-06',
    name: 'Flexão dorsal (Tibial anterior)',
    muscleGroup: 'CALVES',
    equipment: 'BODYWEIGHT',
  },

  // FULL_BODY (Corpo Inteiro / Compostos Olímpicos e Funcionais)
  {
    id: 'cat-full-01',
    name: 'Levantamento terra convencional',
    muscleGroup: 'FULL_BODY',
    equipment: 'BARBELL',
  },
  {
    id: 'cat-full-02',
    name: 'Levantamento terra sumô',
    muscleGroup: 'FULL_BODY',
    equipment: 'BARBELL',
  },
  {
    id: 'cat-full-03',
    name: 'Levantamento terra com barra hexagonal (Trap Bar)',
    muscleGroup: 'FULL_BODY',
    equipment: 'BARBELL',
  },
  {
    id: 'cat-full-04',
    name: 'Kettlebell Swing',
    muscleGroup: 'FULL_BODY',
    equipment: 'KETTLEBELL',
  },
  {
    id: 'cat-full-05',
    name: 'Thruster com halteres ou barra',
    muscleGroup: 'FULL_BODY',
    equipment: 'DUMBBELL',
  },
  {
    id: 'cat-full-06',
    name: 'Levantamento turco (Turkish Get-Up)',
    muscleGroup: 'FULL_BODY',
    equipment: 'KETTLEBELL',
  },
  {
    id: 'cat-full-07',
    name: 'Clean & Press com kettlebell ou halter',
    muscleGroup: 'FULL_BODY',
    equipment: 'KETTLEBELL',
  },
  {
    id: 'cat-full-08',
    name: 'Empurrar trenó (Sled Push)',
    muscleGroup: 'FULL_BODY',
    equipment: 'OTHER',
  },

  // CARDIO (Condicionamento Cardiorrespiratório)
  {
    id: 'cat-cardio-01',
    name: 'Esteira ergométrica (caminhada/corrida)',
    muscleGroup: 'CARDIO',
    equipment: 'MACHINE',
  },
  {
    id: 'cat-cardio-02',
    name: 'Bicicleta ergométrica',
    muscleGroup: 'CARDIO',
    equipment: 'MACHINE',
  },
  {
    id: 'cat-cardio-03',
    name: 'Air Bike (Bicicleta de assalto)',
    muscleGroup: 'CARDIO',
    equipment: 'MACHINE',
  },
  {
    id: 'cat-cardio-04',
    name: 'Remo ergométrico (Concept2)',
    muscleGroup: 'CARDIO',
    equipment: 'MACHINE',
  },
  {
    id: 'cat-cardio-05',
    name: 'Elíptico / Transport',
    muscleGroup: 'CARDIO',
    equipment: 'MACHINE',
  },
  {
    id: 'cat-cardio-06',
    name: 'Escada ergométrica (StairMaster)',
    muscleGroup: 'CARDIO',
    equipment: 'MACHINE',
  },
  {
    id: 'cat-cardio-07',
    name: 'Corda naval (Battle Rope)',
    muscleGroup: 'CARDIO',
    equipment: 'OTHER',
  },
  {
    id: 'cat-cardio-08',
    name: 'Pular corda',
    muscleGroup: 'CARDIO',
    equipment: 'OTHER',
  },

  // MOBILITY (Mobilidade e Ativação)
  {
    id: 'cat-mobility-01',
    name: 'Mobilidade torácica em 4 apoios',
    muscleGroup: 'MOBILITY',
    equipment: 'BODYWEIGHT',
  },
  {
    id: 'cat-mobility-02',
    name: 'Mobilidade de quadril 90/90',
    muscleGroup: 'MOBILITY',
    equipment: 'BODYWEIGHT',
  },
  {
    id: 'cat-mobility-03',
    name: 'Mobilidade de tornozelo na parede',
    muscleGroup: 'MOBILITY',
    equipment: 'BODYWEIGHT',
  },
  {
    id: 'cat-mobility-04',
    name: 'Rotação externa de ombro com elástico',
    muscleGroup: 'MOBILITY',
    equipment: 'BAND',
  },
  {
    id: 'cat-mobility-05',
    name: 'Dislocamento de ombros com bastão ou elástico',
    muscleGroup: 'MOBILITY',
    equipment: 'BAND',
  },
  {
    id: 'cat-mobility-06',
    name: 'Alongamento dinâmico (Maior alongamento do mundo)',
    muscleGroup: 'MOBILITY',
    equipment: 'BODYWEIGHT',
  },
  {
    id: 'cat-mobility-07',
    name: 'Gato-camelo (Mobilidade de coluna)',
    muscleGroup: 'MOBILITY',
    equipment: 'BODYWEIGHT',
  },
];
