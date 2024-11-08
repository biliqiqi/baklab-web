import request from '@/lib/request'

// export const postEmailSinup = async (email: string) => {
//   const resp = await fetch('http://localhost:3001/api/signup', {
//     method: 'POST',
//     headers: {
//       Accept: 'application/json',
//       'Content-Type': 'application/json',
//     },
//     body: JSON.stringify({ email }),
//   })

//   if (!resp.ok) {
//     throw new Error(`HTTP error! status: ${resp.status}`)
//   }

//   const data = resp.json()

//   return data
// }

export const postEmailSinup = async (email: string) =>
  request.post(`signup`, { json: { email } }).json()
