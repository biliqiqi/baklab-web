export const getUser = async (username: string) => {
  const resp = await fetch(`http://localhost:3001/api/users/${username}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  })

  if (!resp.ok) {
    throw new Error(`HTTP error! status: ${resp.status}`)
  }

  const data = resp.json()

  return data
}
