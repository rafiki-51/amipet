export const appRoles = ["customer", "operator", "admin"] as const;
export type AppRole = (typeof appRoles)[number];

export const adminRoles = ["operator", "admin"] as const;
export type AdminRole = (typeof adminRoles)[number];

const appRoleSet = new Set<string>(appRoles);
const adminRoleSet = new Set<string>(adminRoles);

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && appRoleSet.has(value);
}

export function isAdminRole(value: unknown): value is AdminRole {
  return typeof value === "string" && adminRoleSet.has(value);
}

export function isCustomerRole(value: unknown): value is "customer" {
  return value === "customer";
}
