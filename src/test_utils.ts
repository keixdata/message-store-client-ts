import {
  Message,
  SendCommandOptions,
  EmitEventOptions,
  SubscriberOptions,
  Handler,
  ProjectorOptions,
  Projector,
  BaseMetadata,
  ReadLastMessageOptions,
} from "./types";
import { v4 } from "uuid";
import { map, flatten, sortBy, startsWith } from "lodash";
import waitForExpect from "wait-for-expect";

let messages = {};
let globalPosition = 0;

type PartialMessage = Omit<
  Message<string, {}>,
  "global_position" | "position" | "time" | "id" | "metadata"
> & { time?: Date; metadata?: Partial<BaseMetadata> };

export function pushMessage(message: PartialMessage) {
  const { stream_name } = message;
  const prev = messages[stream_name] ?? [];
  const nextMessage = {
    ...message,
    time: message.time ?? new Date(),
    id: v4(),
    global_position: globalPosition++,
    position: prev.length,
  };
  messages[stream_name] = [...prev, nextMessage];
  return nextMessage.global_position;
}

function isCategoryStream(streamName: string) {
  return streamName.indexOf("-") < 0;
}

function isCommandStream(streamName: string) {
  return streamName.indexOf(":command") >= 0;
}

export function getStreamMessages(streamName: string): Message[] {
  const isCategory = isCategoryStream(streamName);
  const isCommand = isCommandStream(streamName);

  if (isCategory) {
    const streams = Object.keys(messages).filter((stream) => {
      if (
        !stream.endsWith(streamName) &&
        !stream.startsWith(`${streamName}-`) &&
        !stream.startsWith(`${streamName}:`)
      ) {
        return false;
      }
      if (isCommand) {
        return isCommandStream(stream);
      } else {
        return !isCommandStream(stream);
      }
    });
    return sortBy(flatten(map(streams, (k) => messages[k])), [
      "global_position",
    ]);
  } else {
    return messages[streamName] ?? [];
  }
}

export function setupMessageStore(initialMessages: PartialMessage[] = []) {
  // Clear the message store.
  messages = {};
  initialMessages.forEach((msg) => pushMessage(msg));
}

export const serialPromises = <T>(fns: (() => Promise<T>)[]) =>
  fns.reduce(
    (promise, fn) =>
      promise.then((results) => fn().then((r) => [...results, r])),
    Promise.resolve([] as T[])
  );

async function pushSerial(
  queue: Promise<any>,
  fn: () => Promise<any>
): Promise<any> {
  await queue;
  return fn();
}

export function mockMessageStore() {
  jest.doMock("./index", () => ({
    __esModule: true,
    sendCommand(options: SendCommandOptions) {
      const { category, id } = options;
      const fakeStreamName = `${category}:command-${id}`;
      const pos = pushMessage({
        ...options,
        data: options.data ?? {},
        metadata: options.metadata ?? { traceId: v4() },
        type: options.command,
        stream_name: fakeStreamName,
      });
      return Promise.resolve({ streamName: fakeStreamName, position: pos });
    },
    emitEvent(options: EmitEventOptions) {
      const { category, id } = options;
      const fakeStreamName = `${category}-${id}`;
      const pos = pushMessage({
        ...options,
        data: options.data ?? {},
        metadata: options.metadata ?? { traceId: v4() },
        type: options.event,
        stream_name: fakeStreamName,
      });
      return Promise.resolve({ streamName: fakeStreamName, position: pos });
    },
    subscribe(
      options: SubscriberOptions,
      handler: Handler<any, any>,
      context: any
    ) {
      let queue = Promise.resolve();
      let numberOfMessageRead = 0;

      async function tick() {
        const messageList = getStreamMessages(options.streamName);
        const lastIndex = messageList.length - 1;
        if (messageList.length > numberOfMessageRead) {
          const newMessages = messageList.slice(numberOfMessageRead);
          numberOfMessageRead += newMessages.length;

          await serialPromises(
            newMessages.map((msg) => {
              return async () => {
                const maybePromise: any = handler(msg, context);
                if (maybePromise != null && "then" in maybePromise) {
                  await maybePromise;
                }
                return;
              };
            })
          );
        } else {
          return Promise.resolve();
        }
      }

      tick();
      const interval = setInterval(() => {
        queue = pushSerial(queue, tick);
      }, 150);
      return () => clearInterval(interval);
    },
    combineSubscriber(...args: (() => void)[]) {
      return () => {
        args.forEach((close) => close());
      };
    },
    readLastMessage(options: ReadLastMessageOptions) {
      const messages = getStreamMessages(options.streamName);
      return Promise.resolve(
        messages.length > 0 ? messages[messages.length - 1] : null
      );
    },
    runProjector(
      options: ProjectorOptions,
      reducer: Projector<any, any>,
      initialValue: any
    ) {
      const messagesList = getStreamMessages(options.streamName);
      return Promise.resolve(messagesList.reduce(reducer, initialValue));
    },
  }));
}

export async function expectIdempotency(
  run: () => Promise<() => void>,
  expectation: () => void
) {
  let stop = await run();
  await waitForExpect(expectation);
  stop();

  stop = await run();
  await waitForExpect(expectation);
  stop();
}

// Mock the message store if running in test mode.
if (process.env.NODE_ENV === "test") {
  mockMessageStore();
}

export { waitForExpect };
