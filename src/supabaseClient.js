import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://alpdgpinfxbhagvqfgji.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFscGRncGluZnhiaGFndnFmZ2ppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNzg2NjAsImV4cCI6MjA5ODc1NDY2MH0.l3WaVz8H2vGW5vV-prIfh33h7TCv9nl5kw5kFQUWDIw'

export const supabase = createClient(supabaseUrl, supabaseKey)
