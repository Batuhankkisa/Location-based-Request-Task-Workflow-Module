import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException
} from '@nestjs/common';
import { TasksService } from '../tasks/tasks.service';
import { TelegramClient } from './telegram.client';
import { TelegramMessage, TelegramUpdate, TelegramUser } from './telegram-update.types';

type TelegramUpdateResult = {
  handled: boolean;
  reason: string;
};

@Injectable()
export class TelegramUpdateService {
  private readonly logger = new Logger(TelegramUpdateService.name);

  constructor(
    private readonly tasksService: TasksService,
    private readonly telegramClient: TelegramClient
  ) {}

  validateSecret(secretToken?: string) {
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
    if (!expectedSecret) {
      return;
    }

    if (secretToken !== expectedSecret) {
      throw new UnauthorizedException('Invalid Telegram webhook secret');
    }
  }

  async handleUpdate(update: TelegramUpdate): Promise<TelegramUpdateResult> {
    const message = update.message;
    if (!message?.text) {
      return { handled: false, reason: 'no_text_message' };
    }

    if (message.from?.is_bot) {
      return { handled: false, reason: 'bot_message_ignored' };
    }

    if (!this.isDoneCommand(message.text)) {
      return { handled: false, reason: 'not_done_command' };
    }

    const taskId = this.extractTaskId(message);
    if (!taskId) {
      await this.reply(
        message,
        'Bu komutu ilgili bot bildirimine cevap olarak yaz ya da "yapıldı <taskId>" formatını kullan.'
      );
      return { handled: true, reason: 'missing_task_id' };
    }

    try {
      const result = await this.tasksService.completeFromTelegram({
        taskId,
        chatId: String(message.chat.id),
        messageThreadId: message.message_thread_id,
        actor: this.buildActorLabel(message.from),
        note: `Telegram komutu: ${message.text.trim()}`
      });

      await this.reply(
        message,
        result.changed
          ? `Task onay bekliyor durumuna alındı.\nTask ID: ${result.task.id}`
          : `Task zaten onay bekliyor durumunda.\nTask ID: ${result.task.id}`
      );

      return {
        handled: true,
        reason: result.changed ? 'task_completed' : 'task_already_waiting_approval'
      };
    } catch (error) {
      this.logger.warn(
        `Telegram done command failed for task ${taskId}: ${error instanceof Error ? error.message : String(error)}`
      );

      await this.reply(message, this.buildFailureMessage(error));
      return { handled: true, reason: 'task_update_failed' };
    }
  }

  private isDoneCommand(text: string) {
    const normalized = this.normalizeText(text);
    return (
      normalized === 'yapildi' ||
      normalized === 'tamamlandi' ||
      normalized === '/done' ||
      normalized.startsWith('/done ') ||
      normalized.startsWith('/done@') ||
      normalized.startsWith('yapildi ') ||
      normalized.startsWith('tamamlandi ')
    );
  }

  private extractTaskId(message: TelegramMessage) {
    const commandTaskId = this.extractTaskIdFromText(message.text);
    if (commandTaskId) {
      return commandTaskId;
    }

    return this.extractTaskIdFromText(message.reply_to_message?.text) ?? this.extractTaskIdFromText(message.reply_to_message?.caption);
  }

  private extractTaskIdFromText(text?: string) {
    if (!text) {
      return undefined;
    }

    const taskIdLineMatch = text.match(/Task ID:\s*([^\s]+)/i);
    if (taskIdLineMatch?.[1]) {
      return taskIdLineMatch[1].trim();
    }

    const commandMatch = this.normalizeText(text).match(/^(?:\/done(?:@\w+)?|yapildi|tamamlandi)\s+([a-z0-9_-]+)/i);
    return commandMatch?.[1];
  }

  private buildActorLabel(user?: TelegramUser) {
    if (!user) {
      return 'Telegram';
    }

    if (user.username) {
      return `Telegram @${user.username}`;
    }

    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
    return fullName ? `Telegram ${fullName}` : `Telegram user ${user.id}`;
  }

  private buildFailureMessage(error: unknown) {
    if (error instanceof NotFoundException) {
      return 'Task bulunamadı. Bildirimdeki Task ID artık geçerli olmayabilir.';
    }

    if (error instanceof ForbiddenException || error instanceof UnauthorizedException) {
      return 'Bu Telegram sohbeti bu task için yetkili değil.';
    }

    if (error instanceof BadRequestException) {
      return 'Bu task bu komutla onay bekliyor durumuna alınamaz.';
    }

    return 'Telegram komutu işlenemedi.';
  }

  private async reply(message: TelegramMessage, text: string) {
    await this.telegramClient.sendMessage({
      chatId: String(message.chat.id),
      messageThreadId: message.message_thread_id,
      replyToMessageId: message.message_id,
      text
    });
  }

  private normalizeText(text: string) {
    return text
      .trim()
      .toLocaleLowerCase('tr-TR')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ı/g, 'i')
      .replace(/[.!?]+$/g, '')
      .replace(/\s+/g, ' ');
  }
}
