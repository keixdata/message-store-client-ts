import {
  mockMessageStore,
  pushMessage,
  getStreamMessages,
  setupMessageStore
} from "../test_utils";
import {
  sendCommand,
  emitEvent,
  readLastMessage,
  runProjector,
  subscribe,
  Message
} from "..";
import waitForExpect from "wait-for-expect";

test("the mocked message store adds messages to the streams and calculate the positions", () => {
  setupMessageStore([{ stream_name: "example", type: "SAY_HELLO", data: {} }]);

  pushMessage({
    stream_name: "example",
    type: "SAY_HELLO",
    data: {}
  });
  pushMessage({
    stream_name: "example-abc",
    type: "SAY_HELLO",
    data: {}
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
    { stream_name: "example", type: "SAY_HELLO", data: {} },
    { stream_name: "example", type: "SAY_HELLO", data: {} },
    { stream_name: "example", type: "SAY_HELLO", data: {} }
  ]);
  function reducer(prev, next) {
    return prev + 1;
  }

  const res = await runProjector({ streamName: "example" }, reducer, 0);
  expect(res).toEqual(3);
});

test("the mocked message store should allow subscription", async () => {
  setupMessageStore([{ stream_name: "example", type: "SAY_HELLO", data: {} }]);

  const handler = jest.fn();
  const unsubscribe = subscribe({ streamName: "example" }, handler);

  await waitForExpect(() => expect(handler).toBeCalledTimes(1));
  unsubscribe();
});

test("the mocked message store should support categories", async () => {
  setupMessageStore([
    { stream_name: "example-abc", type: "SAY_HELLO", data: {} },
    { stream_name: "example-def", type: "SAY_HELLO", data: {} },
    { stream_name: "example-ref", type: "SAY_HELLO", data: {} }
  ]);

  function reducer(prev, next: Message) {
    return [...prev, next.stream_name];
  }

  const result = await runProjector({ streamName: "example" }, reducer, []);
  expect(result).toHaveLength(3);
});

test("the mocked message store should wait for async service", async () => {
  setupMessageStore([
    {
      stream_name: "example:command",
      type: "SAY_HELLO_ONCE",
      data: {},
      metadata: {}
    },
    {
      stream_name: "example:command",
      type: "SAY_HELLO_TWICE",
      data: {},
      metadata: {}
    }
  ]);

  const handler = msg => {
    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        const prevMessage = await readLastMessage({ streamName: "example" });
        const index = (prevMessage?.data.index ?? 0) + 1;
        return emitEvent({
          category: "example",
          event: msg.type + "_EVENT",
          data: { index }
        }).then(resolve);
      }, 1000);
    });
  };
  const unsubscribe = subscribe({ streamName: "example:command" }, handler);

  await waitForExpect(() => {
    const messages = getStreamMessages("example");
    expect(messages).toHaveLength(2);
    expect(messages[0].type).toEqual("SAY_HELLO_ONCE_EVENT");
    expect(messages[0].data.index).toEqual(1);
    expect(messages[1].type).toEqual("SAY_HELLO_TWICE_EVENT");
    expect(messages[1].data.index).toEqual(2);
  });
  unsubscribe();
});
