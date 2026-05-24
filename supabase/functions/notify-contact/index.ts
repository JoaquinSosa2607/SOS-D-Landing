import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { name, email, phone, subject, message } = await req.json();

    // 1. Guardar en Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { error: dbError } = await supabase
      .from('contacts')
      .insert({ name, email, phone, subject, message });

    if (dbError) throw new Error(`DB error: ${dbError.message}`);

    // 2. Enviar mail via Resend
    const resendKey = Deno.env.get('RESEND_API_KEY');
    const toEmail   = Deno.env.get('CONTACT_EMAIL');

    if (resendKey && toEmail) {
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'SOS-D Web <notificaciones@sos-d.com.ar>',
          to: [toEmail],
          reply_to: email,
          subject: `Nueva consulta${subject ? `: ${subject}` : ''} — SOS-D Indumentaria`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
              <h2 style="color:#E53935;margin-top:0">Nueva consulta desde la web</h2>
              <table style="width:100%;border-collapse:collapse">
                <tr><td style="padding:8px 0;color:#6B6B6B;width:120px">Nombre</td><td style="padding:8px 0;font-weight:500">${name}</td></tr>
                <tr><td style="padding:8px 0;color:#6B6B6B">Email</td><td style="padding:8px 0"><a href="mailto:${email}">${email}</a></td></tr>
                ${phone ? `<tr><td style="padding:8px 0;color:#6B6B6B">Teléfono</td><td style="padding:8px 0">${phone}</td></tr>` : ''}
                ${subject ? `<tr><td style="padding:8px 0;color:#6B6B6B">Asunto</td><td style="padding:8px 0">${subject}</td></tr>` : ''}
              </table>
              <div style="margin-top:16px;padding:16px;background:#F7F6F3;border-radius:4px">
                <p style="color:#6B6B6B;margin:0 0 8px;font-size:13px">MENSAJE</p>
                <p style="margin:0;white-space:pre-wrap">${message}</p>
              </div>
            </div>
          `,
        }),
      });

      if (!emailRes.ok) {
        const err = await emailRes.text();
        console.error('Resend error:', err);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
