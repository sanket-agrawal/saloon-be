import { UserRole } from '@prisma/client';

export interface UserTokenPayload {
  id: string;
  phone: string;
  role: UserRole;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: {
    id: string;
    phone: string;
    name: string | null;
    email: string | null;
    role: UserRole;
    avatarUrl: string | null;
  };
  tokens: AuthTokens;
}
