export type TranscriptSpeaker = 'agent' | 'customer';

export interface TranscriptSegment {
  t: number;
  speaker: TranscriptSpeaker;
  text: string;
}

export interface CallTranscript {
  id: string;
  callId: string;
  createdAt: string;
  language: string;

  meta: {
    customerName: string | null;
    agentName: string | null;
    topic: string | null;
  };

  segments: TranscriptSegment[];
}
