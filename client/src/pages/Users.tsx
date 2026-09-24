import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { NavBar } from '../components/NavBar'
import { Alert, AlertDescription } from '@/components/ui/alert'

type UserRole = 'ADMIN' | 'AGENT'

type UserListItem = {
  id: string
  name: string | null
  email: string
  role: UserRole
  createdAt: string
}

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
        <h1 className="text-xl font-semibold text-gray-900">Users</h1>

        <div className="mt-4">
          {isError && (
            <Alert variant="destructive">
              <AlertDescription>Failed to load users</AlertDescription>
            </Alert>
          )}

          {!isError && isPending && (
            <p className="text-sm text-muted-foreground">Loading…</p>
          )}

          {!isError && users && (
            <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">Name</th>
                    <th className="px-4 py-2 font-medium">Email</th>
                    <th className="px-4 py-2 font-medium">Role</th>
                    <th className="px-4 py-2 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-t border-border">
                      <td className="px-4 py-2">{user.name || '—'}</td>
                      <td className="px-4 py-2">{user.email}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            user.role === 'ADMIN'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td className="px-4 py-3 text-muted-foreground" colSpan={4}>
                        No users found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
