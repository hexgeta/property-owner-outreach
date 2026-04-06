Audit and optimize Supabase egress across the project. Run this when Supabase usage is high.

## 1. Identify all Supabase query sources

Search the entire codebase for:

- All `supabase.from(` calls in API routes and cron jobs
- All `fetch('/api/` calls in client-side hooks and components
- All polling patterns: `setInterval`, `refreshInterval`, `refetchInterval`, `refetchOnWindowFocus`
- All SWR/React Query configs with aggressive refresh intervals

For each source, note: file path, table queried, polling frequency, and estimated data volume per request.

## 2. Check cron jobs

- Read `vercel.json` for cron schedules
- Check if any cron job does unnecessary full-table reads/resyncs on every run
- Look for patterns like `resyncAllOrders` that re-read and re-write entire tables when nothing changed
- Recommend throttling expensive operations (e.g., full resync once per hour, not every minute)

## 3. Check for global providers fetching data

- Look in `components/Providers.tsx` and layout files for context providers that fetch Supabase data
- These run on EVERY page — any polling here multiplies across the entire site
- Recommend moving data-fetching providers to only wrap the pages that need them

## 4. Check for ISR opportunities

- Find pages that fetch Supabase data client-side with polling (`useEffect` + `setInterval` + `fetch`)
- These should be refactored to server components with `export const revalidate = N`
- Server-side ISR means Vercel caches the page and only hits Supabase once per revalidation interval, regardless of visitor count
- Reference pattern: see `firenotificationsbot` project's `app/stats/page.tsx` for ISR example

## 5. Check client-side polling intervals

Flag any of these as too aggressive:
- `refreshInterval` or `refetchInterval` < 60 seconds for Supabase-backed data
- `refetchOnWindowFocus: true` on queries that hit Supabase
- `staleTime` < 60 seconds for non-critical data (leaderboards, achievements, stats)
- `setInterval` < 30 seconds for any Supabase-backed API route

## 6. Check API routes returning large datasets

- Look for routes that `select *` or return all rows without pagination
- Look for routes missing `Cache-Control` headers
- Check for routes that do `count: 'exact'` (triggers full table scans)

## 7. Report findings

Present a ranked table of egress sources:
| Source | File | Frequency | Est. MB/day | Fix |
|--------|------|-----------|-------------|-----|

Then implement the fixes, starting with the highest-impact items.
