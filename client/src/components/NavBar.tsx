import { Link, useNavigate } from 'react-router-dom'
import { signOut, useSession } from '../lib/auth-client'
import { Button } from '@/components/ui/button'

export function NavBar() {
  const { data: session } = useSession()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  const displayName = session?.user.name || session?.user.email

  return (
    <nav className="flex items-center justify-between border-b border-border bg-white px-6 py-3">
      <Link to="/" className="text-lg font-semibold text-foreground">
        Help Desk
      </Link>
      <div className="flex items-center gap-4">
        <Link to="/tickets" className="text-sm text-muted-foreground hover:text-foreground">
          Tickets
        </Link>
        {session?.user.role === 'ADMIN' && (
          <Link to="/users" className="text-sm text-muted-foreground hover:text-foreground">
            Users
          </Link>
        )}
        <span className="text-sm text-muted-foreground">{displayName}</span>
        <Button type="button" variant="outline" size="sm" onClick={handleSignOut}>
          Sign out
        </Button>
      </div>
    </nav>
  )
}
