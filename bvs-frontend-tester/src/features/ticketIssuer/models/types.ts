export type LogType = 'system' | 'info' | 'warn' | 'error';

export type TerminalLine = {
  id: string;
  time: string;
  message: string;
  type: LogType;
};

export type EmitPayload = {
  voteId: string;
  electionId: string;
  voterToken: string;
};
