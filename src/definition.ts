import { ServiceDefinition, CommandDefinition, EventDefinition } from "./types";
import { compile } from "json-schema-to-typescript";
import { camelCase, upperFirst, isEmpty } from "lodash";

const pascalCase = (str: string) => upperFirst(camelCase(str));
const pascalCaseJoin = (...str: string[]) =>
  upperFirst(camelCase(str.join("_")));

function map<T, F>(vals: T[], fn: (val: T, last: boolean) => F) {
  return vals.map((val, index, total) => {
    return fn(val, index < total.length - 1);
  });
}

async function generateTypescriptFromCommandsOrEvents(
  name: string,
  values: CommandDefinition[] | EventDefinition[],
  suffix: "command" | "event"
): Promise<string> {
  if (isEmpty(values)) {
    return "";
  }

  const types = values.map((c) => c.name);
  const space = "";
  const enumTypes = [
    `export enum ${pascalCaseJoin(name, suffix, "type")} {`,
    ...map(types, (t, last) => `  ${t} = "${t}"${last ? "," : ""}`),
    `}`,
  ].join("\n");

  const options = { bannerComment: "" };
  const payloads = await compile(
    {
      allOf: values.map(({ payload, name, description }) => ({
        ...payload,
        description,
        additionalProperties: false,
        id: `${pascalCaseJoin(name, "data")}`,
      })),
    },
    pascalCaseJoin(suffix, "payload"),
    options
  );

  const commands = values.map(({ name: n }) => {
    const nameFn = (...suffix: string[]) => pascalCaseJoin(n, ...suffix);
    return `export type ${nameFn(suffix)} = Message<${pascalCaseJoin(
      name,
      suffix,
      "type"
    )}.${n}, ${nameFn("data")}>;`;
  });

  const commandTypes = values
    .map(({ name }) => pascalCaseJoin(name, suffix))
    .join(" | ");
  const commandType = `export type ${pascalCaseJoin(
    suffix
  )} = ${commandTypes};`;
  return [enumTypes, space, payloads, ...commands, space, commandType].join(
    "\n"
  );
}

export async function getTypescriptDefinition(
  definition: ServiceDefinition
): Promise<string> {
  const importType = `import type { Message } from '@keix/message-store-client';`;
  const space = "";

  const commands = await generateTypescriptFromCommandsOrEvents(
    definition.name,
    definition.commands,
    "command"
  );
  const events = await generateTypescriptFromCommandsOrEvents(
    definition.name,
    definition.events,
    "event"
  );

  return [importType, space, commands, events].join("\n");
}
