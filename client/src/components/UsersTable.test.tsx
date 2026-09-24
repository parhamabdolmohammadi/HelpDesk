import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { UsersTable } from './UsersTable'

const sampleUsers = [
  {
    id: '1',
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'ADMIN' as const,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: '2',
    name: null,
    email: 'agent@example.com',
    role: 'AGENT' as const,
    createdAt: '2026-01-02T00:00:00.000Z',
  },
]

describe('UsersTable', () => {
  it('renders loading skeleton rows while pending', () => {
    render(<UsersTable users={undefined} isPending />)

    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.queryByText('admin@example.com')).not.toBeInTheDocument()
  })

  it('renders nothing when not pending and no users are available yet', () => {
    render(<UsersTable users={undefined} isPending={false} />)

    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('renders the users, falling back to — for a null name', () => {
    render(<UsersTable users={sampleUsers} isPending={false} />)

    expect(screen.getByText('admin@example.com')).toBeInTheDocument()
    expect(screen.getByText('Admin User')).toBeInTheDocument()
    expect(screen.getByText('agent@example.com')).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('styles the ADMIN badge differently from AGENT', () => {
    render(<UsersTable users={sampleUsers} isPending={false} />)

    const adminBadge = screen.getByText('ADMIN')
    const agentBadge = screen.getByText('AGENT')

    expect(adminBadge.className).toContain('bg-primary')
    expect(agentBadge.className).toContain('bg-muted')
  })

  it('shows an empty state when there are no users', () => {
    render(<UsersTable users={[]} isPending={false} />)

    expect(screen.getByText('No users found.')).toBeInTheDocument()
  })
})
