export type ProfessionalRole = "NUTRITIONIST" | "PERSONAL" | "PHYSIO"
export type UserRole = ProfessionalRole | "ADMIN"

export interface AuthUser {
  sub: string
  role: UserRole
  email?: string
  name?: string
}
