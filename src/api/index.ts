import * as articleApi from './article'
import * as categoryApi from './category'
import * as mainApi from './main'
import * as oauthApi from './oauth'
import * as roleApi from './role'
import * as userApi from './user'

export * from './main'
export * from './oauth'

const api = {
  ...mainApi,
  ...userApi,
  ...articleApi,
  ...roleApi,
  ...categoryApi,
  ...oauthApi,
}

export default api
