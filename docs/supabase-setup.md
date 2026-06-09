# Supabase setup for cloud uploads

This app remains a static HTML/CSS/JavaScript app. It does not use Next.js routing, `next/headers`, or `next/server`. Start it with `npm start`, which generates `supabase-config.js` from `.env.local` and serves the existing static files.

## Required environment variables

Add these public Supabase values to `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Then run:

```bash
npm run supabase:config
```

## Storage bucket

Create a Supabase Storage bucket named `uploads`.

## Storage policies

Prefer authenticated uploads if this portal is later connected to Supabase Auth. Example policies:

```sql
create policy "Authenticated users can upload files"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'uploads' and owner = auth.uid());

create policy "Authenticated users can read own files"
on storage.objects
for select
to authenticated
using (bucket_id = 'uploads' and owner = auth.uid());
```

For a demo-only public upload bucket, use permissive anonymous policies instead, but only if public uploads are acceptable for the deployment:

```sql
create policy "Public demo uploads"
on storage.objects
for insert
to anon
with check (bucket_id = 'uploads');

create policy "Public demo reads"
on storage.objects
for select
to anon
using (bucket_id = 'uploads');
```

## Optional metadata table

The app attempts to save upload metadata to `uploaded_files` after a successful Storage upload. If the table or policy is missing, the file upload still succeeds and the UI/console reports that metadata was skipped.

```sql
create table if not exists public.uploaded_files (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  file_name text not null,
  storage_bucket text not null,
  storage_path text not null,
  content_type text,
  size_bytes bigint,
  public_url text,
  created_at timestamptz not null default now()
);
```

## Verification path

1. Run `npm start`.
2. Log in with the demo credentials.
3. Confirm the Supabase card reports the `uploads` bucket connection status.
4. Select a file and click **Upload File**.
5. Confirm the UI displays the generated Storage path and public URL for the uploaded file.
