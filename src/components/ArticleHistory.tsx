import { Trans, useTranslation } from 'react-i18next'

import { timeAgo } from '@/lib/dayjs-custom'
import { Link } from '@/lib/router'

import i18n from '@/i18n'
import { ArticleLog } from '@/types/types'

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './ui/collapsible'

interface ArticleHistoryProps {
  data: ArticleLog
  isReply: boolean
}

const fieldNameMap = (key: string) => {
  switch (key) {
    case 'contentForm':
      return i18n.t('contentForm')
    default:
      return ''
  }
}

const ArticleHistory: React.FC<ArticleHistoryProps> = ({ data, isReply }) => {
  const { t } = useTranslation()

  return (
    <div>
      <Collapsible>
        <CollapsibleTrigger asChild>
          <div className="flex justify-between items-center mt-4 p-2 bg-gray-50 dark:bg-slate-900 cursor-pointer">
            <span className="font-bold">
              {t('version')}：{data.version}
            </span>
            <span className="text-sm">
              <Trans
                i18nKey={'editBy'}
                values={{
                  name: data.operator.name,
                  time: timeAgo(data.createdAt),
                }}
                components={{
                  userLink: (
                    <Link
                      to={`/users/${data.operator.name}`}
                      className="text-primary"
                    />
                  ),
                }}
              />
            </span>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="b-history-content">
          {!isReply && (
            <div className="flex mt-2 text-sm" key="title">
              <div className="w-[80px] font-bold mr-1 pt-2">{t('title')}：</div>
              <div
                className="flex-shrink-0 flex-grow bg-gray-100 p-2"
                style={{
                  maxWidth: `calc(100% - 50px)`,
                }}
                dangerouslySetInnerHTML={{
                  __html: data.titleDiffHTML,
                }}
              ></div>
            </div>
          )}
          {!isReply && (
            <div className="flex mt-2 text-sm" key="category">
              <div className="w-[80px] font-bold mr-1 pt-2">
                {t('category')}：
              </div>
              <div
                className="flex-shrink-0 flex-grow bg-gray-100 p-2"
                style={{
                  maxWidth: `calc(100% - 50px)`,
                }}
                dangerouslySetInnerHTML={{
                  __html: data.categoryFrontIdDiffHTML,
                }}
              ></div>
            </div>
          )}
          {!isReply && (
            <div className="flex mt-2 text-sm" key="link">
              <div className="w-[80px] font-bold mr-1 pt-2">{t('link')}：</div>
              <div
                className="flex-shrink-0 flex-grow bg-gray-100 p-2"
                style={{
                  maxWidth: `calc(100% - 50px)`,
                }}
                dangerouslySetInnerHTML={{
                  __html: data.urlDiffHTML,
                }}
              ></div>
            </div>
          )}
          {!isReply &&
            Object.entries(data.extraDiffHTML || {}).map(([key, val]) => (
              <div className="flex mt-2 text-sm" key={key}>
                <div className="w-[80px] font-bold mr-1 pt-2">
                  {fieldNameMap(key) || '-'}：
                </div>
                <div
                  className="flex-shrink-0 flex-grow bg-gray-100 p-2"
                  style={{
                    maxWidth: `calc(100% - 50px)`,
                  }}
                  dangerouslySetInnerHTML={{
                    __html: val,
                  }}
                ></div>
              </div>
            ))}
          <div className="flex mt-2 text-sm">
            <div className="w-[80px] font-bold mr-1 pt-2">{t('content')}：</div>
            <div
              className="flex-shrink-0 flex-grow bg-gray-100 p-2 whitespace-break-spaces"
              style={{
                maxWidth: `calc(100% - 50px)`,
              }}
              dangerouslySetInnerHTML={{
                __html: data.contentDiffHTML,
              }}
            ></div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

export default ArticleHistory
