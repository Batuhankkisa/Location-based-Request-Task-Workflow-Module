import { Injectable, Logger } from '@nestjs/common';
import {
  NotificationProvider,
  TaskCreatedNotificationPayload
} from './notification-provider.interface';
import { TelegramClient } from './telegram.client';

@Injectable()
export class TelegramNotificationProvider implements NotificationProvider {
  private readonly logger = new Logger(TelegramNotificationProvider.name);

  constructor(private readonly telegramClient: TelegramClient) {}

  async notifyTaskCreated(payload: TaskCreatedNotificationPayload): Promise<void> {
    if (!payload.organization.telegramEnabled) {
      return;
    }

    const chatId = payload.organization.telegramChatId?.trim();
    if (!chatId) {
      this.logger.warn(`Telegram is enabled but chat id is missing for organization ${payload.organization.id}`);
      return;
    }

    await this.telegramClient.sendMessage({
      chatId,
      messageThreadId: this.parseThreadId(payload.organization.telegramNotificationThreadId),
      text: this.buildTaskCreatedMessage(payload)
    });
  }

  private buildTaskCreatedMessage(payload: TaskCreatedNotificationPayload) {
    const lines = [
      'Yeni talep geldi',
      `Kurum: ${payload.organization.name}`,
      `Lokasyon: ${payload.location.path}`,
      `Talep: ${this.compact(payload.request.text, 900)}`,
      payload.request.transcriptText
        ? `Transcript: ${this.compact(payload.request.transcriptText, 500)}`
        : null,
      `Zaman: ${payload.request.createdAt.toISOString()}`,
      `Durum: ${payload.task.status}`,
      `Task ID: ${payload.task.id}`,
      payload.adminTaskUrl ? `Admin: ${payload.adminTaskUrl}` : null
    ].filter((line): line is string => Boolean(line));

    return this.truncate(lines.join('\n'), 3900);
  }

  private parseThreadId(value: string | null) {
    const cleanValue = value?.trim();
    if (!cleanValue) {
      return undefined;
    }

    const threadId = Number(cleanValue);
    if (!Number.isInteger(threadId)) {
      throw new Error(`Invalid Telegram thread id: ${cleanValue}`);
    }

    return threadId;
  }

  private compact(value: string, maxLength: number) {
    const normalized = value.replace(/\s+/g, ' ').trim();
    return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 3)}...` : normalized;
  }

  private truncate(value: string, maxLength: number) {
    return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
  }
}
