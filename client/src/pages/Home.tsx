import { NavBar } from '../components/NavBar'
import { useSession } from '../lib/auth-client'

export function Home() {
  const { data: session } = useSession()
  const displayName = session?.user.name || session?.user.email

  return (
    <div>
      <NavBar />
      <main className="p-6">
        <h1 className="text-xl font-semibold text-gray-900">Welcome back, {displayName}</h1>
      </main>
    </div>
  )
}
