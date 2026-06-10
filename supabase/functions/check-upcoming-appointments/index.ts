import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Checking for appointments requiring reminders...');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find appointments within next 24 hours that haven't received reminders
    const now = new Date();
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const { data: appointments, error: queryError } = await supabase
      .from('appointments')
      .select('id, patient_id, scheduled_at')
      .eq('status', 'scheduled')
      .eq('reminder_sent', false)
      .gte('scheduled_at', now.toISOString())
      .lte('scheduled_at', twentyFourHoursFromNow.toISOString());

    if (queryError) {
      console.error('Query error:', queryError);
      throw queryError;
    }

    console.log(`Found ${appointments?.length || 0} appointments requiring reminders`);

    if (!appointments || appointments.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No appointments requiring reminders',
          count: 0
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Send reminders for each appointment
    const results = [];
    for (const appointment of appointments) {
      try {
        console.log(`Sending reminder for appointment ${appointment.id}`);
        
        const { data, error } = await supabase.functions.invoke('send-appointment-reminder', {
          body: {
            appointmentId: appointment.id,
            patientId: appointment.patient_id,
            scheduledAt: appointment.scheduled_at
          }
        });

        if (error) {
          console.error(`Failed to send reminder for ${appointment.id}:`, error);
          results.push({ appointmentId: appointment.id, success: false, error: error.message });
        } else {
          console.log(`Successfully sent reminder for ${appointment.id}`);
          results.push({ appointmentId: appointment.id, success: true });
        }
      } catch (error) {
        console.error(`Exception sending reminder for ${appointment.id}:`, error);
        results.push({ 
          appointmentId: appointment.id, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`Reminder batch complete: ${successCount} sent, ${failureCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        totalAppointments: appointments.length,
        remindersSent: successCount,
        remindersFailed: failureCount,
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in check-upcoming-appointments:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to check appointments';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});