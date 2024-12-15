import { Activity, ActivityActionType, ListPageState } from '@/types/types'

import { Empty } from './Empty'
import { ListPagination } from './ListPagination'
import { Card } from './ui/card'

export interface ActivityListProps {
  list: Activity[]
  pageState: ListPageState
}

type AcTypeMap = {
  [key in ActivityActionType]: string
}
const acTypeMap: AcTypeMap = {
  user: '用户',
  manage: '管理',
  anonymous: '匿名',
  dev: '开发',
}

export const ActivityList: React.FC<ActivityListProps> = ({
  list,
  pageState,
}) =>
  list.length == 0 ? (
    <Empty />
  ) : (
    <>
      {list.map((item) => (
        <Card key={item.id} className="p-3 my-2 hover:bg-slate-50">
          <div
            className="mb-2 text-base activity-title"
            dangerouslySetInnerHTML={{ __html: item.formattedText }}
          ></div>
          <div className="text-sm bg-gray-100 p-2">
            <div className="flex">
              <div className="flex-shrink-0 w-[80px]">
                <b>类型：</b>
              </div>
              <div>{acTypeMap[item.type]}</div>
            </div>
            <div className="flex">
              <div className="flex-shrink-0 w-[80px]">
                <b>IP地址：</b>
              </div>
              <div>{item.ipAddr}</div>
            </div>
            <div className="flex">
              <div className="flex-shrink-0 w-[80px]">
                <b>设备信息：</b>
              </div>
              <div>{item.deviceInfo}</div>
            </div>
            <div className="flex">
              <div className="flex-shrink-0 w-[80px]">
                <b>提交数据：</b>
              </div>
              <pre className="flex-grow align-top py-1 whitespace-break-spaces">
                {JSON.stringify(item.details)}
              </pre>
            </div>
          </div>
        </Card>
      ))}
      <ListPagination pageState={pageState} />
    </>
  )
