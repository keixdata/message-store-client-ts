export interface SendCommandOptions {
  command: string;
  category: string;
  data?: {};
  metadata?: {};
  id?: string;
  expectedVersion?: number;
}
export interface EmitEventOptions {
  event: string;
  category: string;
  data?: {};
  metadata?: {};
  id?: string;
  expectedVersion?: number;
}
export interface SubscriberOptions {
  streamName: string;
  subscriberId?: string;
  tickDelayMs?: number;
  lastPosition?: number;
  consumerGroupSize?: number;
  consumerGroupMember?: number;
  positionUpdateInterval?: number;
  idleUpdateInterval?: number;
}
export interface Message<Type = "", Data = {}, Metadata = { traceId: string }> {
  id: string;
  stream_name: string;
  type: Type;
  position: number;
  global_position: number;
  data: Data;
  metadata: Metadata;
  time: Date;
}
