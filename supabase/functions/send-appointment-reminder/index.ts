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
    const { appointmentId, patientId, scheduledAt } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('patient_identifier, contact_notes, metadata')
      .eq('id', patientId)
      .single();

    if (patientError || !patient) {
      console.error('Patient not found:', patientError);
      throw new Error('Patient not found');
    }

    let phoneNumber = null;
    
    if (patient.metadata && typeof patient.metadata === 'object' && 'phone' in patient.metadata) {
      phoneNumber = (patient.metadata as any).phone;
    } else if (patient.contact_notes) {
      const phoneMatch = patient.contact_notes.match(/(?:phone|tel|mobile|cell):\s*(\+?[\d\s-]+)/i);
      if (phoneMatch) {
        phoneNumber = phoneMatch[1].replace(/[^\d+]/g, '');
      }
    }

    if (!phoneNumber) {
      throw new Error('Patient phone number not found. Please add phone number to patient contact notes or metadata.');
    }

    const appointmentDate = new Date(scheduledAt);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    const dayName = days[appointmentDate.getDay()];
    const monthName = months[appointmentDate.getMonth()];
    const dayOfMonth = appointmentDate.getDate();
    
    const formattedDate = `${dayName}, ${monthName} ${dayOfMonth}`;
    
    let hours = appointmentDate.getHours();
    const minutes = appointmentDate.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const formattedTime = `${hours}:${minutes.toString().padStart(2, '0')} ${ampm}`;

    const message = `Appointment Reminder: You have a scheduled appointment on ${formattedDate} at ${formattedTime}. Patient ID: ${patient.patient_identifier}. Please contact us if you need to reschedule.`;

    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      throw new Error('Twilio credentials not configured');
    }

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const twilioAuth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${twilioAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: phoneNumber,
        From: twilioPhoneNumber,
        Body: message,
      }),
    });

    if (!twilioResponse.ok) {
      const errorData = await twilioResponse.text();
      console.error('Twilio API error:', errorData);
      throw new Error(`Twilio API error: ${twilioResponse.status} - ${errorData}`);
    }

    const twilioData = await twilioResponse.json();
    console.log('SMS sent successfully:', twilioData.sid);

    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        reminder_sent: true,
        reminder_sent_at: new Date().toISOString()
      })
      .eq('id', appointmentId);

    if (updateError) {
      console.error('Error updating appointment:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageSid: twilioData.sid,
        phoneNumber: phoneNumber
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error sending reminder:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to send reminder';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});