import type { TaskDetail, TaskListItem, TaskTransitionPayload } from '../types/task';
import { apiClient, unwrapResponse } from './client';

function normalizePayload(payload?: TaskTransitionPayload) {
  const note = payload?.note?.trim();
  return note ? { note } : {};
}

export const tasksApi = {
  list() {
    return unwrapResponse<TaskListItem[]>(apiClient.get('/tasks'));
  },

  getById(taskId: string) {
    return unwrapResponse<TaskDetail>(apiClient.get(`/tasks/${taskId}`));
  },

  start(taskId: string, payload?: TaskTransitionPayload) {
    return unwrapResponse<TaskDetail>(apiClient.patch(`/tasks/${taskId}/start`, normalizePayload(payload)));
  },

  complete(taskId: string, payload?: TaskTransitionPayload) {
    return unwrapResponse<TaskDetail>(
      apiClient.patch(`/tasks/${taskId}/complete`, normalizePayload(payload))
    );
  },

  approve(taskId: string, payload?: TaskTransitionPayload) {
    return unwrapResponse<TaskDetail>(
      apiClient.patch(`/tasks/${taskId}/approve`, normalizePayload(payload))
    );
  },

  reject(taskId: string, payload?: TaskTransitionPayload) {
    return unwrapResponse<TaskDetail>(
      apiClient.patch(`/tasks/${taskId}/reject`, normalizePayload(payload))
    );
  }
};
