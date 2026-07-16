import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "tu@email.com" },
        password: { label: "Contraseña", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Faltan credenciales");
        }
        const email = credentials.email.trim().toLowerCase();

        const user = await prisma.usuario.findUnique({
          where: { correo: email },
          include: { persona: true }
        });

        if (!user) {
          throw new Error("Usuario no encontrado");
        }

        const isValidPassword = await bcrypt.compare(credentials.password, user.contrasena);

        if (!isValidPassword) {
          throw new Error("Contraseña incorrecta");
        }

        const fullName = `${user.persona.nombres} ${user.persona.apellidos}`.trim();

        // Convert BigInt id to string for NextAuth compatibility
        return {
          id: user.id.toString(),
          email: user.correo,
          name: fullName,
          role: user.rol,
          dni: user.persona.dni,
          persona_id: user.persona_id.toString(),
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      // initial sign in
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.dni = user.dni;
        token.persona_id = user.persona_id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.dni = token.dni as string;
        session.user.persona_id = token.persona_id as string;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
