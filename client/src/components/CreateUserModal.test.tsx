import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axios from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithQuery } from '../test/render-with-query'
import { CreateUserModal } from './CreateUserModal'

vi.mock('axios', () => ({
  default: { post: vi.fn(), isAxiosError: vi.fn() },
}))

const mockPost = vi.mocked(axios.post)

async function openModal() {
  const user = userEvent.setup()
  renderWithQuery(<CreateUserModal />)
  await user.click(screen.getByRole('button', { name: 'New user' }))
  return user
}

describe('CreateUserModal', () => {
  beforeEach(() => {
    mockPost.mockReset()
  })

  it('opens the modal with name, email and password fields', async () => {
    await openModal()

    expect(screen.getByLabelText('Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
  })

  it('shows validation errors for a name under 3 chars and a password under 8 chars', async () => {
    const user = await openModal()

    await user.type(screen.getByLabelText('Name'), 'ab')
    await user.type(screen.getByLabelText('Email'), 'not-an-email')
    await user.type(screen.getByLabelText('Password'), 'short')
    await user.click(screen.getByRole('button', { name: 'Create user' }))

    expect(
      await screen.findByText('Name must be at least 3 characters'),
    ).toBeInTheDocument()
    expect(screen.getByText('Enter a valid email')).toBeInTheDocument()
    expect(
      screen.getByText('Password must be at least 8 characters'),
    ).toBeInTheDocument()
    expect(mockPost).not.toHaveBeenCalled()
  })

  it('creates the user and hides the modal on valid submit', async () => {
    mockPost.mockResolvedValue({
      data: { user: { id: '1', name: 'New User', email: 'new@example.com', role: 'AGENT' } },
    })

    const user = await openModal()

    await user.type(screen.getByLabelText('Name'), 'New User')
    await user.type(screen.getByLabelText('Email'), 'new@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Create user' }))

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        '/api/users',
        { name: 'New User', email: 'new@example.com', password: 'password123' },
        { withCredentials: true },
      )
    })

    await waitFor(() => {
      expect(screen.queryByLabelText('Name')).not.toBeInTheDocument()
    })
  })

  it('shows an error message when the request fails', async () => {
    vi.mocked(axios.isAxiosError).mockReturnValue(true)
    mockPost.mockRejectedValue({
      response: { data: { message: 'A user with this email already exists' } },
    })

    const user = await openModal()

    await user.type(screen.getByLabelText('Name'), 'New User')
    await user.type(screen.getByLabelText('Email'), 'new@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Create user' }))

    expect(
      await screen.findByText('A user with this email already exists'),
    ).toBeInTheDocument()
  })

  it('shows required-field errors when submitting an empty form', async () => {
    const user = await openModal()

    await user.click(screen.getByRole('button', { name: 'Create user' }))

    expect(
      await screen.findByText('Name must be at least 3 characters'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
    expect(
      screen.getByText('Password must be at least 8 characters'),
    ).toBeInTheDocument()
    expect(mockPost).not.toHaveBeenCalled()
  })

  it('disables the submit button and shows a pending label while the request is in flight', async () => {
    let resolvePost: (value: unknown) => void = () => {}
    mockPost.mockReturnValue(
      new Promise((resolve) => {
        resolvePost = resolve
      }),
    )

    const user = await openModal()

    await user.type(screen.getByLabelText('Name'), 'New User')
    await user.type(screen.getByLabelText('Email'), 'new@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Create user' }))

    expect(await screen.findByRole('button', { name: 'Creating…' })).toBeDisabled()

    resolvePost({
      data: { user: { id: '1', name: 'New User', email: 'new@example.com', role: 'AGENT' } },
    })

    await waitFor(() => {
      expect(screen.queryByLabelText('Name')).not.toBeInTheDocument()
    })
  })

  it('resets the form and any error when closed and reopened', async () => {
    const user = await openModal()

    await user.type(screen.getByLabelText('Name'), 'ab')
    await user.click(screen.getByRole('button', { name: 'Create user' }))
    expect(
      await screen.findByText('Name must be at least 3 characters'),
    ).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'New user' }))

    expect(screen.getByLabelText('Name')).toHaveValue('')
    expect(
      screen.queryByText('Name must be at least 3 characters'),
    ).not.toBeInTheDocument()
  })
})
