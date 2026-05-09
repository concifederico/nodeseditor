import { AppRole } from '@/lib/auth/roles';
import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: AppRole;
      email?: string | null;
      name?: string | null;
      image?: string | null;
    };
  }

  interface User {
    role: AppRole;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    sub?: string;
    role?: AppRole;
  }
}
