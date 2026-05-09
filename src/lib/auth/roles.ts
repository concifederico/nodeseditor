export const ROLES = {
  USER: 'USER',
  ADMIN: 'ADMIN',
} as const;

export type AppRole = (typeof ROLES)[keyof typeof ROLES];

export function isAdminRole(role: string | null | undefined): role is typeof ROLES.ADMIN {
  return role === ROLES.ADMIN;
}

export function normalizeRole(role: string | null | undefined): AppRole {
  return role === ROLES.ADMIN ? ROLES.ADMIN : ROLES.USER;
}
