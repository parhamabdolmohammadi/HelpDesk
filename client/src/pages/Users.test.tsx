import { screen } from '@testing-library/react'
import axios from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithQuery } from '../test/render-with-query'
import { Users } from './Users'

vi.mock('axios', () => ({
  default: { get: vi.fn() },
}))

vi.mock('../components/NavBar', () => ({
  NavBar: () => <nav data-testid="navbar" />,
}))

const mockGet = vi.mocked(axios.get)

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

function renderUsers() {
  return renderWithQuery(<Users />)
}

describe('Users page', () => {
  beforeEach(() => {
    mockGet.mockReset()
  })

  it('shows loading skeletons before the response resolves', () => {
    mockGet.mockReturnValue(new Promise(() => {}))

    renderUsers()

    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.queryByText('admin@example.com')).not.toBeInTheDocument()
  })

  it('renders the fetched users once loaded, falling back to — for a null name', async () => {
    mockGet.mockResolvedValue({ data: { users: sampleUsers } })

    renderUsers()

    expect(await screen.findByText('admin@example.com')).toBeInTheDocument()
    expect(screen.getByText('Admin User')).toBeInTheDocument()
    expect(screen.getByText('agent@example.com')).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(mockGet).toHaveBeenCalledWith('/api/users', { withCredentials: true })
  })

  it('styles the ADMIN badge differently from AGENT', async () => {
    mockGet.mockResolvedValue({ data: { users: sampleUsers } })

    renderUsers()

    const adminBadge = await screen.findByText('ADMIN')
    const agentBadge = screen.getByText('AGENT')

    expect(adminBadge.className).toContain('bg-primary')
    expect(agentBadge.className).toContain('bg-muted')
  })

  it('shows an error message when the request fails', async () => {
    mockGet.mockRejectedValue(new Error('network error'))

    renderUsers()

    expect(await screen.findByText('Failed to load users')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('shows an empty state when there are no users', async () => {
    mockGet.mockResolvedValue({ data: { users: [] } })

    renderUsers()

    expect(await screen.findByText('No users found.')).toBeInTheDocument()
  })
})
