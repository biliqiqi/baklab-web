import * as articleApi from './article'
import * as categoryApi from './category'
import * as mainApi from './main'
import * as roleApi from './role'
import * as userApi from './user'

export * from './main'

const api = {
  ...mainApi,
  ...userApi,
  ...articleApi,
  ...roleApi,
  ...categoryApi,
}

export default api
