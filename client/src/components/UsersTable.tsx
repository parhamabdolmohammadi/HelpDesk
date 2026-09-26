import { EditUserModal } from '@/components/EditUserModal'
import { Skeleton } from '@/components/ui/skeleton'

export type UserRole = 'ADMIN' | 'AGENT'

export type UserListItem = {
  id: string
  name: string | null
  email: string
  role: UserRole
  createdAt: string
}

type UsersTableProps = {
  users: UserListItem[] | undefined
  isPending: boolean
}

export function UsersTable({ users, isPending }: UsersTableProps) {
  if (isPending) {
    return (
      <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Role</th>
              <th className="px-4 py-2 font-medium">Created</th>
              <th className="px-4 py-2 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-t border-border">
                <td className="px-4 py-2">
                  <Skeleton className="h-4 w-24" />
                </td>
                <td className="px-4 py-2">
                  <Skeleton className="h-4 w-40" />
                </td>
                <td className="px-4 py-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                </td>
                <td className="px-4 py-2">
                  <Skeleton className="h-4 w-20" />
                </td>
                <td className="px-4 py-2">
                  <Skeleton className="h-7 w-7" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (!users) {
    return null
  }

  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted/50 text-muted-foreground">
          <tr>
            <th className="px-4 py-2 font-medium">Name</th>
            <th className="px-4 py-2 font-medium">Email</th>
            <th className="px-4 py-2 font-medium">Role</th>
            <th className="px-4 py-2 font-medium">Created</th>
            <th className="px-4 py-2 font-medium">
              <span className="sr-only">Actions</span>
            </th>
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
              <td className="px-4 py-2">
                <EditUserModal user={user} />
              </td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr>
              <td className="px-4 py-3 text-muted-foreground" colSpan={5}>
                No users found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
