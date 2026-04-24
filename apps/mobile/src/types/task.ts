import type {
  LocationType,
  OrganizationType,
  RequestChannel,
  RequestMediaType,
  TaskStatus
} from '@lbrtw/shared';

export interface TaskOrganization {
  id: string;
  name: string;
  code: string;
  type: OrganizationType;
  isActive: boolean;
}

export interface TaskLocation {
  id?: string;
  name: string;
  code: string;
  type?: LocationType;
  organization?: TaskOrganization;
}

export interface TaskRequestSummary {
  id?: string;
  requestText: string;
  transcriptText?: string | null;
  audioFileUrl?: string | null;
  channel?: RequestChannel;
  createdAt?: string;
}

export interface TaskListItem {
  id: string;
  status: TaskStatus;
  createdAt: string;
  assignedTo?: string | null;
  completedBy?: string | null;
  approvedBy?: string | null;
  location: TaskLocation;
  request: TaskRequestSummary;
}

export interface RequestMediaItem {
  id: string;
  type: RequestMediaType;
  fileUrl: string;
  storageKey: string;
  mimeType: string;
  fileSize: number;
  originalName?: string | null;
  createdAt: string;
}

export interface VisitorRequestDetail extends TaskRequestSummary {
  id: string;
  channel: RequestChannel;
  createdAt: string;
  qrCode?: {
    id: string;
    token: string;
    label: string;
    imagePath?: string | null;
  } | null;
  media: RequestMediaItem[];
}

export interface TaskHistoryEntry {
  id: string;
  fromStatus?: TaskStatus | null;
  toStatus: TaskStatus;
  note?: string | null;
  changedBy?: string | null;
  createdAt: string;
}

export interface TaskDetail extends Omit<TaskListItem, 'request'> {
  completedAt?: string | null;
  approvedAt?: string | null;
  request: VisitorRequestDetail;
  history: TaskHistoryEntry[];
}

export interface TaskTransitionPayload {
  note?: string;
}
