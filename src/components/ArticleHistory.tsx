import { Link } from 'react-router-dom'

import { timeAgo } from '@/lib/dayjs-custom'

import { ArticleLog, JSONMap } from '@/types/types'

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './ui/collapsible'

interface ArticleHistoryProps {
  data: ArticleLog
  isReply: boolean
}

const fieldNameMap: JSONMap<string> = {
  contentForm: '内容形式',
}

const ArticleHistory: React.FC<ArticleHistoryProps> = ({ data, isReply }) => {
  return (
    <div>
      <Collapsible>
        <CollapsibleTrigger asChild>
          <div className="flex justify-between items-center mt-4 p-2 bg-gray-50 dark:bg-slate-900 cursor-pointer">
            <span className="font-bold">版本：{data.version}</span>
            <span className="text-sm">
              由{' '}
              <Link
                to={`/users/${data.operator.name}`}
                className="text-primary"
              >
                {data.operator.name}
              </Link>{' '}
              编辑于 {timeAgo(data.createdAt)}
            </span>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {!isReply && (
            <div className="flex mt-2 text-sm" key="title">
              <div className="w-[80px] font-bold mr-1 pt-2">标题：</div>
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
              <div className="w-[80px] font-bold mr-1 pt-2">板块：</div>
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
              <div className="w-[80px] font-bold mr-1 pt-2">链接：</div>
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
                  {fieldNameMap[key] || '-'}：
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
            <div className="w-[80px] font-bold mr-1 pt-2">内容：</div>
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
