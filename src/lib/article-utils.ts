import { Article, ArticleAction, VoteType } from '@/types/types'

export const updateArticleState = (
  article: Article,
  action: ArticleAction
): Article => {
  if (!article.currUserState) {
    return article
  }

  switch (action) {
    case 'up': {
      const isCurrentlyUp = article.currUserState.voteType === 'up'
      const isCurrentlyDown = article.currUserState.voteType === 'down'

      return {
        ...article,
        voteUp: isCurrentlyUp
          ? article.voteUp - 1
          : isCurrentlyDown
            ? article.voteUp + 1
            : article.voteUp + 1,
        voteDown: isCurrentlyDown ? article.voteDown - 1 : article.voteDown,
        currUserState: {
          ...article.currUserState,
          voteType: (isCurrentlyUp ? '' : 'up') as VoteType,
        },
      }
    }

    case 'down': {
      const isCurrentlyUp = article.currUserState.voteType === 'up'
      const isCurrentlyDown = article.currUserState.voteType === 'down'

      return {
        ...article,
        voteUp: isCurrentlyUp ? article.voteUp - 1 : article.voteUp,
        voteDown: isCurrentlyDown
          ? article.voteDown - 1
          : isCurrentlyUp
            ? article.voteDown + 1
            : article.voteDown + 1,
        currUserState: {
          ...article.currUserState,
          voteType: (isCurrentlyDown ? '' : 'down') as VoteType,
        },
      }
    }

    case 'save':
      return {
        ...article,
        totalSavedCount: article.currUserState.saved
          ? article.totalSavedCount - 1
          : article.totalSavedCount + 1,
        currUserState: {
          ...article.currUserState,
          saved: !article.currUserState.saved,
        },
      }

    case 'subscribe':
      return {
        ...article,
        currUserState: {
          ...article.currUserState,
          subscribed: !article.currUserState.subscribed,
        },
      }

    default:
      return article
  }
}
