import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const selectClassName =
  'h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

type TicketsFiltersProps = {
  status: string
  category: string
  searchInput: string
  onStatusChange: (value: string) => void
  onCategoryChange: (value: string) => void
  onSearchInputChange: (value: string) => void
}

export function TicketsFilters({
  status,
  category,
  searchInput,
  onStatusChange,
  onCategoryChange,
  onSearchInputChange,
}: TicketsFiltersProps) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="flex flex-col gap-1">
        <Label htmlFor="ticket-search">Search</Label>
        <Input
          id="ticket-search"
          type="text"
          placeholder="Subject or requester email"
          className="w-64"
          value={searchInput}
          onChange={(e) => onSearchInputChange(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="ticket-status-filter">Status</Label>
        <select
          id="ticket-status-filter"
          className={selectClassName}
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="OPEN">Open</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="ticket-category-filter">Category</Label>
        <select
          id="ticket-category-filter"
          className={selectClassName}
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
        >
          <option value="">All categories</option>
          <option value="GENERAL_QUESTION">General Question</option>
          <option value="TECHNICAL_QUESTION">Technical Question</option>
          <option value="REFUND_REQUEST">Refund Request</option>
          <option value="UNCLASSIFIED">Unclassified</option>
        </select>
      </div>
    </div>
  )
}
