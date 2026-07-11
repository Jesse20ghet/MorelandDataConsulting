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
    company_website,
    'cf-turnstile-response': turnstileToken,
  } = body || {};

  if (company_website) {
    return json({ ok: true });
  }

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
  const tsForm = new FormData();
  tsForm.append('secret', env.TURNSTILE_SECRET_KEY);
  tsForm.append('response', turnstileToken);
  if (ip) tsForm.append('remoteip', ip);

  const tsRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: tsForm,
  });
  const tsData = await tsRes.json().catch(() => ({ success: false }));
  if (!tsData.success) {
    return json({ error: 'Challenge failed. Please try again.' }, 400);
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
