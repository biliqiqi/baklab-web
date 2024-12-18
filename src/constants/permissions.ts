export const PERMISSION_DATA = {
  article: {
    create: {
      name: '创建文章',
      adapt_id: 'article.create',
      enabled: true,
    },
    edit_mine: {
      name: '编辑自己的文章',
      adapt_id: 'article.edit_mine',
      enabled: true,
    },
    edit_others: {
      name: '编辑他人的文章',
      adapt_id: 'article.edit_others',
      enabled: false,
    },
    delete_mine: {
      name: '删除自己的文章',
      adapt_id: 'article.delete_mine',
      enabled: true,
    },
    delete_others: {
      name: '删除他人的文章',
      adapt_id: 'article.delete_others',
      enabled: false,
    },
    save: {
      name: '保存文章',
      adapt_id: 'article.save',
      enabled: true,
    },
    vote_up: {
      name: '文章点赞',
      adapt_id: 'article.vote_up',
      enabled: true,
    },
    vote_down: {
      name: '文章点踩',
      adapt_id: 'article.vote_down',
      enabled: false,
    },
    react: {
      name: '文章反应',
      adapt_id: 'article.react',
      enabled: true,
    },
    reply: {
      name: '回复文章',
      adapt_id: 'article.reply',
      enabled: true,
    },
    view_score: {
      name: '查看分数',
      adapt_id: 'article.view_score',
      enabled: false,
    },
    subscribe: {
      name: '订阅',
      adapt_id: 'article.subscribe',
      enabled: false,
    },
    pin: {
      name: '置顶',
      adapt_id: 'article.pin',
      enabled: false,
    },
    lock: {
      name: '锁定',
      adapt_id: 'article.lock',
      enabled: false,
    },
  },
  user: {
    manage: {
      name: '管理用户',
      adapt_id: 'user.manage',
      enabled: false,
    },
    list_access: {
      name: '访问用户列表',
      adapt_id: 'user.list_access',
      enabled: false,
    },
    ban: {
      name: '封禁用户',
      adapt_id: 'user.ban',
      enabled: false,
    },
    update_intro_mine: {
      name: '更新自己的个人简介',
      adapt_id: 'user.update_intro_mine',
      enabled: true,
    },
    update_intro_others: {
      name: '更新他人的个人简介',
      adapt_id: 'user.update_intro_others',
      enabled: false,
    },
    update_role: {
      name: '更新所有人的用户角色',
      adapt_id: 'user.update_role',
      enabled: false,
    },
    set_moderator: {
      name: '设置为版主',
      adapt_id: 'user.set_moderator',
      enabled: false,
    },
    set_admin: {
      name: '设置为管理员',
      adapt_id: 'user.set_admin',
      enabled: false,
    },
    access_activity: {
      name: '访问用户活动',
      adapt_id: 'user.access_activity',
      enabled: false,
    },
    access_manage_activity: {
      name: '访问管理活动',
      adapt_id: 'user.access_manage_activity',
      enabled: false,
    },
  },
  manage: {
    access: {
      name: '访问管理',
      adapt_id: 'manage.access',
      enabled: false,
    },
  },
  permission: {
    access: {
      name: '访问权限',
      adapt_id: 'permission.access',
      enabled: false,
    },
  },
  role: {
    access: {
      name: '访问角色',
      adapt_id: 'role.access',
      enabled: false,
    },
    add: {
      name: '添加角色',
      adapt_id: 'role.add',
      enabled: false,
    },
    edit: {
      name: '编辑角色',
      adapt_id: 'role.edit',
      enabled: false,
    },
  },
  activity: {
    access: {
      name: '访问活动',
      adapt_id: 'activity.access',
      enabled: false,
    },
  },
}
