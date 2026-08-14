import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Criando contas profissionais...');
  const passwordHash = await bcrypt.hash('12345678', 12);

  const usersToCreate = [
    {
      id: 'nutri-001',
      name: 'Nutricionista Padrão',
      email: 'nutri@example.com',
      password: passwordHash,
      role: 'NUTRITIONIST'
    },
    {
      id: 'personal-001',
      name: 'Personal Padrão',
      email: 'personal@example.com',
      password: passwordHash,
      role: 'PERSONAL'
    },
    {
      id: 'fisio-001',
      name: 'Fisioterapeuta Padrão',
      email: 'fisio@example.com',
      password: passwordHash,
      role: 'PHYSIO'
    },
    // Contas do usuário
    {
      id: 'gustavo-admin',
      name: 'Gustavo Cunha',
      email: 'gustavocunha0401@gmail.com',
      password: passwordHash,
      role: 'ADMIN' // ou NUTRITIONIST, vamos tentar ADMIN primeiro
    },
    {
      id: 'ryan-nutri',
      name: 'Ryan Nutricionista',
      email: 'ryannutri@gmail.com',
      password: passwordHash,
      role: 'NUTRITIONIST'
    }
  ];

  for (const user of usersToCreate) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { password: passwordHash },
      create: user as any,
    });
  }
  console.log('Contas criadas com sucesso! Senha para todas: 12345678');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
