import { useCallback, useEffect, useState } from 'react'
import { redirect, useParams } from 'react-router-dom'

import { Card } from './components/ui/card'
import { Tabs, TabsList, TabsTrigger } from './components/ui/tabs'

import BAvatar from './components/base/BAvatar'
import BContainer from './components/base/BContainer'
import BLoader from './components/base/BLoader'

import { getUser } from './api/user'
import { toSync } from './lib/fire-and-forget'
import { useNotFoundStore } from './state/global'
import { UserData } from './types/types'

type UserTab =
  | 'activity'
  | 'replies'
  | 'posts'
  | 'saved'
  | 'subscribe'
  | 'voted'
  | 'operate_activity'

type UserTabMap = {
  [key in UserTab]: string
}

const TabMapData: UserTabMap = {
  activity: '全部',
  replies: '回复',
  posts: '帖子',
  saved: '已保存',
  subscribe: '已订阅',
  voted: '已投票',
  operate_activity: '操作记录',
}

export default function UserPage() {
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<UserData | null>(null)
  const [tabs, setTabs] = useState<UserTab[]>(['activity', 'replies', 'posts'])
  const [tab, setTab] = useState<UserTab>('activity')
  const { updateNotFound } = useNotFoundStore()

  const { username } = useParams()

  const fetchUserData = toSync(
    useCallback(async () => {
      try {
        if (!username) {
          /* redirect('/404') */
          updateNotFound(true)
          return
        }

        setLoading(true)
        const resp = await getUser(username, {}, { showNotFound: true })

        if (!resp.code) {
          setUser(resp.data)
        }
      } catch (err) {
        console.error('fetch user data error:', err)
      } finally {
        setLoading(false)
      }
    }, [username])
  )

  const onTabChange = (tab: string) => {
    setTab(tab as UserTab)
  }

  useEffect(() => {
    fetchUserData()
  }, [])

  return (
    <>
      <BContainer>
        {loading ? (
          <BLoader />
        ) : (
          user && (
            <>
              <Card className="p-3 mb-4">
                <div>
                  <BAvatar username={user.name} size={80} className="mr-4" />
                  <span className="text-lg font-bold">{user.name}</span>
                </div>
              </Card>
              <Tabs
                defaultValue="oldest"
                value={tab}
                onValueChange={onTabChange}
              >
                <TabsList>
                  {tabs.map((item) => (
                    <TabsTrigger value={item} key={item}>
                      {TabMapData[item]}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </>
          )
        )}
      </BContainer>
    </>
  )
}
