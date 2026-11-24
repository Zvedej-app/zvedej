// Supabase Edge Function: e-mail rodiči se žádostí o souhlas (GDPR čl. 8)
// POST /functions/v1/parent-consent-mail  { "token": "<uuid>" }  (volá přihlášené dítě)
//
// Proměnné (Project Settings → Edge Functions → Secrets):
//   RESEND_API_KEY  – klíč služby Resend (https://resend.com), případně jiné e-mailové služby
//   MAIL_FROM       – odesílatel, např. "Zvedej <noreply@vase-domena.cz>" (ověřená doména)
//   APP_URL         – adresa webové aplikace, např. https://zvedej-app.github.io/zvedej/
// SUPABASE_URL a SUPABASE_SERVICE_ROLE_KEY dodává Supabase automaticky.
// Bez RESEND_API_KEY funkce vrátí { sent: false } a aplikace nabídne odkaz ke sdílení.

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } });

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  let token = '';
  try {
    token = String((await req.json())?.token ?? '');
  } catch {
    return json({ error: 'bad request' }, 400);
  }
  if (!/^[0-9a-f-]{36}$/i.test(token)) return json({ error: 'bad token' }, 400);

  const key = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('MAIL_FROM');
  const appUrl = (Deno.env.get('APP_URL') ?? 'https://zvedej-app.github.io/zvedej/').replace(/\/?$/, '/');
  if (!key || !from) return json({ sent: false, reason: 'no_mail_provider' });

  // adresu rodiče a jméno dítěte čteme z databáze (ne od klienta) – nelze zneužít k rozesílání
  const sbUrl = Deno.env.get('SUPABASE_URL')!;
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const r = await fetch(`${sbUrl}/rest/v1/rpc/parent_consent_mail`, {
    method: 'POST',
    headers: { apikey: service, authorization: `Bearer ${service}`, 'content-type': 'application/json' },
    body: JSON.stringify({ p_token: token }),
  });
  const rows = r.ok ? await r.json() : [];
  const row = rows?.[0];
  if (!row?.parent_email) return json({ sent: false, reason: 'not_found' });

  const link = `${appUrl}parent/${token}`;
  const child = esc(row.child_first_name || 'Vaše dítě');
  const html = `<div style="font-family:system-ui,sans-serif;max-width:560px">
<h2 style="color:#000072">Souhlas se zapojením do aplikace Zvedej</h2>
<p>Dobrý den,</p>
<p><b>${child}</b> se zaregistroval(a) do aplikace <b>Zvedej</b> (tréninkový deník a komunita vzpěračů) a uvedl(a) Vás jako zákonného zástupce.
Protože je mladší než věková hranice pro samostatný souhlas, potřebujeme Váš souhlas se zpracováním jeho/jejích osobních údajů.</p>
<p>Do té doby může dítě používat jen tréninkový deník – bez zpráv, videí a přátel.</p>
<p><a href="${link}" style="display:inline-block;background:#D4060D;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700">Zobrazit a potvrdit souhlas</a></p>
<p style="color:#5B6B84;font-size:13px">Pokud o registraci nevíte nebo nejste zákonným zástupcem, e-mail ignorujte. Souhlas můžete kdykoli odvolat odpovědí na tento e-mail.</p>
</div>`;
  const mail = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from, to: [row.parent_email], subject: `Zvedej: souhlas pro ${row.child_first_name || 'vaše dítě'}`, html }),
  });
  return json({ sent: mail.ok });
});
