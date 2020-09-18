import { Base } from "msgpack5";
import { JSONSchema } from "json-schema-to-typescript";

export interface SendCommandOptions<
  Data = {},
  Metadata extends BaseMetadata = BaseMetadata
> {
  command: string;
  category: string;
  data?: Data;
  metadata?: Metadata;
  id?: string;
  expectedVersion?: number;
}
export interface EmitEventOptions<
  Data = {},
  Metadata extends BaseMetadata = BaseMetadata
> {
  event: string;
  category: string;
  data?: Data;
  metadata?: Metadata;
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

export interface PublishResponse {
  streamName: string;
  position: string;
  time: string;
  globalPosition: string;
}

export interface SubscriberStats {
  count: number;
}

export interface SubscriberOptions {
  streamName: string;
  subscriberId?: string;
  condition?: string;
  tickDelayMs?: number;
  lastPosition?: number;
  consumerGroupSize?: number;
  consumerGroupMember?: number;
  positionUpdateInterval?: number;
  idleUpdateInterval?: number;
  onKeepAlive?: (subscriberId: string, date: Date) => void;
  onStatsUpdated?: (
    subscriberId: string,
    subscriberStats: SubscriberStats
  ) => void;
}
export interface ProjectorOptions {
  streamName: string;
  untilPosition?: number;
}

export interface BaseMetadata {
  traceId: string;
  userId?: string;
}

export type Message<
  Type = string,
  Data = any,
  Metadata extends BaseMetadata = BaseMetadata
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

export interface CommandDefinition {
  name: string;
  stream: string;
  description: string;
  payload: JSONSchema;
}

export interface EventDefinition {
  name: string;
  stream: string;
  description: string;
  payload: JSONSchema;
}

export interface ServiceDefinition {
  name: string;
  description: string;
  commands: CommandDefinition[];
  events: EventDefinition[];
}
