import { createClient } from '@supabase/supabase-js'

export const insforgeClient = createClient(
  import.meta.env.VITE_INSFORGE_URL as string,
  import.meta.env.VITE_INSFORGE_ANON_KEY as string,
)
