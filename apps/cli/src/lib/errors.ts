export class CliError extends Error {
  code: string
  details?: unknown
  exitCode: number

  constructor(code: string, message: string, details?: unknown, exitCode?: number) {
    super(message)
    this.name = "CliError"
    this.code = code
    this.details = details
    this.exitCode = exitCode ?? getExitCodeForError(code)
  }
}

export function getExitCodeForError(code: string) {
  if (code === "AUTH_REQUIRED" || code === "AUTH_DENIED" || code === "AUTH_TIMEOUT") {
    return 2
  }

  if (code === "CONFIG_MISSING") {
    return 3
  }

  if (code === "VALIDATION_ERROR") {
    return 4
  }

  if (code === "SERVER_UNREACHABLE") {
    return 5
  }

  return 1
}

export function toCliError(error: unknown): CliError {
  if (error instanceof CliError) {
    return error
  }

  if (error instanceof Error) {
    return new CliError("INTERNAL_ERROR", error.message)
  }

  return new CliError("INTERNAL_ERROR", "Unknown error", error)
}
