import { test } from "bun:test";

/** Declared package command count; a variant of a command is an argument to it, not a command. Changing it is an edit here in the same commit. */
const EXPECTED_COMMANDS = 11;

test("package.json declares its command count", async () => {
  const scripts = (await Bun.file(new URL("../package.json", import.meta.url)).json()).scripts;
  const declaredCommands = Object.keys(scripts).length;
  if (declaredCommands !== EXPECTED_COMMANDS)
    throw new Error(`package.json has ${declaredCommands} commands, declared ${EXPECTED_COMMANDS}: give an existing command an argument, or set EXPECTED_COMMANDS to ${declaredCommands}`);
});
