import { Controller, Get } from '@nestjs/common';
import { Public } from './src/common/decorators/public.decorator';

@Controller()
export class AppController {
  @Public()
  @Get()
  getHello(): string {
    return 'API do Ecossistema Resiliência está ONLINE e a bombar! 🚀';
  }

  @Public()
  @Get('ping')
  getPing(): string {
    return 'pong';
  }
}
