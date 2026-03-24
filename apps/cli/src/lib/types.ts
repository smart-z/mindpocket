export interface StoredUser {
  id: string
  email: string
  name: string
}

export interface StoredSession {
  accessToken: string
  user: StoredUser
  obtainedAt: string
  expiresAt?: string
}

export interface CliConfig {
  serverUrl?: string
  session?: StoredSession
}

export interface CliSuccess<T> {
  ok: true
  data: T
}

export interface CliFailure {
  ok: false
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export type CliResult<T> = CliSuccess<T> | CliFailure

export interface CommandOptionHelp {
  flags: string
  description: string
}

export interface CommandArgumentHelp {
  name: string
  description: string
}

export interface CommandHelpMeta {
  command: string
  summary: string
  usage: string[]
  arguments: CommandArgumentHelp[]
  options: CommandOptionHelp[]
  authRequired: boolean
  output: string[]
  examples: string[]
  errors: string[]
}

export interface CommandSchemaArgument {
  name: string
  description: string
  required: boolean
}

export interface CommandSchemaOption {
  name: string
  type: string
  required: boolean
  description: string
  flags: string
}

export interface CommandSchema {
  name: string
  summary: string
  authRequired: boolean
  arguments: CommandSchemaArgument[]
  options: CommandSchemaOption[]
  output: string[]
  errors: string[]
}

export interface CliSchema {
  cli: {
    name: string
    version: string
    protocolVersion: number
  }
  commands: CommandSchema[]
}

export interface DoctorResult {
  cliVersion: string
  nodeVersion: string
  platform: string
  server: {
    value: string
    source: "flag" | "env" | "config" | "default"
    reachable: boolean
  }
  auth: {
    hasStoredSession: boolean
    authenticated: boolean
    user: StoredUser | null
    expiresAt: string | null
  }
  nextActions: string[]
}

export interface VersionResult {
  name: string
  version: string
  protocolVersion: number
}

export interface PingResult {
  serverUrl: string
  reachable: boolean
  latencyMs: number
}
