import { createClient } from '@supabase/supabase-js'
const supabaseUrl = 'YOUT URL'
const supabaseKey = "YOUR API KEY"
const supabase = createClient(supabaseUrl, supabaseKey)

export default supabase


