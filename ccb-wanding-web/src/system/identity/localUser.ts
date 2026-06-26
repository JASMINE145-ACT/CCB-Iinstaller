const USER_ID_KEY = 'ccb_user_id'

export function getLocalUserId(): string {
  let id = localStorage.getItem(USER_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(USER_ID_KEY, id)
  }
  return id
}

export const USER_ID = getLocalUserId()
