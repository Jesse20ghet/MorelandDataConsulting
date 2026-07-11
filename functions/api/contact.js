export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }

  const {
    name,
    email,
    message,
    'cf-turnstile-response': turnstileToken,
  } = body || {};

  if (!name || !email || !message) {
    return json({ error: 'Please fill in every field.' }, 400);
  }
  if (typeof name !== 'string' || typeof email !== 'string' || typeof message !== 'string') {
    return json({ error: 'Invalid input.' }, 400);
  }
  if (name.length > 200 || email.length > 200 || message.length > 5000) {
    return json({ error: 'One of your fields is too long.' }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'That email address looks off — mind checking it?' }, 400);
  }

  if (!turnstileToken) {
    return json({ error: 'Please complete the challenge.' }, 400);
  }
  const ip = request.headers.get('CF-Connecting-IP') || '';
  const tsBody = new URLSearchParams();
  tsBody.append('secret', env.TURNSTILE_SECRET_KEY);
  tsBody.append('response', turnstileToken);
  if (ip) tsBody.append('remoteip', ip);

  const tsRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: tsBody.toString(),
  });
  const rawText = await tsRes.text();
  let tsData;
  try {
    tsData = JSON.parse(rawText);
  } catch {
    tsData = { success: false, 'error-codes': ['parse-error'] };
  }
  if (!tsData.success) {
    const codes = tsData['error-codes'] || [];
    const s = env.TURNSTILE_SECRET_KEY || '';
    const pub = env.PUBLIC_TURNSTILE_SITE_KEY || '';
    const secretShape = {
      configured: !!s,
      length: s.length,
      startsWith: s.slice(0, 6),
      endsWith: s.slice(-4),
      hasSurroundingWhitespace: s !== s.trim(),
      tokenLength: (turnstileToken || '').length,
    };
    const siteKeyShape = {
      configured: !!pub,
      length: pub.length,
      startsWith: pub.slice(0, 6),
      endsWith: pub.slice(-4),
    };
    const secretEqualsSiteKey = !!s && s === pub;
    console.error('Turnstile verify failed:', codes, secretShape, 'raw:', rawText);
    return json({
      error: 'Challenge failed. Please try again.',
      debug: {
        turnstileErrors: codes,
        secretShape,
        siteKeyShape,
        secretEqualsSiteKey,
        rawResponse: rawText,
        rawStatus: tsRes.status,
      },
    }, 400);
  }

  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const html = `<!doctype html><html><body style="font-family: system-ui, sans-serif; color: #0f1922; line-height: 1.55;">
    <h2 style="margin: 0 0 12px;">New contact form submission</h2>
    <p style="margin: 4px 0;"><strong>Name:</strong> ${esc(name)}</p>
    <p style="margin: 4px 0;"><strong>Email:</strong> <a href="mailto:${esc(email)}">${esc(email)}</a></p>
    <p style="margin: 16px 0 6px;"><strong>Message:</strong></p>
    <div style="white-space: pre-wrap; padding: 14px 16px; background: #f4f7f9; border: 1px solid #e4ebef; border-radius: 8px;">${esc(message)}</div>
    <p style="margin-top: 22px; font-size: 13px; color: #6b7a86;">Reply directly to this email to reach ${esc(name)}.</p>
  </body></html>`;
  const text = `New contact form submission

Name: ${name}
Email: ${email}

Message:
${message}

(Reply to this email to reach ${name}.)`;

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `Moreland Contact Form <${env.CONTACT_FROM_EMAIL}>`,
      to: [env.CONTACT_TO_EMAIL],
      reply_to: email,
      subject: `New contact: ${name}`,
      html,
      text,
    }),
  });

  if (!resendRes.ok) {
    const errText = await resendRes.text().catch(() => '');
    console.error('Resend send failed:', resendRes.status, errText);
    return json({ error: "Couldn't send message. Please email me directly at jesse@morelanddataconsulting.com." }, 500);
  }

  return json({ ok: true });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
