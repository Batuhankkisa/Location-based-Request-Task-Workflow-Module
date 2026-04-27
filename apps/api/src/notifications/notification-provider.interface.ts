export interface TaskCreatedNotificationPayload {
  organization: {
    id: string;
    name: string;
    telegramEnabled: boolean;
    telegramChatId: string | null;
    telegramNotificationThreadId: string | null;
  };
  location: {
    id: string;
    name: string;
    path: string;
  };
  request: {
    id: string;
    text: string;
    transcriptText: string | null;
    createdAt: Date;
  };
  task: {
    id: string;
    status: string;
  };
  adminTaskUrl?: string;
}

export interface NotificationProvider {
  notifyTaskCreated(payload: TaskCreatedNotificationPayload): Promise<void>;
}
