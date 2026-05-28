interface SendArgs {
  to: string;
  subject: string;
  html: string;
}

/**
 * Sends an email via Resend's HTTP API. Returns true if sent. No-op (returns
 * false) when RESEND_API_KEY isn't configured, so the app degrades gracefully
 * to showing credentials in the UI instead.
 */
export async function sendEmail({ to, subject, html }: SendArgs): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  const from = process.env.EMAIL_FROM || "Career Ops <onboarding@resend.dev>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export function inviteEmailHtml(opts: {
  name: string;
  email: string;
  password: string;
  loginUrl: string;
  inviter: string;
}): string {
  return `
  <div style="font-family:ui-sans-serif,system-ui,sans-serif;max-width:480px;margin:0 auto;color:#323338">
    <div style="background:#0073ea;color:#fff;padding:20px 24px;border-radius:12px 12px 0 0;font-size:18px;font-weight:700">
      Career Ops
    </div>
    <div style="border:1px solid #e0e3ee;border-top:0;border-radius:0 0 12px 12px;padding:24px">
      <p>Hi ${opts.name},</p>
      <p>${opts.inviter} has invited you to <strong>Career Ops</strong>. You can sign in with the credentials below:</p>
      <div style="background:#f6f7fb;border:1px solid #e0e3ee;border-radius:8px;padding:14px 16px;margin:16px 0;font-size:14px">
        <div>Email: <strong>${opts.email}</strong></div>
        <div>Temporary password: <strong>${opts.password}</strong></div>
      </div>
      <a href="${opts.loginUrl}" style="display:inline-block;background:#0073ea;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">Sign in</a>
      <p style="color:#676879;font-size:12px;margin-top:20px">Please change your password after signing in.</p>
    </div>
  </div>`;
}
