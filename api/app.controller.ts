import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  
  @Get()
  getHello(): string {
    return 'API do Ecossistema Resiliência está ONLINE e a bombar! 🚀';
  }

  @Get('ping')
  getPing(): string {
    return 'pong';
  }
}