import { Message, SendCommandOptions, EmitEventOptions } from "./types";
import { v4 } from "uuid";

let messages = {};
let globalPosition = 0;

type PartialMessage = Omit<
  Message<string, {}, {}>,
  "global_position" | "position" | "time" | "id"
>;

export function pushMessage(message: PartialMessage) {
  const { stream_name } = message;
  const prev = messages[stream_name] ?? [];
  const nextMessage = {
    ...message,
    id: v4(),
    global_position: globalPosition++,
    position: prev.length
  };
  messages[stream_name] = [...prev, nextMessage];
  return nextMessage.global_position;
}

export function getStreamMessages(streamName: string): Message[] {
  return messages[streamName];
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
    }
  }));
}

mockMessageStore();
