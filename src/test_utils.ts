import {
  Message,
  SendCommandOptions,
  EmitEventOptions,
  SubscriberOptions,
  Handler,
  ProjectorOptions,
  Projector,
  ReadLastMessageOptions
} from "./types";
import { v4 } from "uuid";
import { map, flatten, sortBy } from "lodash";
import waitForExpect from "wait-for-expect";

let messages = {};
let globalPosition = 0;

type PartialMessage = Omit<
  Message<string, {}, {}>,
  "global_position" | "position" | "time" | "id"
> & { time?: Date };

export function pushMessage(message: PartialMessage) {
  const { stream_name } = message;
  const prev = messages[stream_name] ?? [];
  const nextMessage = {
    ...message,
    time: message.time ?? new Date(),
    id: v4(),
    global_position: globalPosition++,
    position: prev.length
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
    const streams = Object.keys(messages).filter(stream => {
      if (!stream.startsWith(streamName)) {
        return false;
      }
      if (isCommand) {
        return isCommandStream(stream);
      } else {
        return !isCommandStream(stream);
      }
    });
    return sortBy(flatten(map(streams, k => messages[k])), ["global_position"]);
  } else {
    return messages[streamName] ?? [];
  }
}

export function setupMessageStore(initialMessages: PartialMessage[] = []) {
  // Clear the message store.
  messages = {};
  initialMessages.forEach(msg => pushMessage(msg));
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
        metadata: options.metadata ?? {},
        type: options.command,
        stream_name: fakeStreamName
      });
      return Promise.resolve(pos);
    },
    emitEvent(options: EmitEventOptions) {
      const { category, id } = options;
      const fakeStreamName = `${category}-${id}`;
      const pos = pushMessage({
        ...options,
        data: options.data ?? {},
        metadata: options.metadata ?? {},
        type: options.event,
        stream_name: fakeStreamName
      });
      return Promise.resolve(pos);
    },
    subscribe(options: SubscriberOptions, handler: Handler<any>) {
      let position = options.lastPosition ?? 0;
      let numberOfMessageRead = 0;
      function tick() {
        const messageList = getStreamMessages(options.streamName);
        const lastIndex = messageList.length - 1;
        if (messageList.length > numberOfMessageRead) {
          const newMessages = messageList.slice(position);
          numberOfMessageRead += newMessages.length;
          position = lastIndex;
          newMessages.forEach(handler);
        }
      }
      tick();
      const interval = setInterval(() => tick(), 150);
      return () => clearInterval(interval);
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
    }
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
