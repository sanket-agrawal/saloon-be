import { UserRole } from '@prisma/client';

export interface AuthUserPayload {
  id: string;
  phone: string;
  role: UserRole;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUserPayload;
  }
}
