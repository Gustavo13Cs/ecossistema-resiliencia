import { ClinicalResponse } from './src/common/decorators/clinical-response.decorator';
import { Controller, Get } from '@nestjs/common';
import { Public } from './src/common/decorators/public.decorator';

@Controller()
export class AppController {
  @Public()
  @ClinicalResponse({ exception: 'health' })
  @Get()
  getHello(): string {
    return 'API do Ecossistema Resiliência está ONLINE e a bombar! 🚀';
  }

  @Public()
  @ClinicalResponse({ exception: 'health' })
  @Get('ping')
  getPing(): string {
    return 'pong';
  }
}
