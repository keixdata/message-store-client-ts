import { Client, credentials } from "@grpc/grpc-js";
import { serialize, deserialize } from "./utils";
import {
  SendCommandOptions,
  EmitEventOptions,
  ReadLastMessageOptions,
  SubscriberOptions,
  Message,
  Handler,
  EventDefinition,
  CommandDefinition,
  ProjectorOptions,
  Projector,
  PublishResponse,
  BaseMetadata,
  ServiceDefinition,
  ReadMessageAtPositionOptions,
  PublishOptions,
} from "./types";

const port = process.env.PORT ?? "8080";
const host = process.env.HOST ?? `0.0.0.0:${port}`;

const client = new Client(host, credentials.createInsecure());

function promisify<T>(
  ...args: [string, (opb: {}) => Buffer, (buf: Buffer) => {}, {}]
): Promise<T> {
  return new Promise(function (resolve, reject) {
    const [a, b, c, d] = args;
    const callback = (err: Error, res: T) =>
      err != null ? reject(err) : resolve(res);

    client.makeUnaryRequest(a, b, c, d, callback);
  });
}

export async function publish<
  Data = {},
  Metadata extends BaseMetadata = BaseMetadata
>(options: PublishOptions<Data, Metadata>): Promise<PublishResponse> {
  return promisify(
    "/MessageStore/Publish",
    serialize,
    deserialize,
    options
  ).then((res: any) => ({
    streamName: res.stream_name,
    globalPosition: res.global_position,
    time: res.time,
    position: res.position,
  }));
}
export async function sendCommand<
  Data = {},
  Metadata extends BaseMetadata = BaseMetadata
>(options: SendCommandOptions<Data, Metadata>): Promise<PublishResponse> {
  return promisify(
    "/MessageStore/SendCommand",
    serialize,
    deserialize,
    options
  ).then((res: any) => ({
    streamName: res.stream_name,
    globalPosition: res.global_position,
    time: res.time,
    position: res.position,
  }));
}

export async function registerService(
  service: ServiceDefinition
): Promise<boolean> {
  return promisify(
    "/MessageStore/RegisterService",
    serialize,
    deserialize,
    service
  );
}
export async function getService(name: string): Promise<boolean> {
  return promisify("/MessageStore/GetService", serialize, deserialize, {
    name,
  });
}
export async function retrieveServices(): Promise<boolean> {
  return promisify(
    "/MessageStore/RetrieveServices",
    serialize,
    deserialize,
    {}
  );
}

export async function readLastMessage<T = Message>(
  options: ReadLastMessageOptions
): Promise<T> {
  return promisify(
    "/MessageStore/ReadLastMessage",
    serialize,
    deserialize,
    options
  );
}
export async function readMessageAtPosition<T = Message>(
  options: ReadMessageAtPositionOptions
): Promise<T> {
  return promisify(
    "/MessageStore/ReadMessageAtPosition",
    serialize,
    deserialize,
    options
  );
}

export async function emitEvent<
  Data = {},
  Metadata extends BaseMetadata = BaseMetadata
>(options: EmitEventOptions<Data, Metadata>): Promise<PublishResponse> {
  return promisify(
    "/MessageStore/EmitEvent",
    serialize,
    deserialize,
    options
  ).then((res: any) => ({
    streamName: res.stream_name,
    globalPosition: res.global_position,
    time: res.time,
    position: res.position,
  }));
}

export function subscribe<T, Ctx>(
  options: SubscriberOptions,
  handler: Handler<T, Ctx>,
  context?: Ctx
) {
  const subscriberId = options.subscriberId ?? v4();
  let count = 0;

  console.log("Subscribe", subscriberId, options);
  const stream = client.makeServerStreamRequest<SubscriberOptions, Message>(
    "/MessageStore/Subscribe",
    serialize,
    deserialize,
    options
  );

  let promise = Promise.resolve();
  stream.on("data", (msg) => {
    // If its' the keep alive.
    if ("ok" in msg) {
      const date = new Date(msg.time ?? new Date().valueOf());
      options.onKeepAlive != null && options.onKeepAlive(subscriberId, date);
      return;
    }

    count++;

    // Update the stats.
    options.onStatsUpdated != null &&
      options.onStatsUpdated(subscriberId, { count });

    promise = promise
      .then(() => {
        const maybePromise: any = handler(msg, context);
        if ("then" in maybePromise) {
          return maybePromise;
        } else {
          return Promise.resolve();
        }
      })
      .catch((err) => {
        console.error(
          "Catched an error in a subscriber, enabling fail safe..."
        );
        console.error(err);
        return Promise.resolve();
      });
  });

  return () => {
    stream.on("error", () => null);
    stream.cancel();
  };
}

export function combineSubscriber(...args: (() => void)[]) {
  return () => {
    args.forEach((close) => close());
  };
}

export async function runProjector<State, Message>(
  options: ProjectorOptions,
  reducer: Projector<State, Message>,
  initialValue: State
): Promise<State> {
  const stream = client.makeServerStreamRequest<SubscriberOptions, Message>(
    "/MessageStore/RunProjector",
    serialize,
    deserialize,
    options
  );

  // Return a new promise, that will be resolved once the END cmd is received,
  // with the reduced value.
  return new Promise((resolve) => {
    let value = initialValue;
    stream.on("data", (msg: Message | { _cmd: "END" }) => {
      if ("_cmd" in msg) {
        resolve(value);
      } else {
        value = reducer(value, msg);
      }
    });
  });
}

import * as testUtils from "./test_utils";
import { Base } from "msgpack5";
import { uniqueId } from "lodash";
import { v4 } from "uuid";
export { Message, ServiceDefinition, EventDefinition, CommandDefinition };
export { testUtils };
export { getTypescriptDefinition } from "./definition";
export { createEndpoint } from "./endpoint";
