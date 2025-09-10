// next-auth.d.ts
import { DefaultSession } from "next-auth"
import "next-auth"
import "next-auth/jwt"

declare module "next-auth" {
  interface User {
    role: "ADMIN" | "STAFF"
  }

  interface Session {
    user: {
      id?: string
      role?: "ADMIN" | "STAFF"
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "ADMIN" | "STAFF"
  }
}

export {}
