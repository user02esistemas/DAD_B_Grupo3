import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    role?: string;
    dni?: string;
    persona_id?: string;
  }

  interface Session {
    user: {
      id: string;
      role?: string;
      dni?: string;
      persona_id?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role?: string;
    dni?: string;
    persona_id?: string;
  }
}
