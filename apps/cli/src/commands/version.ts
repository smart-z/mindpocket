import { ok } from "../lib/result.js"
import { CLI_NAME, CLI_PROTOCOL_VERSION, CLI_VERSION } from "../lib/version.js"

export function versionCommand() {
  return ok({
    name: CLI_NAME,
    version: CLI_VERSION,
    protocolVersion: CLI_PROTOCOL_VERSION,
  })
}
