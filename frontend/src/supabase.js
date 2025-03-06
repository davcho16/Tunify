import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://avdfnkspczyosmkguvfo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2ZGZua3NwY3p5b3Nta2d1dmZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA1MjYyNjQsImV4cCI6MjA1NjEwMjI2NH0.7RxyLchxD_ZpobRz75OLcG2AqjZUfJz94y9duFOHE30';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
