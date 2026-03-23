// js/config.js
const SUPABASE_URL = 'https://mpdvfqunpgvzdcfxsayt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wZHZmcXVucGd2emRjZnhzYXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NDg2MjMsImV4cCI6MjA4OTQyNDYyM30.B6C_zOKsrAovJblW5uigj-ItggRDWcfzgUubIe5zgW0';      
export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
