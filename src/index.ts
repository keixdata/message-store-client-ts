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
} from "./types";

const port = process.env.PORT ?? "8080";
const host = process.env.HOST ?? `0.0.0.0:${port}`;

const client = new Client(host, credentials.createInsecure());

function promisify<T>(
  ...args: [string, (opb: {}) => Buffer, (buf: Buffer) => {}, {}, null, null]
): Promise<T> {
  return new Promise(function (resolve, reject) {
    const [a, b, c, d, e, f] = args;
    const callback = (err: Error, res: T) =>
      err != null ? reject(err) : resolve(res);

    client.makeUnaryRequest(a, b, c, d, e, f, callback);
  });
}

export async function sendCommand<
  Data = {},
  Metadata extends BaseMetadata = BaseMetadata
>(options: SendCommandOptions<Data, Metadata>): Promise<PublishResponse> {
  return promisify(
    "/MessageStore/SendCommand",
    serialize,
    deserialize,
    options,
    null,
    null
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
    service,
    null,
    null
  );
}
export async function getService(name: string): Promise<boolean> {
  return promisify(
    "/MessageStore/GetService",
    serialize,
    deserialize,
    { name },
    null,
    null
  );
}
export async function retrieveServices(): Promise<boolean> {
  return promisify(
    "/MessageStore/RetrieveServices",
    serialize,
    deserialize,
    {},
    null,
    null
  );
}

export async function readLastMessage<T = Message>(
  options: ReadLastMessageOptions
): Promise<T> {
  return promisify(
    "/MessageStore/ReadLastMessage",
    serialize,
    deserialize,
    options,
    null,
    null
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
    options,
    null,
    null
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
      console.log("Received keep alive...");
      return;
    }

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
export { Message, ServiceDefinition, EventDefinition, CommandDefinition };
export { testUtils };
export { getTypescriptDefinition } from "./definition";
