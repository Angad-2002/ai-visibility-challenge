# AI Visibility Tracker

Track your brand's visibility in AI search results. This tool queries AI models (OpenAI, Anthropic, Groq) to see which brands get mentioned when users ask about specific categories, helping you understand your competitive position in AI-generated recommendations.

## Features

- ✅ **Multi-AI Provider Support**: Choose between OpenAI, Anthropic (Claude), or Groq
- ✅ **Brand Mention Tracking**: Track how often your brand (or competitors) are mentioned in AI responses
- ✅ **Citation URL Extraction**: Automatically extracts and displays citation URLs from AI responses
- ✅ **Competitor Impersonation Mode**: Analyze competitor visibility by simulating queries as if you were a competitor
- ✅ **Dashboard Metrics**: View AI visibility scores, citation share, and brand leaderboards
- ✅ **Prompt History**: All queries are stored in PostgreSQL for historical analysis
- ✅ **Real-time Analysis**: Get instant results with detailed context and sentiment

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, TypeScript
- **Database**: PostgreSQL (with Supabase support)
- **AI Providers**: OpenAI (GPT-4o-mini), Anthropic (Claude 3.5 Sonnet), Groq (Llama 3.3 70B)
- **Deployment**: Netlify-ready (configured in `netlify.toml`)

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (local or cloud like Supabase)
- At least one AI provider API key:
  - OpenAI API key from [platform.openai.com](https://platform.openai.com)
  - Anthropic API key from [console.anthropic.com](https://console.anthropic.com)
  - Groq API key from [console.groq.com](https://console.groq.com)

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
cd writesonic-assignment
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ai_visibility_tracker
DB_USER=postgres
DB_PASSWORD=your_password_here

# AI Provider API Keys (at least one required)
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
GROQ_API_KEY=gsk_your-groq-key

# Environment
NODE_ENV=development
```

**Alternative: Using Supabase (Recommended for Cloud)**

The application automatically detects and uses Supabase when configured. Set these environment variables:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
# OR use anon key for client-side operations
SUPABASE_ANON_KEY=your-anon-key

# Database connection (optional, for direct SQL access)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
```

**Getting Supabase Credentials:**
1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Settings** → **API** to get:
   - Project URL (`SUPABASE_URL`)
   - Service Role Key (`SUPABASE_SERVICE_ROLE_KEY`) - for server-side operations
   - Anon Key (`SUPABASE_ANON_KEY`) - for client-side operations
3. Go to **Settings** → **Database** to get the connection string (`DATABASE_URL`)

**Note:** The application automatically uses Supabase when `SUPABASE_URL` is set. You don't need to configure individual DB_* variables when using Supabase.

**Getting Supabase Credentials:**
1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Settings** → **API** to get:
   - Project URL (`SUPABASE_URL`)
   - Service Role Key (`SUPABASE_SERVICE_ROLE_KEY`) - for server-side operations
   - Anon Key (`SUPABASE_ANON_KEY`) - optional, for client-side operations
3. Go to **Settings** → **Database** to get the connection string (`DATABASE_URL`)

### 3. Set Up Database

**Option A: Local PostgreSQL**

```bash
# Create database
createdb ai_visibility_tracker

# Initialize schema
node scripts/init-db.js
# OR using psql directly
psql -d ai_visibility_tracker -f lib/db/schema.sql
```

**Option B: Supabase (Cloud)**

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** in the Supabase dashboard
3. Run the schema from `lib/db/schema.sql`:

```sql
-- Copy and paste the contents of lib/db/schema.sql into the SQL Editor
-- Then click "Run" to execute
```

Alternatively, you can use the connection string with the init script:

```bash
# Set DATABASE_URL in .env first, then:
node scripts/init-db.js
```

The application will automatically detect Supabase and use the Supabase client for all database operations.

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

### Deploy to Vercel (Recommended)

The easiest way to deploy is using Vercel:

1. **Prerequisites**:
   - Set up Supabase database (see DEPLOYMENT.md for details)
   - Get AI provider API key(s)

2. **Quick Deploy**:
   ```bash
   # Install Vercel CLI
   npm install -g vercel
   
   # Deploy
   cd writesonic-assignment
   vercel
   ```

3. **Add Environment Variables** in Vercel dashboard:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY` (or ANTHROPIC_API_KEY or GROQ_API_KEY)
   - `NODE_ENV=production`

4. **Full deployment guide**: See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

### Alternative: Deploy via GitHub

1. Push code to GitHub
2. Import repository in Vercel
3. Configure environment variables
4. Deploy automatically

### Deploy to Netlify

The app is also configured for Netlify deployment:
- Configure environment variables in Netlify dashboard
- Use Supabase for database
- Deploy via `git push` or drag-and-drop

### Quick Deployment Steps

1. **Set up Supabase** (5 minutes):
   - Create project at [supabase.com](https://supabase.com)
   - Run schema from `lib/db/schema.sql` in SQL Editor
   - Copy credentials (URL, Service Role Key)

2. **Deploy to Vercel** (2 minutes):
   - Push code to GitHub
   - Import repository in Vercel
   - Add environment variables:
     - `SUPABASE_URL`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `OPENAI_API_KEY` (or ANTHROPIC_API_KEY or GROQ_API_KEY)
     - `NODE_ENV=production`
   - Deploy!

3. **Verify**:
   - Visit `https://your-app.vercel.app/api/health`
   - Should return `{"success": true, "status": "healthy"}`

For detailed deployment instructions, see the deployment section above.

## Usage

### Basic Usage

1. Enter a **category** (e.g., "CRM software", "project management tools")
2. Enter **brands** to track (comma-separated, e.g., "Salesforce, HubSpot, Pipedrive")
3. Select an **AI Provider** (OpenAI, Anthropic, or Groq)
4. Click **"Check Visibility"**

### Competitor Impersonation Mode

1. Toggle **"Competitor Impersonation Mode"**
2. Enter your **main brand** (the brand you want to track)
3. Enter **competitor brands** (comma-separated)
4. The system will query as if you were one of the competitors

### Understanding Results

- **AI Visibility Score**: Percentage of tracked brands that were mentioned by AI (e.g., if you track 5 brands and 3 are mentioned, score is 60%)
- **Citation Share**: Individual brand's percentage of total mentions among tracked brands (shows competitive position)
- **Brand Leaderboard**: Brands ranked by mention count and citation share
- **Prompt Analysis**: Detailed breakdown showing which brands were mentioned and in what context
- **Prompt History**: Historical list of all queries with brand mention status
- **Top Cited Pages**: URLs extracted from AI responses

## API Endpoints

### `POST /api/check-visibility`

Check AI visibility for a category and brands.

**Request Body:**
```json
{
  "category": "CRM software",
  "brands": ["Salesforce", "HubSpot", "Pipedrive"],
  "provider": "openai",
  "isCompetitorMode": false,
  "mainBrand": "YourBrand" // Optional, required if isCompetitorMode is true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "category": "CRM software",
    "brands": ["Salesforce", "HubSpot", "Pipedrive"],
    "mentions": [
      {
        "brand": "Salesforce",
        "count": 3,
        "context": ["Salesforce is widely regarded..."],
        "citationUrls": ["https://salesforce.com"]
      }
    ],
    "totalMentions": 5,
    "timestamp": "2026-01-05T12:00:00.000Z"
  }
}
```

### `GET /api/metrics`

Get aggregated dashboard metrics.

**Response:**
```json
{
  "success": true,
  "data": {
    "promptsTracked": 42,
    "brandsTracked": 15
  }
}
```

### `GET /api/health`

Health check endpoint.

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "database": "connected",
  "timestamp": "2026-01-05T12:00:00.000Z"
}
```

## Project Structure

```
writesonic-assignment/
├── app/
│   ├── api/
│   │   ├── check-visibility/  # Main visibility check endpoint
│   │   ├── metrics/            # Dashboard metrics endpoint
│   │   └── health/              # Health check endpoint
│   ├── page.tsx                 # Main UI component
│   └── layout.tsx               # Root layout
├── lib/
│   ├── ai/
│   │   ├── providers.ts         # AI provider implementations
│   │   └── prompt-templates.ts   # Prompt generation templates
│   ├── db/
│   │   ├── connection.ts        # Database connection pool
│   │   ├── models.ts             # Database models/DAOs
│   │   └── schema.sql            # Database schema
│   ├── services/
│   │   └── visibility-service.ts # Business logic layer
│   ├── logger.ts                 # Centralized logging
│   └── utils.ts                  # Utility functions
├── components/
│   └── ui/                       # shadcn/ui components
├── scripts/
│   └── init-db.js                # Database initialization script
└── .cursor/
    └── rules/                     # Cursor IDE rules for code consistency
```

## Architecture Decisions

### Service Layer Pattern

Business logic is separated from route handlers using a service layer (`lib/services/visibility-service.ts`). This follows the cursor rules and makes the code more testable and maintainable.

### Database Models/DAOs

Database access is abstracted through model classes (`lib/db/models.ts`) using parameterized queries to prevent SQL injection. This follows the cursor rules for database security.

### AI Provider Abstraction

Multiple AI providers are supported through a unified interface (`lib/ai/providers.ts`). This allows easy switching between providers and adding new ones in the future.

### Prompt Templates

AI prompts are generated using templates (`lib/ai/prompt-templates.ts`) to ensure consistency and make it easy to adjust prompt structure.

### Logging

Centralized logging (`lib/logger.ts`) follows cursor rules:
- Debug logs only in development
- Production logs are concise and sanitized
- Error stack traces only in development

## Key Improvements Made

1. **Real AI Integration**: Replaced mock responses with actual API calls to OpenAI, Anthropic, and Groq
2. **Database Persistence**: Added PostgreSQL storage for prompt history, brands, and mentions
3. **Multi-Provider Support**: Users can choose between different AI providers
4. **Competitor Mode**: Added competitor impersonation mode for competitive analysis
5. **Citation Extraction**: Real citation URLs are extracted from AI responses
6. **Metrics Dashboard**: Aggregated metrics from database instead of hardcoded values
7. **Error Handling**: Production-ready error handling with sanitized messages
8. **Environment Configuration**: Proper environment variable management

## Future Enhancements

- [ ] Web UI crawling for ChatGPT (bonus feature)
- [ ] Rate limiting middleware
- [ ] Caching layer (Redis) for repeated queries
- [ ] Export functionality (CSV/JSON)
- [ ] Historical trend analysis
- [ ] Multi-model querying (query all providers and merge results)
- [ ] Real-time updates via WebSockets
- [ ] User authentication and multi-tenant support

## Troubleshooting

### Database Connection Issues

- Verify your database credentials in `.env`
- Ensure PostgreSQL is running: `pg_isready`
- Check firewall settings if using a remote database

### AI API Errors

- Verify API keys are correct in `.env`
- Check API rate limits and quotas
- Ensure you have sufficient credits/usage

### Build Errors

- Clear `.next` folder: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`

## License

This project was created for the WriteSonic engineering challenge.

## Contact

For questions or issues, please refer to the challenge submission guidelines.
