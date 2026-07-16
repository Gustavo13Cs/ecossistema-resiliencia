import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter });

// IDs dos profissionais (já devem existir)
const PROFESSIONALS = {
  nutritionist: 'nutri-001',
  personal: 'personal-001', 
  physio: 'fisio-001',
};

// Dados de pacientes
const PATIENTS_DATA = [
  {
    name: 'Ana Silva',
    email: 'ana.silva@example.com',
    goal: 'Ganho de Massa Muscular',
    height: 1.65,
    initialWeight: 65,
    gender: 'Feminino',
    allergies: 'Nenhuma',
    exerciseFrequency: '5 vezes por semana',
  },
  {
    name: 'Carlos Santos',
    email: 'carlos.santos@example.com',
    goal: 'Emagrecimento',
    height: 1.78,
    initialWeight: 95,
    gender: 'Masculino',
    allergies: 'Alergia a frutos do mar',
    exerciseFrequency: '4 vezes por semana',
  },
  {
    name: 'Marina Oliveira',
    email: 'marina.oliveira@example.com',
    goal: 'Manutenção com Tonificação',
    height: 1.62,
    initialWeight: 58,
    gender: 'Feminino',
    allergies: 'Intolerância à lactose',
    exerciseFrequency: '3 vezes por semana',
  },
  {
    name: 'Roberto Ferreira',
    email: 'roberto.ferreira@example.com',
    goal: 'Ganho de Força',
    height: 1.82,
    initialWeight: 78,
    gender: 'Masculino',
    allergies: 'Nenhuma',
    exerciseFrequency: '6 vezes por semana',
  },
  {
    name: 'Beatriz Costa',
    email: 'beatriz.costa@example.com',
    goal: 'Reabilitação',
    height: 1.70,
    initialWeight: 72,
    gender: 'Feminino',
    allergies: 'Nenhuma',
    exerciseFrequency: 'Moderada - em reabilitação',
  },
];

