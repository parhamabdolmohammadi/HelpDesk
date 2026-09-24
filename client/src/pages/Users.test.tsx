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

  it('fetches users and renders them in the table', async () => {
    mockGet.mockResolvedValue({ data: { users: sampleUsers } })

    renderUsers()

    expect(await screen.findByText('admin@example.com')).toBeInTheDocument()
    expect(mockGet).toHaveBeenCalledWith('/api/users', { withCredentials: true })
  })

  it('shows an error message when the request fails, instead of the table', async () => {
    mockGet.mockRejectedValue(new Error('network error'))

    renderUsers()

    expect(await screen.findByText('Failed to load users')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
