import { Injectable } from '@nestjs/common';

type SendMessageInput = {
  chatId: string;
  messageThreadId?: number;
  replyToMessageId?: number;
  text: string;
};

@Injectable()
export class TelegramClient {
  async sendMessage(input: SendMessageInput): Promise<void> {
    const token = this.getBotToken();
    const body: Record<string, unknown> = {
      chat_id: input.chatId,
      text: input.text
    };

    if (typeof input.messageThreadId === 'number') {
      body.message_thread_id = input.messageThreadId;
    }

    if (typeof input.replyToMessageId === 'number') {
      body.reply_to_message_id = input.replyToMessageId;
      body.allow_sending_without_reply = true;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(`${this.getApiBaseUrl()}/bot${token}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      const responseText = await response.text();
      const payload = this.parseResponse(responseText);

      if (!response.ok || payload?.ok === false) {
        throw new Error(
          `Telegram sendMessage failed with status ${response.status}: ${this.truncate(responseText, 300)}`
        );
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  private getBotToken() {
    const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN is not configured');
    }

    return token;
  }

  private getApiBaseUrl() {
    return (process.env.TELEGRAM_API_BASE_URL || 'https://api.telegram.org').replace(/\/$/, '');
  }

  private parseResponse(value: string): { ok?: boolean } | null {
    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value) as { ok?: boolean };
    } catch {
      return null;
    }
  }

  private truncate(value: string, maxLength: number) {
    return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
  }
}
