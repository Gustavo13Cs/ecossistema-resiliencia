import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter });

const rawFoods: (string | number)[][] = [
  // ==========================================
  // 🟢 BASE TACO (50 ALIMENTOS BRUTOS/IN NATURA)
  // ==========================================
  ["Arroz branco, cozido", "TACO", 130, 2.5, 28.1, 0.2, 1.6, 1, 4, 0.1],
  ["Arroz integral, cozido", "TACO", 124, 2.6, 25.8, 1.0, 2.7, 1, 5, 0.3],
  ["Feijão carioca, cozido", "TACO", 76, 4.8, 13.6, 0.5, 8.5, 2, 27, 1.3],
  ["Feijão preto, cozido", "TACO", 77, 4.5, 14.0, 0.5, 8.4, 2, 29, 1.5],
  ["Lentilha, cozida", "TACO", 116, 9.0, 20.1, 0.4, 7.9, 2, 19, 3.3],
  ["Grão-de-bico, cozido", "TACO", 164, 8.9, 27.4, 2.6, 7.6, 7, 49, 2.9],
  ["Batata inglesa, cozida", "TACO", 52, 1.2, 11.9, 0.1, 1.3, 2, 4, 0.3],
  ["Batata doce, cozida", "TACO", 77, 0.6, 18.4, 0.1, 2.2, 3, 17, 0.2],
  ["Mandioca, cozida", "TACO", 125, 0.6, 30.1, 0.1, 1.9, 2, 15, 0.2],
  ["Inhame, cozido", "TACO", 114, 1.5, 27.6, 0.1, 1.6, 2, 12, 0.4],
  ["Peito de frango, sem pele, grelhado", "TACO", 159, 32.0, 0, 2.5, 0, 50, 4, 0.4],
  ["Patinho bovino, grelhado", "TACO", 219, 35.9, 0, 7.3, 0, 61, 5, 3.0],
  ["Coxão duro bovino, cozido", "TACO", 217, 33.3, 0, 8.1, 0, 52, 5, 3.1],
  ["Acém bovino, moído, cozido", "TACO", 212, 26.7, 0, 10.9, 0, 64, 6, 2.5],
  ["Maminha bovina, grelhada", "TACO", 153, 30.7, 0, 2.4, 0, 52, 5, 2.8],
  ["Filé de tilápia, grelhado", "TACO", 128, 26.1, 0, 1.7, 0, 62, 14, 0.5],
  ["Ovo de galinha, cozido", "TACO", 146, 13.3, 0.6, 9.5, 0, 168, 49, 1.5],
  ["Leite de vaca, integral", "TACO", 61, 3.3, 4.6, 3.2, 0, 52, 123, 0.1],
  ["Leite de vaca, desnatado", "TACO", 40, 3.5, 4.8, 0.3, 0, 54, 125, 0.1],
  ["Queijo Minas frescal", "TACO", 243, 17.4, 3.2, 17.5, 0, 410, 579, 0.2],
  ["Queijo Mussarela", "TACO", 327, 22.6, 3.0, 24.0, 0, 580, 875, 0.3],
  ["Aveia em flocos", "TACO", 394, 13.9, 66.6, 8.5, 9.1, 5, 48, 4.4],
  ["Banana prata, crua", "TACO", 98, 1.3, 26.0, 0.1, 2.0, 0, 8, 0.4],
  ["Banana nanica, crua", "TACO", 92, 1.4, 23.8, 0.1, 2.6, 0, 6, 0.3],
  ["Maçã fuji, crua", "TACO", 52, 0.3, 15.2, 0.2, 1.3, 0, 2, 0.1],
  ["Mamão papaia, cru", "TACO", 40, 0.5, 10.4, 0.1, 1.0, 2, 22, 0.2],
  ["Laranja pêra, crua", "TACO", 37, 1.0, 8.9, 0.1, 0.8, 0, 22, 0.1],
  ["Abacate, cru", "TACO", 96, 1.2, 6.0, 8.4, 6.3, 0, 8, 0.2],
  ["Melancia, crua", "TACO", 33, 0.9, 8.1, 0.1, 0.9, 0, 8, 0.2],
  ["Morango, cru", "TACO", 33, 0.9, 8.1, 0.1, 0.9, 0, 8, 0.2],
  ["Abacaxi, cru", "TACO", 48, 0.9, 12.3, 0.1, 2.0, 0, 22, 0.3],
  ["Uva, crua", "TACO", 53, 0.8, 13.6, 0.2, 0.9, 0, 11, 0.3],
  ["Alface, crua", "TACO", 14, 1.3, 2.4, 0.2, 1.3, 9, 38, 0.6],
  ["Tomate, com semente, cru", "TACO", 15, 1.1, 3.1, 0.2, 1.2, 1, 7, 0.2],
  ["Cebola, crua", "TACO", 21, 1.1, 4.6, 0.2, 1.5, 2, 14, 0.2],
  ["Cenoura, crua", "TACO", 34, 1.3, 7.7, 0.2, 3.2, 3, 23, 0.2],
  ["Brócolis, cozido", "TACO", 25, 2.1, 4.4, 0.5, 3.4, 2, 51, 0.5],
  ["Couve-flor, cozida", "TACO", 23, 1.2, 5.2, 0.2, 2.1, 2, 16, 0.3],
  ["Abóbora, cozida", "TACO", 48, 1.4, 10.8, 0.1, 2.5, 1, 11, 0.3],
  ["Espinafre, cozido", "TACO", 67, 2.7, 4.2, 0.2, 2.5, 43, 112, 1.5],
  ["Repolho, cru", "TACO", 17, 0.9, 3.9, 0.1, 1.9, 4, 35, 0.2],
  ["Pimentão, cru", "TACO", 20, 1.2, 4.3, 0.1, 1.6, 2, 9, 0.3],
  ["Berinjela, cozida", "TACO", 19, 0.8, 4.5, 0.1, 1.5, 1, 11, 0.3],
  ["Chuchu, cozido", "TACO", 19, 0.4, 4.8, 0.1, 1.0, 2, 12, 0.2],
  ["Beterraba, cozida", "TACO", 32, 1.3, 7.2, 0.1, 1.9, 2, 15, 0.2],
  ["Pepino, cru", "TACO", 10, 0.9, 2.0, 0.1, 1.1, 2, 10, 0.1],
  ["Manga formosa, crua", "TACO", 45, 0.8, 11.5, 0.1, 1.8, 1, 10, 0.1],
  ["Pêra, crua", "TACO", 48, 0.3, 13.0, 0.1, 3.0, 1, 8, 0.2],
  ["Goiaba, crua", "TACO", 54, 1.1, 13.0, 0.4, 6.2, 1, 4, 0.2],
  ["Limão, cru", "TACO", 32, 0.8, 11.1, 0.1, 2.6, 1, 34, 0.2],

  // ==========================================
  // 🔵 BASE IBGE (50 PREPARAÇÕES / RECEITAS)
  // ==========================================
  ["Feijoada completa", "IBGE", 188, 10.5, 13.0, 10.4, 4.2, 545, 23, 2.1],
  ["Cuscuz de milho, cozido", "IBGE", 114, 2.2, 25.3, 0.7, 1.5, 1, 3, 0.5],
  ["Pão francês", "IBGE", 300, 8.0, 58.6, 3.1, 2.3, 648, 16, 1.0],
  ["Pão de queijo", "IBGE", 363, 5.1, 34.2, 24.6, 1.1, 620, 112, 0.3],
  ["Tapioca", "IBGE", 336, 0.5, 83.2, 0.2, 0.8, 3, 9, 0.1],
  ["Cuzcuz paulista", "IBGE", 143, 3.4, 20.1, 5.5, 1.2, 320, 12, 0.6],
  ["Moqueca de peixe", "IBGE", 121, 8.5, 3.5, 8.8, 0.5, 210, 22, 0.4],
  ["Vatapá", "IBGE", 185, 4.1, 15.2, 12.3, 1.2, 380, 45, 0.8],
  ["Acarajé", "IBGE", 262, 5.4, 18.5, 19.3, 2.1, 412, 32, 1.1],
  ["Baião de dois", "IBGE", 145, 6.2, 18.5, 4.8, 3.5, 450, 28, 1.4],
  ["Tropeiro (Feijão com arroz e carne)", "IBGE", 152, 7.8, 20.1, 4.5, 4.0, 510, 31, 1.8],
  ["Farofa de mandioca", "IBGE", 394, 1.7, 80.5, 7.6, 3.1, 200, 25, 1.2],
  ["Polenta", "IBGE", 70, 1.5, 15.0, 0.2, 1.1, 2, 2, 0.3],
  ["Escondidinho de carne seca", "IBGE", 154, 10.2, 14.5, 6.2, 1.8, 480, 25, 1.5],
  ["Bolo de milho", "IBGE", 311, 4.8, 48.5, 11.2, 1.5, 120, 45, 0.8],
  ["Bolo de cenoura", "IBGE", 335, 4.5, 52.0, 12.5, 1.4, 135, 30, 0.7],
  ["Brigadeiro", "IBGE", 400, 5.5, 68.2, 12.4, 0, 150, 112, 1.1],
  ["Coxinha de frango (frita)", "IBGE", 283, 9.5, 30.1, 14.2, 1.5, 520, 18, 0.9],
  ["Pastel de carne (frito)", "IBGE", 310, 10.2, 32.5, 15.8, 1.2, 580, 15, 1.2],
  ["Empada de frango", "IBGE", 345, 8.8, 35.1, 18.5, 1.1, 550, 14, 0.8],
  ["Quibe de carne (frito)", "IBGE", 260, 11.5, 22.4, 13.5, 2.5, 490, 20, 1.6],
  ["Lasanha à bolonhesa", "IBGE", 164, 8.5, 14.2, 8.1, 1.1, 420, 65, 0.8],
  ["Pizza de mussarela", "IBGE", 266, 11.4, 33.0, 9.8, 1.8, 510, 140, 1.1],
  ["Macarrão ao sugo", "IBGE", 135, 5.2, 22.5, 2.4, 1.5, 310, 12, 0.8],
  ["Panqueca de carne", "IBGE", 185, 9.5, 16.2, 9.2, 0.8, 450, 35, 1.3],
  ["Estrogonofe de frango", "IBGE", 158, 12.5, 6.2, 9.5, 0.4, 320, 22, 0.6],
  ["Estrogonofe de carne", "IBGE", 175, 14.2, 5.8, 10.5, 0.3, 340, 18, 1.2],
  ["Salpicão de carne", "IBGE", 210, 8.5, 22.1, 10.0, 2.5, 410, 15, 1.5],
  ["Torta de frango", "IBGE", 285, 10.5, 28.5, 14.5, 1.5, 460, 32, 1.0],
  ["Omelete simples", "IBGE", 154, 11.2, 1.5, 11.5, 0, 310, 52, 1.6],
  ["Bife à parmegiana", "IBGE", 245, 15.5, 10.2, 16.5, 0.8, 620, 110, 1.8],
  ["Frango à passarinho", "IBGE", 275, 18.5, 8.2, 19.5, 0.5, 540, 22, 1.1],
  ["Peixe frito", "IBGE", 255, 16.5, 12.5, 16.0, 0.5, 480, 25, 0.8],
  ["Sopa de legumes", "IBGE", 45, 2.5, 6.5, 1.2, 1.5, 280, 18, 0.5],
  ["Canja de galinha", "IBGE", 65, 4.5, 8.2, 1.8, 0.5, 310, 12, 0.6],
  ["Caldo verde", "IBGE", 72, 5.2, 9.5, 1.5, 0.8, 340, 15, 0.7],
  ["Mocotó", "IBGE", 180, 15.5, 2.5, 12.5, 0, 480, 32, 1.4],
  ["Sarapatel", "IBGE", 195, 12.5, 10.5, 11.5, 2.5, 520, 45, 2.1],
  ["Buchada", "IBGE", 185, 14.5, 5.5, 11.5, 0.5, 490, 28, 1.8],
  ["Cuscuz doce", "IBGE", 135, 2.5, 28.5, 1.5, 1.2, 45, 15, 0.4],
  ["Arroz doce", "IBGE", 145, 3.2, 28.5, 2.1, 0.5, 55, 65, 0.3],
  ["Canjica (doce)", "IBGE", 165, 3.5, 32.5, 2.5, 1.5, 45, 58, 0.5],
  ["Pamonha", "IBGE", 175, 4.1, 31.5, 3.5, 1.8, 52, 75, 0.6],
  ["Pudim de leite condensado", "IBGE", 285, 5.5, 45.5, 9.5, 0, 120, 115, 0.2],
  ["Quindim", "IBGE", 295, 5.8, 42.5, 11.5, 0, 130, 105, 0.3],
  ["Beijinho", "IBGE", 325, 4.5, 48.5, 12.5, 1.5, 95, 85, 0.4],
  ["Mousse de chocolate", "IBGE", 255, 4.2, 35.5, 10.5, 1.5, 85, 65, 1.2],
  ["Pavê", "IBGE", 275, 4.5, 38.5, 11.5, 0.5, 110, 85, 0.6],
  ["Salada de frutas", "IBGE", 55, 0.8, 13.5, 0.2, 2.1, 5, 15, 0.3],
  ["Biscoito de polvilho", "IBGE", 420, 1.5, 80.5, 10.5, 0.5, 650, 12, 0.2],

  // ==========================================
  // 🟠 BASE TBCA (50 INDUSTRIAZALIZADOS / SUPLEMENTOS)
  // ==========================================
  ["Whey Protein Concentrado (pó)", "TBCA", 400, 75.0, 10.0, 6.0, 0, 150, 400, 1.0],
  ["Whey Protein Isolado (pó)", "TBCA", 370, 90.0, 2.0, 1.0, 0, 100, 350, 0.5],
  ["Maltodextrina (pó)", "TBCA", 380, 0, 95.0, 0, 0, 50, 10, 0.1],
  ["Albumina (pó)", "TBCA", 350, 80.0, 5.0, 0, 0, 1200, 50, 0.5],
  ["Creatina (pó)", "TBCA", 0, 0, 0, 0, 0, 0, 0, 0],
  ["BCAA (pó)", "TBCA", 400, 100.0, 0, 0, 0, 0, 0, 0],
  ["Glutamina (pó)", "TBCA", 400, 100.0, 0, 0, 0, 0, 0, 0],
  ["Pasta de amendoim integral", "TBCA", 588, 25.0, 20.0, 49.0, 8.0, 10, 45, 2.5],
  ["Pão integral, de forma", "TBCA", 250, 10.5, 45.0, 3.5, 7.5, 450, 65, 2.1],
  ["Iogurte grego tradicional", "TBCA", 100, 7.5, 4.5, 6.5, 0, 45, 120, 0.1],
  ["Iogurte grego zero gordura", "TBCA", 60, 8.5, 4.5, 0, 0, 45, 130, 0.1],
  ["Requeijão light", "TBCA", 160, 12.5, 3.5, 11.0, 0, 500, 350, 0.2],
  ["Peito de peru light", "TBCA", 105, 16.5, 1.5, 3.5, 0, 850, 15, 0.8],
  ["Presunto de peru", "TBCA", 100, 16.0, 2.0, 3.0, 0, 950, 12, 1.1],
  ["Atum em conserva (água)", "TBCA", 116, 25.5, 0, 0.8, 0, 350, 15, 1.5],
  ["Sardinha em conserva (óleo)", "TBCA", 208, 24.6, 0, 11.5, 0, 400, 382, 2.9],
  ["Granola", "TBCA", 380, 12.5, 65.0, 7.5, 10.5, 25, 45, 3.5],
  ["Biscoito Maria", "TBCA", 425, 8.5, 75.0, 10.5, 2.5, 350, 25, 1.5],
  ["Biscoito recheado sabor chocolate", "TBCA", 475, 5.5, 68.0, 19.5, 2.5, 250, 35, 2.1],
  ["Cereal matinal (Corn Flakes)", "TBCA", 370, 7.5, 84.0, 0.5, 3.5, 550, 25, 12.5],
  ["Macarrão instantâneo (com tempero)", "TBCA", 450, 9.5, 60.0, 18.5, 2.5, 1500, 25, 1.5],
  ["Margarina com sal", "TBCA", 720, 0.5, 0.5, 80.0, 0, 850, 15, 0.1],
  ["Manteiga com sal", "TBCA", 717, 0.8, 0.1, 81.0, 0, 650, 24, 0.2],
  ["Azeite de oliva", "TBCA", 884, 0, 0, 100.0, 0, 0, 0, 0],
  ["Óleo de soja", "TBCA", 884, 0, 0, 100.0, 0, 0, 0, 0],
  ["Maionese", "TBCA", 700, 1.0, 5.0, 75.0, 0, 650, 15, 0.5],
  ["Achocolatado em pó", "TBCA", 385, 4.5, 85.0, 2.5, 4.5, 150, 85, 3.5],
  ["Leite condensado", "TBCA", 321, 7.9, 54.3, 8.0, 0, 127, 284, 0.2],
  ["Creme de leite", "TBCA", 345, 2.5, 3.5, 35.0, 0, 45, 95, 0.1],
  ["Suco de uva integral (caixa)", "TBCA", 65, 0.5, 15.5, 0, 0.2, 10, 12, 0.5],
  ["Néctar de pêssego (caixa)", "TBCA", 45, 0.2, 11.5, 0, 0.5, 15, 8, 0.2],
  ["Refrigerante sabor cola", "TBCA", 42, 0, 10.5, 0, 0, 15, 2, 0.1],
  ["Refrigerante Guaraná", "TBCA", 40, 0, 10.0, 0, 0, 12, 2, 0.1],
  ["Cerveja Pilsen", "TBCA", 43, 0.5, 3.5, 0, 0, 5, 4, 0],
  ["Vinho tinto seco", "TBCA", 85, 0.2, 2.5, 0, 0, 5, 8, 0.5],
  ["Chocolate ao leite", "TBCA", 535, 7.5, 58.5, 30.0, 3.5, 85, 180, 2.5],
  ["Chocolate meio amargo", "TBCA", 515, 5.5, 52.5, 32.0, 7.5, 15, 65, 4.5],
  ["Barra de cereais", "TBCA", 410, 5.5, 72.0, 11.5, 5.5, 250, 45, 2.5],
  ["Amendoim torrado (sem sal)", "TBCA", 585, 25.5, 21.0, 49.5, 8.5, 5, 54, 2.2],
  ["Castanha-de-caju, torrada", "TBCA", 553, 18.2, 30.2, 43.8, 3.3, 12, 37, 6.7],
  ["Castanha-do-brasil (pará)", "TBCA", 656, 14.3, 12.2, 66.4, 7.5, 3, 160, 2.4],
  ["Semente de chia", "TBCA", 486, 16.5, 42.1, 30.7, 34.4, 16, 631, 7.7],
  ["Semente de linhaça", "TBCA", 495, 18.2, 28.8, 42.1, 27.3, 30, 255, 5.7],
  ["Quinoa em grãos", "TBCA", 368, 14.1, 64.1, 6.0, 7.0, 5, 47, 4.6],
  ["Amaranto em grãos", "TBCA", 371, 13.5, 65.2, 7.0, 6.7, 4, 159, 7.6],
  ["Leite de soja (pó)", "TBCA", 450, 35.5, 30.5, 18.5, 5.5, 150, 85, 4.5],
  ["Tofu", "TBCA", 76, 8.1, 1.9, 4.8, 0.3, 7, 350, 5.4],
  ["Hambúrguer bovino (congelado)", "TBCA", 260, 14.5, 2.5, 21.5, 0, 850, 15, 2.2],
  ["Salsicha em conserva (óleo)", "TBCA", 245, 12.5, 2.5, 20.5, 0, 950, 18, 1.8],
  ["Linguiça tipo calabresa", "TBCA", 310, 14.5, 2.0, 27.5, 0, 1200, 25, 1.5]
];

async function main() {
  console.log('🚀 Iniciando a injeção de 150 alimentos no Banco de Dados...');

  const foodsToInsert = rawFoods.map(food => ({
    name: food[0] as string,
    source: food[1] as string,
    kcal: food[2] as number,
    protein: food[3] as number,
    carbs: food[4] as number,
    fat: food[5] as number,
    fiber: food[6] as number,
    sodium: food[7] as number,
    calcium: food[8] as number,
    iron: food[9] as number,
    baseUnit: "100g",
    baseAmount: 100
  }));

  const result = await prisma.food.createMany({
    data: foodsToInsert,
    skipDuplicates: true, 
  });

  console.log(`✅ Sucesso! ${result.count} novos alimentos foram injetados no sistema.`);
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o Seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });