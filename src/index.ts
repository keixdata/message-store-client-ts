import { Client, credentials } from "grpc";
import { serialize, deserialize } from "./utils";
import {
  SendCommandOptions,
  EmitEventOptions,
  ReadLastMessageOptions,
  SubscriberOptions,
  Message,
  Handler,
  ProjectorOptions,
  Projector
} from "./types";

const port = process.env.PORT ?? "8080";
const host = process.env.HOST ?? `0.0.0.0:${port}`;

const client = new Client(host, credentials.createInsecure());

function promisify<T>(...args): Promise<T> {
  return new Promise(function(resolve, reject) {
    client.makeUnaryRequest(...args, (err: Error, res: T) =>
      err != null ? reject(err) : resolve(res)
    );
  });
}

export async function sendCommand(
  options: SendCommandOptions
): Promise<string> {
  return promisify(
    "/MessageStore/SendCommand",
    serialize,
    deserialize,
    options,
    null,
    null
  );
}
export async function readLastMessage<T>(
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

export async function emitEvent(options: EmitEventOptions): Promise<string> {
  return promisify(
    "/MessageStore/EmitEvent",
    serialize,
    deserialize,
    options,
    null,
    null
  );
}

export async function subscribe<T>(
  options: SubscriberOptions,
  handler: Handler<T>
) {
  const stream = client.makeServerStreamRequest<SubscriberOptions, Message>(
    "/MessageStore/Subscribe",
    serialize,
    deserialize,
    options
  );

  let promise = Promise.resolve();
  stream.on("data", msg => {
    promise = promise.then(() => {
      const maybePromise: any = handler(msg);
      if ("then" in maybePromise) {
        return maybePromise;
      } else {
        return Promise.resolve();
      }
    });
  });
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
  return new Promise(resolve => {
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

export { Message };
