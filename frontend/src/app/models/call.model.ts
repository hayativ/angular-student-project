export type CallStatus = 'scheduled' | 'in_progress' | 'completed';

export interface Call {
  id: string;
  customerName: string;
  agentName: string;
  status: CallStatus;
  scheduledAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  topic: string;
  notes: string;
  updatedAt: string;
}

export interface CallsListResponse {
  items: Call[];
  page: number;
  totalPages: number;
  totalItems: number;
}
