export type Role = 'student' | 'teacher';

export interface AuthUser {
  id: string;
  email: string;
  display_name: string | null;
  role: Role;
  created_at: string;
}
