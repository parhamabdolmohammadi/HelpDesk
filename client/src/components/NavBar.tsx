import { useNavigate } from 'react-router-dom'
import { signOut, useSession } from '../lib/auth-client'

export function NavBar() {
  const { data: session } = useSession()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  const displayName = session?.user.name || session?.user.email

  return (
    <nav className="flex items-center justify-between bg-blue-950 px-6 py-3">
      <span className="text-lg font-semibold text-white">Help Desk</span>
      <div className="flex items-center gap-4">
        <span className="text-sm text-blue-100">{displayName}</span>
        <button
          type="button"
          onClick={handleSignOut}
          className="rounded-md border border-blue-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-900"
        >
          Sign out
        </button>
      </div>
    </nav>
  )
}
