import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'backend/node-api/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function test() {
  try {
    const { data: users } = await supabase.from('users').select('id').limit(1);
    if (!users || users.length === 0) {
      console.error("No users found.");
      return;
    }
    const userId = users[0].id;
    
    const { data: meeting, error } = await supabase
      .from('meetings')
      .insert({
        user_id: userId,
        title: "Check Columns Meeting",
        input_type: 'transcript',
        raw_transcript: 'Check columns raw',
        status: 'ready'
      })
      .select()
      .single();
      
    if (error) {
      console.error("Insert error:", error);
    } else {
      console.log("Meeting columns:", Object.keys(meeting));
      // Delete it
      await supabase.from('meetings').delete().eq('id', meeting.id);
    }
  } catch (err) {
    console.error("Exception:", err);
  }
}

test();
