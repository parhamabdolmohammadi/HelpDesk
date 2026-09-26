import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axios from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithQuery } from '../test/render-with-query'
import { EditUserModal } from './EditUserModal'

vi.mock('axios', () => ({
  default: { patch: vi.fn(), isAxiosError: vi.fn() },
}))

const mockPatch = vi.mocked(axios.patch)

const sampleUser = {
  id: '1',
  name: 'Admin User',
  email: 'admin@example.com',
  role: 'ADMIN' as const,
  createdAt: '2026-01-01T00:00:00.000Z',
}

async function openModal() {
  const user = userEvent.setup()
  renderWithQuery(<EditUserModal user={sampleUser} />)
  await user.click(screen.getByRole('button', { name: 'Edit Admin User' }))
  return user
}

describe('EditUserModal', () => {
  beforeEach(() => {
    mockPatch.mockReset()
  })

  it('opens prefilled with the user\'s name and email, and a blank password', async () => {
    await openModal()

    expect(screen.getByLabelText('Name')).toHaveValue('Admin User')
    expect(screen.getByLabelText('Email')).toHaveValue('admin@example.com')
    expect(screen.getByLabelText('Password')).toHaveValue('')
    expect(
      screen.getByText('Leave blank to keep the current password'),
    ).toBeInTheDocument()
  })

  it('shows validation errors for a short name and invalid email', async () => {
    const user = await openModal()

    await user.clear(screen.getByLabelText('Name'))
    await user.type(screen.getByLabelText('Name'), 'ab')
    await user.clear(screen.getByLabelText('Email'))
    await user.type(screen.getByLabelText('Email'), 'not-an-email')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(
      await screen.findByText('Name must be at least 3 characters'),
    ).toBeInTheDocument()
    expect(screen.getByText('Enter a valid email')).toBeInTheDocument()
    expect(mockPatch).not.toHaveBeenCalled()
  })

  it('rejects a password shorter than 8 characters, but allows leaving it blank', async () => {
    const user = await openModal()

    await user.type(screen.getByLabelText('Password'), 'short')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(
      await screen.findByText('Password must be at least 8 characters'),
    ).toBeInTheDocument()
    expect(mockPatch).not.toHaveBeenCalled()
  })

  it('saves name/email changes without a password when the field is left blank', async () => {
    mockPatch.mockResolvedValue({ data: { user: sampleUser } })
    const user = await openModal()

    await user.clear(screen.getByLabelText('Name'))
    await user.type(screen.getByLabelText('Name'), 'Updated Name')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalledWith(
        '/api/users/1',
        { name: 'Updated Name', email: 'admin@example.com', password: '' },
        { withCredentials: true },
      )
    })

    await waitFor(() => {
      expect(screen.queryByLabelText('Name')).not.toBeInTheDocument()
    })
  })

  it('includes the new password when one is provided', async () => {
    mockPatch.mockResolvedValue({ data: { user: sampleUser } })
    const user = await openModal()

    await user.type(screen.getByLabelText('Password'), 'newpassword123')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalledWith(
        '/api/users/1',
        { name: 'Admin User', email: 'admin@example.com', password: 'newpassword123' },
        { withCredentials: true },
      )
    })
  })

  it('shows an error message when the request fails', async () => {
    vi.mocked(axios.isAxiosError).mockReturnValue(true)
    mockPatch.mockRejectedValue({
      response: { data: { message: 'A user with this email already exists' } },
    })

    const user = await openModal()
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(
      await screen.findByText('A user with this email already exists'),
    ).toBeInTheDocument()
  })

  it('resets to the user\'s current data when closed and reopened', async () => {
    const user = await openModal()

    await user.clear(screen.getByLabelText('Name'))
    await user.type(screen.getByLabelText('Name'), 'ab')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(
      await screen.findByText('Name must be at least 3 characters'),
    ).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Edit Admin User' }))

    expect(screen.getByLabelText('Name')).toHaveValue('Admin User')
    expect(
      screen.queryByText('Name must be at least 3 characters'),
    ).not.toBeInTheDocument()
  })
})
