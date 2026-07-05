/** Shared application types. Extend as features are added. */

export interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface AppUser {
  id: string;
  email: string | null;
  name?: string;
  avatarUrl?: string;
}
