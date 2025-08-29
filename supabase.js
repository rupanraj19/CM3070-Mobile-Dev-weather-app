import { createClient } from '@supabase/supabase-js';

// Supabase project URL and anon public key
const supabaseUrl = 'https://qbwgvdnomyddgeyrhbqa.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFid2d2ZG5vbXlkZGdleXJoYnFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNjg2ODQsImV4cCI6MjA3MDY0NDY4NH0.m4LyUQBUNkoMAX58-BgOuccnzwT05FpAOfB-oPZUO4Y'; 

// Create a single Supabase client instance
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
