import { HELP_BY_COMMAND } from "../help/command-help.js"
import type { CliSchema, CommandHelpMeta, CommandSchema, CommandSchemaOption } from "./types.js"
import { CLI_NAME, CLI_PROTOCOL_VERSION, CLI_VERSION } from "./version.js"

const LEADING_FLAG_PATTERN = /^--?/
const OPTION_VALUE_PATTERN = /\s+<.*$/

function parseOptionType(flags: string) {
  return flags.includes("<") ? "string" : "boolean"
}

function parseOptionName(flags: string) {
  const primary = flags.split(",")[0]?.trim() || flags.trim()
  return primary.replace(LEADING_FLAG_PATTERN, "").replace(OPTION_VALUE_PATTERN, "")
}

function parseRequiredFromDescription(description: string) {
  return description.toLowerCase().startsWith("required.")
}

function toSchemaOption(option: { flags: string; description: string }): CommandSchemaOption {
  return {
    name: parseOptionName(option.flags),
    type: parseOptionType(option.flags),
    required: parseRequiredFromDescription(option.description),
    description: option.description,
    flags: option.flags,
  }
}

function toSchemaArgument(argument: { name: string; description: string }) {
  return {
    name: argument.name,
    description: argument.description,
    required: argument.name.startsWith("<"),
  }
}

export function commandHelpToSchema(meta: CommandHelpMeta): CommandSchema {
  return {
    name: meta.command,
    summary: meta.summary,
    authRequired: meta.authRequired,
    arguments: meta.arguments.map(toSchemaArgument),
    options: meta.options.map(toSchemaOption),
    output: meta.output,
    errors: meta.errors,
  }
}

export function buildCliSchema(): CliSchema {
  return {
    cli: {
      name: CLI_NAME,
      version: CLI_VERSION,
      protocolVersion: CLI_PROTOCOL_VERSION,
    },
    commands: Object.values(HELP_BY_COMMAND).map(commandHelpToSchema),
  }
}

export function getCommandSchema(command: string) {
  const meta = HELP_BY_COMMAND[command]
  if (!meta) {
    return null
  }

  return commandHelpToSchema(meta)
}
