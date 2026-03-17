/** Roles that can create, edit, delete menus and publish */
const EDITOR_ROLES = ["admin", "owner", "manager"];

/** Check if a user role can edit menus (CRUD, publish, categories, items) */
export function canEditMenu(role: string | undefined): boolean {
  return EDITOR_ROLES.includes(role || "");
}
