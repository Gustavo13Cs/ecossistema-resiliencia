import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';
import { CreateFoodDto } from './dto/create-food.dto';

@Injectable()
export class FoodsService {
  constructor(private prisma: PrismaService) {}

  private fatSecretToken: string | null = null;
  private tokenExpiry: number = 0;

  // 🔑 1. Busca o Token VIP do FatSecret
  private async getFatSecretToken() {
    if (this.fatSecretToken && Date.now() < this.tokenExpiry) {
      return this.fatSecretToken;
    }

    const clientId = process.env.FATSECRET_CLIENT_ID;
    const clientSecret = process.env.FATSECRET_CLIENT_SECRET;
    
    // ESPIÃO 1: Vê se o backend leu o ficheiro .env
    console.log("🔑 Verificando chaves - ID:", !!clientId, "| Secret:", !!clientSecret);

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    try {
      const response = await fetch('https://oauth.fatsecret.com/connect/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials&scope=basic'
      });

      const data = await response.json();
      
      // ESPIÃO 2: O que o FatSecret respondeu sobre a nossa senha?
      console.log("🎫 Resposta da Geração do Token:", data);

      if (data.error) {
         console.error("❌ ERRO FATSECRET TOKEN:", data.error_description || data.error);
         return null;
      }

      this.fatSecretToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in - 300) * 1000; 
      return this.fatSecretToken;
    } catch (err) {
      console.error("❌ ERRO GRAVE NO FETCH DO TOKEN:", err);
      return null;
    }
  }

  // 🚀 2. O Motor de Busca Híbrido
  async searchFoods(query: string) {
    if (!query || query.length < 2) return [];

    const localFoods = await this.prisma.food.findMany({
      where: { name: { contains: query, mode: 'insensitive' } },
      take: 5
    });

    let externalFoods = [];

    try {
      const token = await this.getFatSecretToken();
      
      if (!token) {
        console.log("⚠️ Busca global abortada porque não há token válido.");
        return localFoods;
      }

      const url = `https://platform.fatsecret.com/rest/server.api?method=foods.search&search_expression=${encodeURIComponent(query)}&format=json&region=BR&language=pt&max_results=10`;
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      // ESPIÃO 3: O que o FatSecret encontrou na busca?
      console.log("🍔 Resposta da Busca (FatSecret):", JSON.stringify(data).substring(0, 150) + "...");

      if (data.error) {
         console.error("❌ ERRO FATSECRET BUSCA:", data.error.message);
      } else if (data.foods && data.foods.food) {
        const items = Array.isArray(data.foods.food) ? data.foods.food : [data.foods.food];
        
        externalFoods = items.map((item: any) => {
          const desc = item.food_description || "";
          const kcalMatch = desc.match(/Calorias:\s*([0-9,.]+)/i) || desc.match(/Calories:\s*([0-9,.]+)/i);
          const fatMatch = desc.match(/Gord:\s*([0-9,.]+)/i) || desc.match(/Fat:\s*([0-9,.]+)/i);
          const carbMatch = desc.match(/Carbs:\s*([0-9,.]+)/i);
          const proMatch = desc.match(/Prot:\s*([0-9,.]+)/i) || desc.match(/Protein:\s*([0-9,.]+)/i);

          return {
            id: `fatsecret_${item.food_id}`, 
            name: `${item.food_name} ${item.brand_name ? `(${item.brand_name})` : ''}`,
            baseUnit: "100g",
            baseAmount: 100,
            kcal: kcalMatch ? parseFloat(kcalMatch[1].replace(',', '.')) : 0,
            protein: proMatch ? parseFloat(proMatch[1].replace(',', '.')) : 0,
            carbs: carbMatch ? parseFloat(carbMatch[1].replace(',', '.')) : 0,
            fat: fatMatch ? parseFloat(fatMatch[1].replace(',', '.')) : 0,
            isExternal: true 
          };
        });
      }
    } catch (error) {
      console.error("❌ ERRO NA API DO FATSECRET:", error);
    }

    return [...localFoods, ...externalFoods];
  }

  // 📝 3. FUNÇÕES ORIGINAIS INTACTAS
  async create(createFoodDto: CreateFoodDto) {
    return this.prisma.food.create({
      data: createFoodDto,
    });
  }

  async findAll() {
    return this.prisma.food.findMany({
      orderBy: { name: 'asc' },
    });
  }
}