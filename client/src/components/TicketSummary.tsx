import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { Sparkles } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type TicketSummaryProps = {
  ticketId: string;
};

export function TicketSummary({ ticketId }: TicketSummaryProps) {
  const {
    mutate: summarize,
    data: summary,
    isPending,
    isError,
  } = useMutation({
    mutationFn: async () => {
      const response = await axios.post<{ summary: string }>(
        `/api/tickets/${ticketId}/summarize`,
        {},
        { withCredentials: true },
      );
      return response.data.summary;
    },
  });

  return (
    <div className="mt-4 space-y-2">
      {isError && (
        <Alert variant="destructive">
          <AlertDescription>Failed to summarize ticket</AlertDescription>
        </Alert>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() => summarize()}
      >
        <Sparkles />
        {isPending ? "Summarizing…" : summary ? "Re-summarize" : "Summarize"}
      </Button>

      {summary && !isPending && (
        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <p className="whitespace-pre-wrap text-sm text-foreground">
            {summary}
          </p>
        </div>
      )}
    </div>
  );
}
