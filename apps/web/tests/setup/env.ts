process.env.NODE_ENV = process.env.NODE_ENV || "test"
process.env.NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000"
process.env.BETTER_AUTH_URL = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL
process.env.BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET || "test-secret"
process.env.DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:5432/mindpocket"