async function main() {
  console.log('🚀 Iniciando seed de dados completos...\n');

  try {
    // 1. Criar pacientes
    console.log('👥 Criando pacientes...');
    const patients = await Promise.all(
      PATIENTS_DATA.map(p =>
        prisma.user.upsert({
          where: { email: p.email },
          update: {},
          create: {
            name: p.name,
            email: p.email,
            password: await bcrypt.hash('senha123', 12),
            role: 'PATIENT',
            phone: '85999999999',
            birthDate: new Date('1990-01-01'),
            goal: p.goal,
            height: p.height,
            initialWeight: p.initialWeight,
            gender: p.gender,
            allergies: p.allergies,
            exerciseFrequency: p.exerciseFrequency,
          },
        })
      )
    );
    console.log(`   ✅ ${patients.length} pacientes criados/atualizados`);

    // 2. Vincular profissionais aos pacientes
    console.log('🔗 Vinculando profissionais aos pacientes...');
    for (const patient of patients) {
      await prisma.professionalPatientLink.upsert({
        where: { 
          professionalId_patientId: {
            professionalId: PROFESSIONALS.nutritionist,
            patientId: patient.id,
          }
        },
        update: { isActive: true },
        create: { 
          professionalId: PROFESSIONALS.nutritionist, 
          patientId: patient.id,
          isActive: true 
        },
      });
      await prisma.professionalPatientLink.upsert({
        where: { 
          professionalId_patientId: {
            professionalId: PROFESSIONALS.personal,
            patientId: patient.id,
          }
        },
        update: { isActive: true },
        create: { 
          professionalId: PROFESSIONALS.personal, 
          patientId: patient.id,
          isActive: true 
        },
      });
      await prisma.professionalPatientLink.upsert({
        where: { 
          professionalId_patientId: {
            professionalId: PROFESSIONALS.physio,
            patientId: patient.id,
          }
        },
        update: { isActive: true },
        create: { 
          professionalId: PROFESSIONALS.physio, 
          patientId: patient.id,
          isActive: true 
        },
      });
    }
    console.log('   ✅ Profissionais vinculados');

    // 3. Buscar alimentos (já devem existir do seed anterior)
    console.log('🍎 Buscando alimentos do banco...');
    const foods = await prisma.food.findMany({ take: 30 });
    console.log(`   ✅ ${foods.length} alimentos encontrados`);

    // 4. Criar dieta para Ana Silva (Ganho de Massa)
    console.log('🥗 Criando dieta para ganho de massa (Ana Silva)...');
    const dietAna = await prisma.dietPlan.create({
      data: {
        title: 'Ganho de Massa - V1',
        goal: 'Hipertrofia com foco em proteína',
        durationDays: 30,
        targetKcal: 2500,
        proteinG: 187.5,
        fatG: 83,
        carbsG: 312.5,
        fiberG: 30,
        userId: patients[0].id,
        creatorId: PROFESSIONALS.nutritionist,
        isActive: true,
        meals: {
          create: [
            {
              name: 'Café da Manhã',
              time: '07:00',
              items: {
                create: [
                  { foodId: foods[0].id, quantity: 150, measure: 'g' },
                  { foodId: foods[1].id, quantity: 3, measure: 'unidades' },
                  { foodId: foods[2].id, quantity: 50, measure: 'g' },
                ],
              },
            },
            {
              name: 'Almoço',
              time: '12:30',
              items: {
                create: [
                  { foodId: foods[10].id, quantity: 200, measure: 'g' },
                  { foodId: foods[6].id, quantity: 150, measure: 'g' },
                  { foodId: foods[15].id, quantity: 150, measure: 'g' },
                ],
              },
            },
            {
              name: 'Lanche Pós-Treino',
              time: '15:00',
              items: {
                create: [
                  { foodId: foods[1].id, quantity: 2, measure: 'unidades' },
                  { foodId: foods[7].id, quantity: 100, measure: 'g' },
                ],
              },
            },
            {
              name: 'Jantar',
              time: '19:00',
              items: {
                create: [
                  { foodId: foods[11].id, quantity: 150, measure: 'g' },
                  { foodId: foods[6].id, quantity: 100, measure: 'g' },
                  { foodId: foods[16].id, quantity: 200, measure: 'g' },
                ],
              },
            },
          ],
        },
      },
    });
    console.log(`   ✅ Dieta criada: ${dietAna.id}`);

    // 5. Criar dieta para Carlos Santos (Cutting)
    console.log('🥗 Criando dieta para emagrecimento (Carlos Santos)...');
    const dietCarlos = await prisma.dietPlan.create({
      data: {
        title: 'Cutting - Fase 1',
        goal: 'Perda de gordura com manutenção muscular',
        durationDays: 30,
        targetKcal: 1800,
        proteinG: 162,
        fatG: 60,
        carbsG: 180,
        fiberG: 25,
        userId: patients[1].id,
        creatorId: PROFESSIONALS.nutritionist,
        isActive: true,
        meals: {
          create: [
            {
              name: 'Café da Manhã',
              time: '06:30',
              items: {
                create: [
                  { foodId: foods[1].id, quantity: 2, measure: 'unidades' },
                  { foodId: foods[8].id, quantity: 40, measure: 'g' },
                  { foodId: foods[17].id, quantity: 100, measure: 'g' },
                ],
              },
            },
            {
              name: 'Almoço',
              time: '12:00',
              items: {
                create: [
                  { foodId: foods[10].id, quantity: 180, measure: 'g' },
                  { foodId: foods[6].id, quantity: 120, measure: 'g' },
                  { foodId: foods[16].id, quantity: 200, measure: 'g' },
                ],
              },
            },
            {
              name: 'Jantar',
              time: '19:00',
              items: {
                create: [
                  { foodId: foods[12].id, quantity: 140, measure: 'g' },
                  { foodId: foods[7].id, quantity: 80, measure: 'g' },
                  { foodId: foods[17].id, quantity: 150, measure: 'g' },
                ],
              },
            },
          ],
        },
      },
    });
    console.log(`   ✅ Dieta criada: ${dietCarlos.id}`);

    // 6. Criar treino PPL para Ana Silva
    console.log('💪 Criando treino PPL (Ana Silva)...');
    const workoutAna = await prisma.workout.create({
      data: {
        title: 'PPL - Hipertrofia V1',
        goal: 'Hipertrofia com progressão linear',
        durationWeeks: 8,
        userId: patients[0].id,
        creatorId: PROFESSIONALS.personal,
        isActive: true,
        splits: {
          create: [
            {
              name: 'Treino A - Push',
              focus: 'Peito, Ombro e Tríceps',
              exercises: {
                create: [
                  { name: 'Supino Reto', sets: '4', reps: '8-10', rest: '90s', notes: 'Descida controlada' },
                  { name: 'Supino Inclinado', sets: '3', reps: '10-12', rest: '60s' },
                  { name: 'Press Ombro', sets: '3', reps: '8-10', rest: '90s' },
                  { name: 'Tríceps Corda', sets: '3', reps: '12-15', rest: '45s' },
                ],
              },
            },
            {
              name: 'Treino B - Pull',
              focus: 'Costas e Bíceps',
              exercises: {
                create: [
                  { name: 'Puxada Frontal', sets: '4', reps: '8-10', rest: '90s' },
                  { name: 'Remada Alta', sets: '4', reps: '8-10', rest: '90s' },
                  { name: 'Barra Fixa', sets: '3', reps: '6-10', rest: '120s' },
                  { name: 'Rosca Direta', sets: '3', reps: '10-12', rest: '60s' },
                ],
              },
            },
            {
              name: 'Treino C - Legs',
              focus: 'Pernas e Glúteos',
              exercises: {
                create: [
                  { name: 'Agachamento', sets: '4', reps: '8-10', rest: '120s' },
                  { name: 'Leg Press', sets: '3', reps: '10-12', rest: '90s' },
                  { name: 'Leg Curl', sets: '3', reps: '12-15', rest: '60s' },
                  { name: 'Extensora', sets: '3', reps: '12-15', rest: '60s' },
                ],
              },
            },
          ],
        },
      },
    });
    console.log(`   ✅ Treino PPL criado: ${workoutAna.id}`);

    // 7. Criar treino Upper/Lower para Carlos
    console.log('💪 Criando treino Upper/Lower (Carlos Santos)...');
    const workoutCarlos = await prisma.workout.create({
      data: {
        title: 'Upper/Lower - Cutting',
        goal: 'Manter músculo enquanto emagrece',
        durationWeeks: 8,
        userId: patients[1].id,
        creatorId: PROFESSIONALS.personal,
        isActive: true,
        splits: {
          create: [
            {
              name: 'Upper A',
              focus: 'Força e volume moderado',
              exercises: {
                create: [
                  { name: 'Supino Reto', sets: '4', reps: '6-8', rest: '120s' },
                  { name: 'Remada Barra', sets: '4', reps: '6-8', rest: '120s' },
                  { name: 'Desenvolvimento Barra', sets: '3', reps: '8-10', rest: '90s' },
                  { name: 'Barra Fixa', sets: '3', reps: 'Max', rest: '90s' },
                ],
              },
            },
            {
              name: 'Lower A',
              focus: 'Força',
              exercises: {
                create: [
                  { name: 'Agachamento', sets: '4', reps: '6-8', rest: '120s' },
                  { name: 'Leg Press', sets: '3', reps: '8-10', rest: '90s' },
                  { name: 'Leg Curl', sets: '2', reps: '10-12', rest: '60s' },
                ],
              },
            },
          ],
        },
      },
    });
    console.log(`   ✅ Treino Upper/Lower criado: ${workoutCarlos.id}`);

    // 8. Criar plano de reabilitação para Beatriz Costa
    console.log('🏥 Criando plano de reabilitação (Beatriz Costa)...');
    const rehabBeatriz = await prisma.rehabPlan.create({
      data: {
        title: 'Pós-Reconstrução LCA',
        goal: 'Recuperar força e propriocepção',
        durationWeeks: 12,
        userId: patients[4].id,
        creatorId: PROFESSIONALS.physio,
        isActive: true,
        sessions: {
          create: [
            {
              name: 'Fase 1 - Analgésica (Semanas 1-3)',
              focus: 'Controle de edema e dor',
              exercises: {
                create: [
                  { name: 'TENS', sets: '20', reps: 'min', notes: 'Frequência 100Hz, 2x dia' },
                  { name: 'Crioterapia', sets: '15', reps: 'min', notes: 'A cada 2h' },
                  { name: 'Alongamento Isquiotibiais', sets: '3', reps: '30s', notes: 'Suave' },
                  { name: 'Contração de Quadríceps', sets: '3', reps: '20', notes: 'Sem movimento' },
                ],
              },
            },
            {
              name: 'Fase 2 - Mobilidade (Semanas 4-6)',
              focus: 'Ganhar ADM',
              exercises: {
                create: [
                  { name: 'Flexão de Joelho Ativa', sets: '3', reps: '15', notes: 'Com resistência leve' },
                  { name: 'Extensão de Joelho', sets: '3', reps: '15', notes: 'Sem resistência' },
                  { name: 'Agachamento Isométrico', sets: '3', reps: '10s', notes: 'Sem descida completa' },
                ],
              },
            },
            {
              name: 'Fase 3 - Força (Semanas 7-12)',
              focus: 'Retorno às atividades',
              exercises: {
                create: [
                  { name: 'Agachamento com Peso', sets: '4', reps: '10-12', notes: 'Progressivo' },
                  { name: 'Leg Press', sets: '3', reps: '12-15' },
                  { name: 'Ponte', sets: '3', reps: '15', notes: 'Glúteo máximo' },
                  { name: 'Lunges', sets: '3', reps: '12', notes: 'Controlled pace' },
                ],
              },
            },
          ],
        },
      },
    });
    console.log(`   ✅ Plano de reabilitação criado: ${rehabBeatriz.id}`);

    // 9. Criar avaliações físicas com histórico
    console.log('📊 Criando avaliações físicas com histórico...');
    for (let i = 0; i < 3; i++) {
      const daysAgo = (3 - i) * 30;
      await prisma.physicalAssessment.create({
        data: {
          userId: patients[0].id,
          date: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
          weight: 65 + i * 1.5,
          bodyFat: 24 - i * 0.8,
          muscleMass: 40 + i * 0.7,
          waist: 70 - i * 1,
          armRight: 29 + i * 0.4,
          benchPress1RM: 80 + i * 5,
          squat1RM: 100 + i * 8,
          notes: `Avaliação #${i + 1} - Progressão visível em força`,
        },
      });
    }
    console.log('   ✅ Avaliações físicas criadas (Ana Silva com histórico)');

    // 10. Criar exames laboratoriais com histórico
    console.log('🧪 Criando exames laboratoriais com histórico...');
    for (let i = 3; i >= 1; i--) {
      const daysAgo = i * 30;
      await prisma.labExam.create({
        data: {
          patientId: patients[1].id,
          creatorId: PROFESSIONALS.nutritionist,
          date: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
          notes: `Exame de acompanhamento - Cutting semana ${i}`,
          markers: {
            create: [
              { name: 'Glicemia de Jejum', value: 110 - i * 5, unit: 'mg/dL' },
              { name: 'Colesterol Total', value: 250 - i * 10, unit: 'mg/dL' },
              { name: 'Triglicerídeos', value: 280 - i * 15, unit: 'mg/dL' },
              { name: 'HDL', value: 35 + i * 2, unit: 'mg/dL' },
              { name: 'TSH', value: 2.1, unit: 'mIU/L' },
              { name: 'Albumina', value: 4.2 - i * 0.1, unit: 'g/dL' },
            ],
          },
        },
      });
    }
    console.log('   ✅ Exames laboratoriais criados (Carlos Santos com histórico)');

    console.log('\n✨ Seed concluído com sucesso!');
    console.log('\n📋 Resumo do que foi criado:');
    console.log(`   ✅ ${patients.length} pacientes com dados realistas`);
    console.log('   ✅ 2 planos de dieta variados (Ganho de Massa e Cutting)');
    console.log('   ✅ 2 programas de treino personalizados (PPL e Upper/Lower)');
    console.log('   ✅ 1 plano de reabilitação (Pós-LCA com 3 fases)');
    console.log('   ✅ 3 avaliações físicas com histórico (Ana Silva)');
    console.log('   ✅ 3 exames laboratoriais com histórico (Carlos Santos)');
    console.log('\n🎯 Agora você tem dados para fazer vídeos de exemplo!\n');

  } catch (error) {
    console.error('❌ Erro durante seed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
