// This permission data has been replaced by backend translation system
// Backend returns translated permission names via LocalWithLocalizer method
// Frontend now uses Permission.name field directly, no client-side translation needed
/* const PERMISSION_DATA = {
  article: {
    create: {
      name: 'createPost', // i18n key
      adapt_id: 'article.create',
      enabled: true,
    },
    edit_mine: {
      name: 'editMyPost',
      adapt_id: 'article.edit_mine',
      enabled: true,
    },
    edit_others: {
      name: 'editOthersPost',
      adapt_id: 'article.edit_others',
      enabled: false,
    },
    delete_mine: {
      name: 'deleteMyPost',
      adapt_id: 'article.delete_mine',
      enabled: true,
    },
    delete_others: {
      name: 'editOthersPost',
      adapt_id: 'article.delete_others',
      enabled: false,
    },
    save: {
      name: 'savePost',
      adapt_id: 'article.save',
      enabled: true,
    },
    vote_up: {
      name: 'upVotePost',
      adapt_id: 'article.vote_up',
      enabled: true,
    },
    vote_down: {
      name: 'downVotePost',
      adapt_id: 'article.vote_down',
      enabled: false,
    },
    react: {
      name: 'reactPost',
      adapt_id: 'article.react',
      enabled: true,
    },
    reply: {
      name: 'replyPost',
      adapt_id: 'article.reply',
      enabled: true,
    },
    view_score: {
      name: 'viewScore',
      adapt_id: 'article.view_score',
      enabled: false,
    },
    subscribe: {
      name: 'subscribePost',
      adapt_id: 'article.subscribe',
      enabled: false,
    },
    pin: {
      name: 'pinPost',
      adapt_id: 'article.pin',
      enabled: false,
    },
    lock: {
      name: 'lockPost',
      adapt_id: 'article.lock',
      enabled: false,
    },
    manage: {
      name: 'managePost',
      adapt_id: 'article.manage',
      enable: false,
    },
    review: {
      name: 'reviewPost',
      adapt_id: 'article.manage',
      enable: false,
    },
    manage_platform: {
      name: 'managePlatformPost',
      adapt_id: 'article.manage_platform',
      enable: false,
    },
  },
  user: {
    manage: {
      name: 'manageUser',
      adapt_id: 'user.manage',
      enabled: false,
    },
    list_access: {
      name: 'viewUserList',
      adapt_id: 'user.list_access',
      enabled: false,
    },
    ban: {
      name: 'banUser',
      adapt_id: 'user.ban',
      enabled: false,
    },
    update_intro_mine: {
      name: 'updateMyIntro',
      adapt_id: 'user.update_intro_mine',
      enabled: true,
    },
    update_intro_others: {
      name: 'updateOthersIntro',
      adapt_id: 'user.update_intro_others',
      enabled: false,
    },
    update_role: {
      name: 'updateRole',
      adapt_id: 'user.update_role',
      enabled: false,
    },
    set_moderator: {
      name: 'setModerator',
      adapt_id: 'user.set_moderator',
      enabled: false,
    },
    set_admin: {
      name: 'setAdmin',
      adapt_id: 'user.set_admin',
      enabled: false,
    },
    access_activity: {
      name: 'viewUserActivity',
      adapt_id: 'user.access_activity',
      enabled: false,
    },
    access_manage_activity: {
      name: 'viewManageActivity',
      adapt_id: 'user.access_manage_activity',
      enabled: false,
    },
    manage_platform: {
      name: 'managePlatformUser',
      adapt_id: 'user.manage_platform',
      enable: false,
    },
    block_from_site: {
      name: 'blockFromSite',
      adapt_id: 'user.block_from_site',
      enable: false,
    },
    unblock_from_site: {
      name: 'unblockFromSite',
      adapt_id: 'user.block_from_site',
      enable: false,
    },
  },
  manage: {
    access: {
      name: 'viewManagement',
      adapt_id: 'manage.access',
      enabled: false,
    },
  },
  platform_manage: {
    access: {
      name: 'viewPlatformManagement',
      adapt_id: 'platform_manage.access',
      enabled: false,
    },
  },
  permission: {
    access: {
      name: 'viewPermission',
      adapt_id: 'permission.access',
      enabled: false,
    },
  },
  role: {
    access: {
      name: 'viewRole',
      adapt_id: 'role.access',
      enabled: false,
    },
    add: {
      name: 'createRole',
      adapt_id: 'role.add',
      enabled: false,
    },
    edit: {
      name: 'editRole',
      adapt_id: 'role.edit',
      enabled: false,
    },
    manage: {
      name: 'manageSiteRole',
      adapt_id: 'role.manage',
      enabled: false,
    },
    manage_platform: {
      name: 'managePlatformRole',
      adapt_id: 'role.manage_platform',
      enabled: false,
    },
  },
  activity: {
    access: {
      name: 'viewActivity',
      adapt_id: 'activity.access',
      enabled: false,
    },
    manage_platform: {
      name: 'managePlatformActivity',
      adapt_id: 'activity.manage_platform',
      enabled: false,
    },
  },
  category: {
    create: {
      name: 'createCategory',
      adapt_id: 'category.create',
      enable: false,
    },
    edit: {
      name: 'editCategory',
      adapt_id: 'category.edit',
      enable: false,
    },
    delete: {
      name: 'deleteCategory',
      adapt_id: 'category.delete',
      enable: false,
    },
    manage_platform: {
      name: 'managePlatformCategory',
      adapt_id: 'category.manage_platform',
      enable: false,
    },
  },
  site: {
    create: {
      name: 'createSite',
      adapt_id: 'site.create',
      enable: false,
    },
    edit: {
      name: 'editSite',
      adapt_id: 'site.edit',
      enable: false,
    },
    delete: {
      name: 'deleteSite',
      adapt_id: 'site.delete',
      enable: false,
    },
    invite: {
      name: 'inviteToSite',
      adapt_id: 'site.invite',
      enable: false,
    },
    manage: {
      name: 'manageSite',
      adapt_id: 'site.manage',
      enable: false,
    },
    manage_platform: {
      name: 'managePlatformSite',
      adapt_id: 'site.manage_platform',
      enable: false,
    },
    review: {
      name: 'reviewSite',
      adapt_id: 'site.review',
      enable: false,
    },
  },
} */

export const PERMISSION_MODULE_DATA = {
  article: 'post',
  user: 'user',
  manage: 'management',
  platform_manage: 'platformManagement',
  permission: 'permission',
  role: 'role',
  activity: 'activityLog',
  category: 'category',
  site: 'site',
  oauth: 'oauthApplications',
}
