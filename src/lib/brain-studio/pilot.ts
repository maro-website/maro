/** Private rollout: never infer access from a submitted email or workspace. */
export const BRAIN_STUDIO_OWNER = "fec01baa-8451-4112-84fb-8552f8b31686";
export function canUseBrainStudio(user?: { id?: string; email?: string | null } | null): boolean {
  return user?.id === BRAIN_STUDIO_OWNER && user.email?.toLowerCase() === "erzen@nice.al";
}
export function isBrainStudioOwner(userId: string): boolean { return userId === BRAIN_STUDIO_OWNER; }
