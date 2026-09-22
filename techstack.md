## Tech Stack

### Frontend
- React with TypeScript — widely adopted, strong ecosystem for building dashboards and data-heavy UIs
- Tailwind CSS — fast styling without fighting a component library
- React Router — client-side routing

### Backend
- Node.js with Express and TypeScript — keeps the entire stack in one language, simple to set up REST APIs
- Database-backed sessions for authentication — session IDs are stored in secure HTTP-only cookies, while session data is stored server-side in PostgreSQL

### Database
- PostgreSQL — relational data (tickets, users, categories) fits naturally into tables with foreign keys. Good for filtering/sorting queries

### ORM
- Prisma — type-safe database access, easy migrations, works great with TypeScript

### AI
- Claude API (Anthropic) — for ticket classification, summaries, and suggested replies. Strong at following instructions and working with structured output

### Email
- SendGrid or Mailgun — for sending outbound replies. Inbound can be handled via webhooks

### Deployment
- Docker + a cloud provider (AWS, Railway, Fly.io, etc.)
