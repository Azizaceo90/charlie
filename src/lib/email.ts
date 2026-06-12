import nodemailer from "nodemailer";

interface SendArgs {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: string }[];
}

/**
 * Sends an email via Resend's HTTP API. Returns true if sent. No-op (returns
 * false) when RESEND_API_KEY isn't configured, so the app degrades gracefully
 * to showing credentials in the UI instead.
 */
export interface SendResult {
  ok: boolean;
  error?: string;
}

export async function sendEmail(args: SendArgs): Promise<SendResult> {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (gmailUser && gmailPass) return sendViaGmail(args, gmailUser, gmailPass);

  if (process.env.RESEND_API_KEY) return sendViaResend(args);

  return {
    ok: false,
    error: "Email isn't configured (set GMAIL_USER + GMAIL_APP_PASSWORD).",
  };
}

async function sendViaGmail(
  { to, subject, html, attachments }: SendArgs,
  user: string,
  pass: string
): Promise<SendResult> {
  try {
    const transport = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass: pass.replace(/\s+/g, "") },
    });
    await transport.sendMail({
      from: `"Career Ops" <${user}>`,
      to,
      subject,
      html,
      attachments: attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        encoding: "base64",
      })),
    });
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Gmail send failed.",
    };
  }
}

async function sendViaResend({
  to,
  subject,
  html,
  attachments,
}: SendArgs): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY!;
  const from = process.env.EMAIL_FROM || "Career Ops <onboarding@resend.dev>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        html,
        ...(attachments?.length ? { attachments } : {}),
      }),
    });
    if (res.ok) return { ok: true };
    const data = await res.json().catch(() => ({}));
    return { ok: false, error: data.message ?? `Email failed (${res.status}).` };
  } catch {
    return { ok: false, error: "Could not reach the email service." };
  }
}

export function contractEmailHtml(opts: {
  name: string;
  contractTitle: string;
  inviter: string;
  signUrl: string;
}): string {
  return `
  <div style="font-family:ui-sans-serif,system-ui,sans-serif;max-width:480px;margin:0 auto;color:#323338">
    <div style="background:#0073ea;color:#fff;padding:20px 24px;border-radius:12px 12px 0 0;font-size:18px;font-weight:700">
      Career Ops
    </div>
    <div style="border:1px solid #e0e3ee;border-top:0;border-radius:0 0 12px 12px;padding:24px">
      <p>Hi ${opts.name},</p>
      <p>${opts.inviter} has assigned you a contract to review and sign:</p>
      <div style="background:#f6f7fb;border:1px solid #e0e3ee;border-radius:8px;padding:14px 16px;margin:16px 0;font-size:15px;font-weight:600">
        ${opts.contractTitle}
      </div>
      <p>The document is attached. To sign it electronically, open Contracts in Career Ops:</p>
      <a href="${opts.signUrl}" style="display:inline-block;background:#0073ea;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">Review &amp; sign</a>
    </div>
  </div>`;
}

export function contractReminderEmailHtml(opts: {
  name: string;
  contractTitle: string;
  inviter: string;
  signUrl: string;
  issuedAt?: string;
}): string {
  const issued = opts.issuedAt
    ? new Date(opts.issuedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;
  return `
  <div style="font-family:ui-sans-serif,system-ui,sans-serif;max-width:480px;margin:0 auto;color:#323338">
    <div style="background:#0073ea;color:#fff;padding:20px 24px;border-radius:12px 12px 0 0;font-size:18px;font-weight:700">
      Career Ops
    </div>
    <div style="border:1px solid #e0e3ee;border-top:0;border-radius:0 0 12px 12px;padding:24px">
      <p>Hi ${opts.name},</p>
      <p>This is a friendly reminder from ${opts.inviter} that the following contract is still waiting for your signature:</p>
      <div style="background:#fff8ec;border:1px solid #f5c451;border-radius:8px;padding:14px 16px;margin:16px 0;font-size:15px;font-weight:600">
        ${opts.contractTitle}${
          issued
            ? `<div style="font-weight:400;font-size:12px;color:#676879;margin-top:4px">Issued ${issued}</div>`
            : ""
        }
      </div>
      <p>It only takes a minute — the document is attached. To sign it electronically, open Contracts in Career Ops:</p>
      <a href="${opts.signUrl}" style="display:inline-block;background:#0073ea;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">Review &amp; sign</a>
    </div>
  </div>`;
}

export function emailConfigured(): boolean {
  return Boolean(
    (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) ||
      process.env.RESEND_API_KEY
  );
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
