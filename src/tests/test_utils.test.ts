import {
  mockMessageStore,
  pushMessage,
  getStreamMessages,
  setupMessageStore
} from "../test_utils";
import { sendCommand, runProjector, subscribe, Message } from "..";
import waitForExpect from "wait-for-expect";

test("the mocked message store adds messages to the streams and calculate the positions", () => {
  setupMessageStore([
    { stream_name: "example", type: "SAY_HELLO", data: {}, metadata: {} }
  ]);

  pushMessage({
    stream_name: "example",
    type: "SAY_HELLO",
    data: {},
    metadata: {}
  });
  pushMessage({
    stream_name: "example-abc",
    type: "SAY_HELLO",
    data: {},
    metadata: {}
  });

  let messages = getStreamMessages("example");
  expect(messages).toHaveLength(3);
  expect(messages[1].id).not.toBeUndefined();
  expect(messages[1].global_position).toEqual(1);
  expect(messages[1].position).toEqual(1);

  messages = getStreamMessages("example-abc");
  expect(messages).toHaveLength(1);
  expect(messages[0].id).not.toBeUndefined();
  expect(messages[0].global_position).toEqual(2);
  expect(messages[0].position).toEqual(0);
});

test("the mocked message store should allow to project events", async () => {
  setupMessageStore([
    { stream_name: "example", type: "SAY_HELLO", data: {}, metadata: {} },
    { stream_name: "example", type: "SAY_HELLO", data: {}, metadata: {} },
    { stream_name: "example", type: "SAY_HELLO", data: {}, metadata: {} }
  ]);
  function reducer(prev, next) {
    return prev + 1;
  }

  const res = await runProjector({ streamName: "example" }, reducer, 0);
  expect(res).toEqual(3);
});

test("the mocked message store should allow subscription", async () => {
  setupMessageStore([
    { stream_name: "example", type: "SAY_HELLO", data: {}, metadata: {} }
  ]);

  const handler = jest.fn();
  const unsubscribe = subscribe({ streamName: "example" }, handler);

  await waitForExpect(() => expect(handler).toBeCalledTimes(1));
  unsubscribe();
});

test("the mocked message store should support categories", async () => {
  setupMessageStore([
    { stream_name: "example-abc", type: "SAY_HELLO", data: {}, metadata: {} },
    { stream_name: "example-def", type: "SAY_HELLO", data: {}, metadata: {} },
    { stream_name: "example-ref", type: "SAY_HELLO", data: {}, metadata: {} }
  ]);

  function reducer(prev, next: Message) {
    return [...prev, next.stream_name];
  }

  const result = await runProjector({ streamName: "example" }, reducer, []);
  expect(result).toHaveLength(3);
});
