import { useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import type { CreateTicketReplyInput } from 'core'
import { Sparkles } from 'lucide-react'
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
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<CreateTicketReplyInput>()

  const body = watch('body')

  const { mutateAsync, isError } = useMutation({
    mutationFn: async (data: CreateTicketReplyInput) => {
      await axios.post(`/api/tickets/${ticketId}/replies`, data, { withCredentials: true })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets', ticketId] })
    },
  })

  const {
    mutate: polish,
    isPending: isPolishing,
    isError: isPolishError,
  } = useMutation({
    mutationFn: async (draft: string) => {
      const response = await axios.post<{ polished: string }>(
        `/api/tickets/${ticketId}/replies/polish`,
        { body: draft },
        { withCredentials: true },
      )
      return response.data.polished
    },
    onSuccess: (polished) => {
      setValue('body', polished)
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
      {isPolishError && (
        <Alert variant="destructive">
          <AlertDescription>Failed to polish reply</AlertDescription>
        </Alert>
      )}

      <Textarea
        placeholder="Write a reply…"
        rows={4}
        disabled={isPolishing}
        {...register('body')}
      />

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={!body?.trim() || isPolishing || isSubmitting}
          onClick={() => polish(body)}
        >
          <Sparkles />
          {isPolishing ? 'Polishing…' : 'Polish'}
        </Button>
        <Button type="submit" disabled={!body?.trim() || isSubmitting || isPolishing}>
          {isSubmitting ? 'Sending…' : 'Send reply'}
        </Button>
      </div>
    </form>
  )
}
