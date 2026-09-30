import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { createTicketReplySchema, type CreateTicketReplyInput } from 'core'
import { useForm } from 'react-hook-form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

type TicketReplyFormProps = {
  ticketId: string
}

export function TicketReplyForm({ ticketId }: TicketReplyFormProps) {
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateTicketReplyInput>({ resolver: zodResolver(createTicketReplySchema) })

  const { mutateAsync, isError } = useMutation({
    mutationFn: async (data: CreateTicketReplyInput) => {
      await axios.post(`/api/tickets/${ticketId}/replies`, data, { withCredentials: true })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets', ticketId] })
    },
  })

  const onSubmit = async (data: CreateTicketReplyInput) => {
    await mutateAsync(data)
    reset()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-4 space-y-2">
      {isError && (
        <Alert variant="destructive">
          <AlertDescription>Failed to send reply</AlertDescription>
        </Alert>
      )}

      <Textarea
        placeholder="Write a reply…"
        rows={4}
        aria-invalid={!!errors.body}
        {...register('body')}
      />
      {errors.body && <p className="text-sm text-destructive">{errors.body.message}</p>}

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Sending…' : 'Send reply'}
        </Button>
      </div>
    </form>
  )
}
