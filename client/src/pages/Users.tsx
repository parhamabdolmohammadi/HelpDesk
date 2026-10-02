import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { CreateUserModal } from '../components/CreateUserModal'
import { NavBar } from '../components/NavBar'
import { UsersTable, type UserListItem } from '../components/UsersTable'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function Users() {
  const {
    data: users,
    isPending,
    isError,
  } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await axios.get<{ users: UserListItem[] }>('/api/users', {
        withCredentials: true,
      })
      return response.data.users
    },
  })

  return (
    <div>
      <NavBar />
      <main className="p-6">
        <div className="flex items-center justify-between">
          <h1 className="font-heading text-2xl text-foreground">Users</h1>
          <CreateUserModal />
        </div>

        <div className="mt-4">
          {isError && (
            <Alert variant="destructive">
              <AlertDescription>Failed to load users</AlertDescription>
            </Alert>
          )}

          {!isError && <UsersTable users={users} isPending={isPending} />}
        </div>
      </main>
    </div>
  )
}
