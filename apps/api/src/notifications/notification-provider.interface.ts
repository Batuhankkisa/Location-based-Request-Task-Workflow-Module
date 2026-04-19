export interface TaskCreatedNotificationPayload {
  taskId: string;
  locationName: string;
  requestText: string;
}

export interface NotificationProvider {
  notifyTaskCreated(payload: TaskCreatedNotificationPayload): Promise<void>;
}
