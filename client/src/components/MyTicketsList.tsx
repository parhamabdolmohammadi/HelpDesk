import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { TextLink } from "./TextLink";
import { formatCategory, statusStyles, type TicketCategory, type TicketStatus } from "./TicketsTable";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type MyTicket = {
  id: string;
  subject: string;
  status: TicketStatus;
  category: TicketCategory;
  createdAt: string;
};

export function MyTicketsList() {
  const { data, isPending, isError } = useQuery({
    queryKey: ["tickets", "mine"],
    queryFn: async () => {
      const response = await axios.get<{ tickets: MyTicket[] }>("/api/tickets/mine", {
        withCredentials: true,
      });
      return response.data.tickets;
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Your Tickets</CardTitle>
      </CardHeader>
      <CardContent>
        {isError && (
          <Alert variant="destructive">
            <AlertDescription>Failed to load your tickets</AlertDescription>
          </Alert>
        )}

        {isPending && !isError && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        )}

        {!isPending && !isError && data && data.length === 0 && (
          <p className="text-sm text-muted-foreground">
            You haven't submitted any tickets yet.
          </p>
        )}

        {!isPending && !isError && data && data.length > 0 && (
          <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Subject</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Category</th>
                  <th className="px-4 py-2 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {data.map((ticket) => (
                  <tr key={ticket.id} className="border-t border-border">
                    <td className="px-4 py-2">
                      <TextLink to={`/tickets/${ticket.id}`}>{ticket.subject}</TextLink>
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[ticket.status]}`}
                      >
                        {ticket.status}
                      </span>
                    </td>
                    <td className="px-4 py-2">{formatCategory(ticket.category)}</td>
                    <td className="px-4 py-2">
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
