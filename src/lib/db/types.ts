export interface Session {
  id: string;
  started_at: string;
  ended_at: string | null;
}

export interface Translation {
  id: string;
  session_id: string;
  text: string;
  confidence: number;
  created_at: string;
}
