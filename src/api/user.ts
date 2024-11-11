import { authRequest } from '@/lib/request'
import { ResponseData } from '@/types/types'

// export const getUser = async (username: string) => {
//   const resp = await fetch(`http://localhost:3001/api/users/${username}`, {
//     method: 'GET',
//     headers: {
//       Accept: 'application/json',
//     },
//   })

//   if (!resp.ok) {
//     throw new Error(`HTTP error! status: ${resp.status}`)
//   }

//   const data = resp.json()

//   return data
// }

// Auth type enum with specific values
enum AuthType {
  SELF = 'self',
  GOOGLE = 'google',
  GITHUB = 'github',
  MICROSOFT = 'microsoft',
}

// Permission interface matching the Go struct
interface Permission {
  id: number
  frontId: string
  name: string
  createdAt: string // ISO date string
  module: string
}

interface UserData {
  id: number
  name: string
  email: string
  registeredAt: string // ISO date string
  registeredAtStr: string
  introduction: string
  deleted: boolean
  banned: boolean
  roleName: string
  roleFrontId: string
  permissions: Permission[]
  super: boolean
  authFrom: AuthType
  reputation: number
  bannedStartAt: string // ISO date string
  bannedEndAt: string // ISO date string
  bannedDayNum: number
  bannedCount: number
}

export const getUser = (username: string): Promise<ResponseData<UserData>> =>
  authRequest.get(`users/${username}`).json()
