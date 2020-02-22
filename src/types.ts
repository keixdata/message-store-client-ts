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

export type Projector<State, Msg> = (prev: State, next: Msg) => State;
export type Handler<I = {}, Ctx = void> = (
  next: I,
  context?: Ctx
) => Promise<any> | void;

export interface ReadLastMessageOptions {
  streamName: string;
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
export interface ProjectorOptions {
  streamName: string;
  untilPosition?: number;
}

export type Message<
  Type = string,
  Data = any,
  Metadata = { traceId: string }
> = {
  id: string;
  stream_name: string;
  type: Type;
  position: number;
  global_position: number;
  data: Data;
  metadata: Metadata;
  time: Date;
};
