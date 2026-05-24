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
          html: `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F4F4F4;font-family:Arial,Helvetica,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F4F4;padding:32px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">

        <!-- Header -->
        <tr>
          <td style="background:#1A1A1A;padding:28px 40px;border-radius:6px 6px 0 0">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <span style="font-size:26px;font-weight:700;letter-spacing:0.06em;color:#FFFFFF">SOS<span style="color:#E53935">-D</span></span>
                  <span style="display:block;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#9E9E9E;margin-top:4px">Indumentaria Deportiva</span>
                </td>
                <td align="right">
                  <span style="background:#E53935;color:#FFFFFF;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;padding:6px 14px;border-radius:2px">Nueva consulta</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#FFFFFF;padding:36px 40px">

            <!-- Datos del contacto -->
            <p style="margin:0 0 20px;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#9E9E9E">Datos del contacto</p>

            <table width="100%" cellpadding="0" cellspacing="0" style="border:1.5px solid #EEEEEE;border-radius:4px;overflow:hidden">
              <tr style="background:#FAFAFA">
                <td style="padding:14px 20px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#9E9E9E;width:110px;border-bottom:1px solid #EEEEEE">Nombre</td>
                <td style="padding:14px 20px;font-size:15px;color:#1A1A1A;font-weight:600;border-bottom:1px solid #EEEEEE">${name}</td>
              </tr>
              <tr>
                <td style="padding:14px 20px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#9E9E9E;border-bottom:${phone || subject ? '1px solid #EEEEEE' : '0'}">Email</td>
                <td style="padding:14px 20px;font-size:15px;border-bottom:${phone || subject ? '1px solid #EEEEEE' : '0'}"><a href="mailto:${email}" style="color:#1565C0;text-decoration:none">${email}</a></td>
              </tr>
              ${phone ? `<tr style="background:#FAFAFA">
                <td style="padding:14px 20px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#9E9E9E;border-bottom:${subject ? '1px solid #EEEEEE' : '0'}">Teléfono</td>
                <td style="padding:14px 20px;font-size:15px;color:#1A1A1A;border-bottom:${subject ? '1px solid #EEEEEE' : '0'}">${phone}</td>
              </tr>` : ''}
              ${subject ? `<tr${phone ? '' : ' style="background:#FAFAFA"'}>
                <td style="padding:14px 20px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#9E9E9E">Asunto</td>
                <td style="padding:14px 20px;font-size:15px;color:#1A1A1A">${subject}</td>
              </tr>` : ''}
            </table>

            <!-- Mensaje -->
            <p style="margin:32px 0 12px;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#9E9E9E">Mensaje</p>
            <div style="background:#F7F6F3;border-left:3px solid #E53935;border-radius:0 4px 4px 0;padding:20px 24px">
              <p style="margin:0;font-size:15px;color:#1A1A1A;line-height:1.7;white-space:pre-wrap">${message}</p>
            </div>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px">
              <tr>
                <td>
                  <a href="mailto:${email}?subject=Re: ${encodeURIComponent(subject || 'Tu consulta en SOS-D')}" style="display:inline-block;background:#1A1A1A;color:#FFFFFF;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;text-decoration:none;padding:14px 28px;border-radius:2px">Responder a ${name}</a>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#F0F0F0;padding:20px 40px;border-radius:0 0 6px 6px;border-top:1px solid #E0E0E0">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:12px;color:#9E9E9E;line-height:1.6">
                  <strong style="color:#6B6B6B">SOS-D Indumentaria</strong> &nbsp;·&nbsp; Vélez Sarsfield 950, San Francisco, Córdoba<br>
                  <a href="https://sos-d.com.ar" style="color:#9E9E9E">sos-d.com.ar</a> &nbsp;·&nbsp; +54 9 3564 504433
                </td>
                <td align="right" style="font-size:11px;color:#BDBDBD;white-space:nowrap">
                  Notificación automática
                </td>
              </tr>
            </table>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
        }),
      });

      if (!emailRes.ok) {
        const err = await emailRes.text();
        return new Response(JSON.stringify({ error: `Resend: ${err}` }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
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
