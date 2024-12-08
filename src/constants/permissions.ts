export const PERMISSION_DATA = {
  article: {
    create: {
      name: 'Create Article',
      adapt_id: 'article.create',
      enabled: true,
    },
    edit_mine: {
      name: 'Edit Article of Myself',
      adapt_id: 'article.edit_mine',
      enabled: true,
    },
    edit_others: {
      name: 'Edit Article of Others',
      adapt_id: 'article.edit_others',
      enabled: false,
    },
    delete_mine: {
      name: 'Delete Article of Myself',
      adapt_id: 'article.delete_mine',
      enabled: true,
    },
    delete_others: {
      name: 'Delete Article of Others',
      adapt_id: 'article.delete_others',
      enabled: false,
    },
    save: {
      name: 'Save Article',
      adapt_id: 'article.save',
      enabled: true,
    },
    vote_up: {
      name: 'Vote Up Article',
      adapt_id: 'article.vote_up',
      enabled: true,
    },
    vote_down: {
      name: 'Vote Down Article',
      adapt_id: 'article.vote_down',
      enabled: false,
    },
    react: {
      name: 'React Article',
      adapt_id: 'article.react',
      enabled: true,
    },
    reply: {
      name: 'Reply Article',
      adapt_id: 'article.reply',
      enabled: true,
    },
    view_score: {
      name: 'View Score',
      adapt_id: 'article.view_score',
      enabled: false,
    },
    subscribe: {
      name: 'Subscribe',
      adapt_id: 'article.subscribe',
      enabled: false,
    },
    pin: {
      name: 'Pin',
      adapt_id: 'article.pin',
      enabled: false,
    },
    lock: {
      name: 'Lock',
      adapt_id: 'article.lock',
      enabled: false,
    },
  },
  user: {
    manage: {
      name: 'Manage User',
      adapt_id: 'user.manage',
      enabled: false,
    },
    list_access: {
      name: 'Acess User List',
      adapt_id: 'user.list_access',
      enabled: false,
    },
    ban: {
      name: 'Ban User',
      adapt_id: 'user.ban',
      enabled: false,
    },
    update_intro_mine: {
      name: 'Update User Intro of Myself',
      adapt_id: 'user.update_intro_mine',
      enabled: true,
    },
    update_intro_others: {
      name: 'Update User Intro of Others',
      adapt_id: 'user.update_intro_others',
      enabled: false,
    },
    update_role: {
      name: 'Update User Role of All',
      adapt_id: 'user.update_role',
      enabled: false,
    },
    set_moderator: {
      name: 'Set User as Moderator',
      adapt_id: 'user.set_moderator',
      enabled: false,
    },
    set_admin: {
      name: 'Set User as Admin',
      adapt_id: 'user.set_admin',
      enabled: false,
    },
    access_activity: {
      name: 'Access User Activity',
      adapt_id: 'user.access_activity',
      enabled: false,
    },
  },
  manage: {
    access: {
      name: 'Access Manage',
      adapt_id: 'manage.access',
      enabled: false,
    },
  },
  permission: {
    access: {
      name: 'Access Permission',
      adapt_id: 'permission.access',
      enabled: false,
    },
  },
  role: {
    access: {
      name: 'Access Role',
      adapt_id: 'role.access',
      enabled: false,
    },
    add: {
      name: 'Add Role',
      adapt_id: 'role.add',
      enabled: false,
    },
    edit: {
      name: 'Edit Role',
      adapt_id: 'role.edit',
      enabled: false,
    },
  },
  activity: {
    access: {
      name: 'Access Activities',
      adapt_id: 'activity.access',
      enabled: false,
    },
  },
}
