const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://gkayyfwadwwsucpqeefw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrYXl5ZndhZHd3c3VjcHFlZWZ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTg2NzU0MCwiZXhwIjoyMDk1NDQzNTQwfQ.lv3_6tPCKHCwOOwtTFcI-0ERssAzA5O-ErC_A8h87Xw';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  // Let's get one row to inspect the columns
  const { data, error } = await supabase
    .from('whatsapp_history')
    .select('*')
    .limit(1);
    
  if (error) {
    console.error('Error fetching whatsapp_history:', error);
    return;
  }
  
  if (data && data.length > 0) {
    console.log('Columns in whatsapp_history:', Object.keys(data[0]));
    console.log('Sample row:', data[0]);
  } else {
    console.log('No rows in whatsapp_history to inspect.');
  }
}

main();
