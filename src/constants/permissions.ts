import i18n from '@/i18n'

export const PERMISSION_DATA = {
  article: {
    create: {
      name: i18n.t('createPost'),
      adapt_id: 'article.create',
      enabled: true,
    },
    edit_mine: {
      name: i18n.t('editMyPost'),
      adapt_id: 'article.edit_mine',
      enabled: true,
    },
    edit_others: {
      name: i18n.t('editOthersPost'),
      adapt_id: 'article.edit_others',
      enabled: false,
    },
    delete_mine: {
      name: i18n.t('deleteMyPost'),
      adapt_id: 'article.delete_mine',
      enabled: true,
    },
    delete_others: {
      name: i18n.t('editOthersPost'),
      adapt_id: 'article.delete_others',
      enabled: false,
    },
    save: {
      name: i18n.t('savePost'),
      adapt_id: 'article.save',
      enabled: true,
    },
    vote_up: {
      name: i18n.t('upVotePost'),
      adapt_id: 'article.vote_up',
      enabled: true,
    },
    vote_down: {
      name: i18n.t('downVotePost'),
      adapt_id: 'article.vote_down',
      enabled: false,
    },
    react: {
      name: i18n.t('reactPost'),
      adapt_id: 'article.react',
      enabled: true,
    },
    reply: {
      name: i18n.t('replyPost'),
      adapt_id: 'article.reply',
      enabled: true,
    },
    view_score: {
      name: i18n.t('viewScore'),
      adapt_id: 'article.view_score',
      enabled: false,
    },
    subscribe: {
      name: i18n.t('subscribePost'),
      adapt_id: 'article.subscribe',
      enabled: false,
    },
    pin: {
      name: i18n.t('pinPost'),
      adapt_id: 'article.pin',
      enabled: false,
    },
    lock: {
      name: i18n.t('lockPost'),
      adapt_id: 'article.lock',
      enabled: false,
    },
    manage: {
      name: i18n.t('managePost'),
      adapt_id: 'article.manage',
      enable: false,
    },
    review: {
      name: i18n.t('reviewPost'),
      adapt_id: 'article.manage',
      enable: false,
    },
    manage_platform: {
      name: i18n.t('managePlatformPost'),
      adapt_id: 'article.manage_platform',
      enable: false,
    },
  },
  user: {
    manage: {
      name: i18n.t('manageUser'),
      adapt_id: 'user.manage',
      enabled: false,
    },
    list_access: {
      name: i18n.t('viewUserList'),
      adapt_id: 'user.list_access',
      enabled: false,
    },
    ban: {
      name: i18n.t('banUser'),
      adapt_id: 'user.ban',
      enabled: false,
    },
    update_intro_mine: {
      name: i18n.t('updateMyIntro'),
      adapt_id: 'user.update_intro_mine',
      enabled: true,
    },
    update_intro_others: {
      name: i18n.t('updateOthersIntro'),
      adapt_id: 'user.update_intro_others',
      enabled: false,
    },
    update_role: {
      name: i18n.t('updateRole'),
      adapt_id: 'user.update_role',
      enabled: false,
    },
    set_moderator: {
      name: i18n.t('setModerator'),
      adapt_id: 'user.set_moderator',
      enabled: false,
    },
    set_admin: {
      name: i18n.t('setAdmin'),
      adapt_id: 'user.set_admin',
      enabled: false,
    },
    access_activity: {
      name: i18n.t('viewUserActivity'),
      adapt_id: 'user.access_activity',
      enabled: false,
    },
    access_manage_activity: {
      name: i18n.t('viewManageActivity'),
      adapt_id: 'user.access_manage_activity',
      enabled: false,
    },
    manage_platform: {
      name: i18n.t('managePlatformUser'),
      adapt_id: 'user.manage_platform',
      enable: false,
    },
    block_from_site: {
      name: i18n.t('blockFromSite'),
      adapt_id: 'user.block_from_site',
      enable: false,
    },
    unblock_from_site: {
      name: i18n.t('unblockFromSite'),
      adapt_id: 'user.block_from_site',
      enable: false,
    },
  },
  manage: {
    access: {
      name: i18n.t('viewManagement'),
      adapt_id: 'manage.access',
      enabled: false,
    },
  },
  platform_manage: {
    access: {
      name: i18n.t('viewPlatformManagement'),
      adapt_id: 'platform_manage.access',
      enabled: false,
    },
  },
  permission: {
    access: {
      name: i18n.t('viewPermission'),
      adapt_id: 'permission.access',
      enabled: false,
    },
  },
  role: {
    access: {
      name: i18n.t('viewRole'),
      adapt_id: 'role.access',
      enabled: false,
    },
    add: {
      name: i18n.t('createRole'),
      adapt_id: 'role.add',
      enabled: false,
    },
    edit: {
      name: i18n.t('editRole'),
      adapt_id: 'role.edit',
      enabled: false,
    },
    manage: {
      name: i18n.t('manageSiteRole'),
      adapt_id: 'role.manage',
      enabled: false,
    },
    manage_platform: {
      name: i18n.t('managePlatformRole'),
      adapt_id: 'role.manage_platform',
      enabled: false,
    },
  },
  activity: {
    access: {
      name: i18n.t('viewActivity'),
      adapt_id: 'activity.access',
      enabled: false,
    },
    manage_platform: {
      name: i18n.t('managePlatformActivity'),
      adapt_id: 'activity.manage_platform',
      enabled: false,
    },
  },
  category: {
    create: {
      name: i18n.t('createCategory'),
      adapt_id: 'category.create',
      enable: false,
    },
    edit: {
      name: i18n.t('editCategory'),
      adapt_id: 'category.edit',
      enable: false,
    },
    delete: {
      name: i18n.t('deleteCategory'),
      adapt_id: 'category.delete',
      enable: false,
    },
    manage_platform: {
      name: i18n.t('managePlatformCategory'),
      adapt_id: 'category.manage_platform',
      enable: false,
    },
  },
  site: {
    create: {
      name: i18n.t('createSite'),
      adapt_id: 'site.create',
      enable: false,
    },
    edit: {
      name: i18n.t('editSite'),
      adapt_id: 'site.edit',
      enable: false,
    },
    delete: {
      name: i18n.t('deleteSite'),
      adapt_id: 'site.delete',
      enable: false,
    },
    invite: {
      name: i18n.t('inviteToSite'),
      adapt_id: 'site.invite',
      enable: false,
    },
    manage: {
      name: i18n.t('manageSite'),
      adapt_id: 'site.manage',
      enable: false,
    },
    manage_platform: {
      name: i18n.t('managePlatformSite'),
      adapt_id: 'site.manage_platform',
      enable: false,
    },
    review: {
      name: i18n.t('reviewSite'),
      adapt_id: 'site.review',
      enable: false,
    },
  },
}

export const PERMISSION_MODULE_DATA = {
  article: i18n.t('post'),
  user: i18n.t('user'),
  manage: i18n.t('management'),
  platform_manage: i18n.t('platformManagement'),
  permission: i18n.t('permission'),
  role: i18n.t('role'),
  activity: i18n.t('activityLog'),
  category: i18n.t('category'),
  site: i18n.t('site'),
}
