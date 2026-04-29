import { Body, Controller, Headers, Post } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { TelegramUpdateService } from './telegram-update.service';
import { TelegramUpdate } from './telegram-update.types';

@Public()
@Controller('telegram')
export class TelegramWebhookController {
  constructor(private readonly telegramUpdateService: TelegramUpdateService) {}

  @Post('webhook')
  async handleWebhook(
    @Body() update: TelegramUpdate,
    @Headers('x-telegram-bot-api-secret-token') secretToken?: string
  ) {
    this.telegramUpdateService.validateSecret(secretToken);

    return {
      success: true,
      data: await this.telegramUpdateService.handleUpdate(update)
    };
  }
}
