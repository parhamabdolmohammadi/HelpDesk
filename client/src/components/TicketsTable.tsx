import {
  createColumnHelper,
  tableFeatures,
  rowSortingFeature,
  rowPaginationFeature,
  useTable,
  type PaginationState,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export type TicketStatus = "OPEN" | "RESOLVED" | "CLOSED";
export type TicketCategory =
  | "GENERAL_QUESTION"
  | "TECHNICAL_QUESTION"
  | "REFUND_REQUEST"
  | null;

export type TicketListItem = {
  id: string;
  subject: string;
  requesterEmail: string;
  status: TicketStatus;
  category: TicketCategory;
  createdAt: string;
};

type TicketsTableProps = {
  tickets: TicketListItem[] | undefined;
  isPending: boolean;
  sorting: SortingState;
  onSortingChange: React.Dispatch<React.SetStateAction<SortingState>>;
  pagination: PaginationState;
  onPaginationChange: React.Dispatch<React.SetStateAction<PaginationState>>;
  rowCount: number;
};

const statusStyles: Record<TicketStatus, string> = {
  OPEN: "bg-primary text-primary-foreground",
  RESOLVED: "bg-muted text-muted-foreground",
  CLOSED: "bg-muted text-muted-foreground",
};

function formatCategory(category: TicketCategory): string {
  if (!category) {
    return "—";
  }

  return category

    .toLowerCase()
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

// Sorting and pagination are both server-side (see Tickets.tsx / GET
// /api/tickets): this table only registers rowSortingFeature/
// rowPaginationFeature for their column/table APIs (getIsSorted,
// getToggleSortingHandler, previousPage, nextPage, ...) and hoists both
// `sorting` and `pagination` into external state via manualSorting/
// manualPagination — it never sorts or slices `tickets` itself, it just
// displays whatever page the server already returned.
const features = tableFeatures({ rowSortingFeature, rowPaginationFeature });

const columnHelper = createColumnHelper<typeof features, TicketListItem>();

const columns = columnHelper.columns([
  columnHelper.accessor("subject", { header: "Subject" }),
  columnHelper.accessor("requesterEmail", { header: "Requester" }),
  columnHelper.accessor("status", {
    header: "Status",
    cell: (info) => (
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[info.getValue()]}`}
      >
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor("category", {
    header: "Category",
    cell: (info) => formatCategory(info.getValue()),
  }),
  columnHelper.accessor("createdAt", {
    header: "Created",
    cell: (info) => new Date(info.getValue()).toLocaleDateString(),
  }),
]);

export function TicketsTable({
  tickets,
  isPending,
  sorting,
  onSortingChange,
  pagination,
  onPaginationChange,
  rowCount,
}: TicketsTableProps) {
  const table = useTable({
    features,
    columns,
    data: tickets ?? [],
    manualSorting: true,
    manualPagination: true,
    rowCount,
    state: { sorting, pagination },
    onSortingChange,
    onPaginationChange,
  });

  if (isPending) {
    return (
      <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Subject</th>
              <th className="px-4 py-2 font-medium">Requester</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Category</th>
              <th className="px-4 py-2 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-t border-border">
                <td className="px-4 py-2">
                  <Skeleton className="h-4 w-40" />
                </td>
                <td className="px-4 py-2">
                  <Skeleton className="h-4 w-40" />
                </td>
                <td className="px-4 py-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                </td>
                <td className="px-4 py-2">
                  <Skeleton className="h-4 w-28" />
                </td>
                <td className="px-4 py-2">
                  <Skeleton className="h-4 w-20" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted/50 text-muted-foreground">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id} className="px-4 py-2 font-medium">
                  {header.isPlaceholder ? null : (
                    <button
                      type="button"
                      className={`flex items-center gap-1 transition-colors hover:text-foreground disabled:cursor-default disabled:hover:text-inherit ${
                        header.column.getIsSorted() ? "font-bold" : ""
                      }`}
                      disabled={!header.column.getCanSort()}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <table.FlexRender header={header} />
                      {header.column.getCanSort() &&
                        ({
                          asc: <ArrowUp className="h-3.5 w-3.5" />,
                          desc: <ArrowDown className="h-3.5 w-3.5" />,
                        }[header.column.getIsSorted() as string] ?? (
                          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />
                        ))}
                    </button>
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="border-t border-border">
              {row.getAllCells().map((cell) => (
                <td key={cell.id} className="px-4 py-2">
                  <table.FlexRender cell={cell} />
                </td>
              ))}
            </tr>
          ))}
          {tickets && tickets.length === 0 && (
            <tr>
              <td
                className="px-4 py-3 text-muted-foreground"
                colSpan={columns.length}
              >
                No tickets found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Page {pagination.pageIndex + 1} of{" "}
          {Math.max(table.getPageCount(), 1)} ({rowCount} tickets)
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </>
  );
}
