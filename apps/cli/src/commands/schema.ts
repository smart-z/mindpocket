import { CliError } from "../lib/errors.js"
import { ok } from "../lib/result.js"
import { buildCliSchema, getCommandSchema } from "../lib/schema.js"

export function schemaCommand(commandParts: string[]) {
  if (commandParts.length === 0) {
    return ok(buildCliSchema())
  }

  const command = commandParts.join(" ")
  const schema = getCommandSchema(command)
  if (!schema) {
    throw new CliError("VALIDATION_ERROR", `Unknown command schema target: ${command}`)
  }

  return ok({
    cli: buildCliSchema().cli,
    command: schema,
  })
}
