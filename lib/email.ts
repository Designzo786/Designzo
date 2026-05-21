/**
 * Transactional email transport.
 *
 * Production: posts to Resend's REST API via fetch (no SDK dep needed).
 *   Required env vars: RESEND_API_KEY, EMAIL_FROM (verified sender).
 *
 * Development (no RESEND_API_KEY set): logs the email contents to the
 *   server console so you can copy/paste verification & reset links during
 *   local testing. NEVER ships an email — safe to use against real addresses
 *   without spamming them.
 */

interface SendArgs {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendArgs): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "GameChanger <onboarding@resend.dev>";

  if (!apiKey) {
    // Dev fallback — log so the developer can grab the link from the terminal.
    console.log("\n" + "─".repeat(60));
    console.log("📧  EMAIL (dev mode — not actually sent)");
    console.log("─".repeat(60));
    console.log(`To:      ${to}`);
    console.log(`From:    ${from}`);
    console.log(`Subject: ${subject}`);
    console.log("─".repeat(60));
    console.log(text ?? stripHtml(html));
    console.log("─".repeat(60) + "\n");
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
      text: text ?? stripHtml(html),
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error(`[email] Resend failed (${res.status}):`, detail);
    throw new Error(`Email delivery failed: ${res.status}`);
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Templates ────────────────────────────────────────────────────────────────

function shell(title: string, bodyHtml: string): string {
  return `
<!doctype html>
<html><body style="margin:0;background:#0b0b10;color:#e8e8ed;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="font-size:20px;font-weight:700;background:linear-gradient(90deg,#a855f7,#7c3aed);-webkit-background-clip:text;background-clip:text;color:transparent;margin-bottom:24px;">GameChanger</div>
    <h1 style="font-size:22px;font-weight:600;color:#fff;margin:0 0 16px;">${escapeHtml(title)}</h1>
    ${bodyHtml}
    <div style="margin-top:32px;padding-top:24px;border-top:1px solid #2a2a35;color:#7d7d8a;font-size:12px;line-height:1.6;">
      You're receiving this because someone (hopefully you) used your email at GameChanger.
      If this wasn't you, you can safely ignore this message — no changes were made.
    </div>
  </div>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;padding:12px 24px;background:linear-gradient(90deg,#7c3aed,#a855f7);color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">${escapeHtml(label)}</a>`;
}

export function renderVerifyEmail(name: string, verifyUrl: string): { subject: string; html: string } {
  const subject = "Verify your email — GameChanger";
  const html = shell(
    `Hi ${name}, please verify your email`,
    `<p style="line-height:1.6;color:#cfcfd8;">Click the button below to confirm your email and finish setting up your account.</p>
     <p style="margin:24px 0;">${button(verifyUrl, "Verify email")}</p>
     <p style="color:#7d7d8a;font-size:13px;line-height:1.6;">Or paste this link into your browser:<br/><a href="${verifyUrl}" style="color:#a855f7;word-break:break-all;">${escapeHtml(verifyUrl)}</a></p>
     <p style="color:#7d7d8a;font-size:13px;">This link expires in 24 hours.</p>`
  );
  return { subject, html };
}

export function renderResetEmail(name: string, resetUrl: string): { subject: string; html: string } {
  const subject = "Reset your password — GameChanger";
  const html = shell(
    `Hi ${name}, reset your password`,
    `<p style="line-height:1.6;color:#cfcfd8;">We received a request to reset your password. Click the button below to set a new one.</p>
     <p style="margin:24px 0;">${button(resetUrl, "Reset password")}</p>
     <p style="color:#7d7d8a;font-size:13px;line-height:1.6;">Or paste this link:<br/><a href="${resetUrl}" style="color:#a855f7;word-break:break-all;">${escapeHtml(resetUrl)}</a></p>
     <p style="color:#7d7d8a;font-size:13px;">This link expires in 1 hour. If you didn't request a reset, ignore this email — your password stays the same.</p>`
  );
  return { subject, html };
}

export function renderPayoutPaidEmail(
  name: string,
  amount: string,
  transactionRef: string | null,
  dashboardUrl: string
): { subject: string; html: string } {
  const subject = `Your payout of ${amount} has been sent`;
  const refRow = transactionRef
    ? `<tr><td style="padding:6px 0;color:#7d7d8a;font-size:13px;">Reference</td><td style="padding:6px 0;color:#e8e8ed;font-family:ui-monospace,SFMono-Regular,monospace;font-size:13px;">${escapeHtml(transactionRef)}</td></tr>`
    : "";
  const html = shell(
    `Hi ${name}, your payout is on its way`,
    `<p style="line-height:1.6;color:#cfcfd8;">We've sent your earnings to your registered bank account. Funds typically arrive within 1-3 business days.</p>
     <table cellspacing="0" cellpadding="0" style="margin:20px 0;width:100%;background:#15151d;border:1px solid #2a2a35;border-radius:8px;padding:16px;">
       <tr><td style="padding:6px 0;color:#7d7d8a;font-size:13px;">Amount</td><td style="padding:6px 0;color:#fff;font-weight:600;">${escapeHtml(amount)}</td></tr>
       ${refRow}
     </table>
     <p style="margin:24px 0;">${button(dashboardUrl, "View payout history")}</p>
     <p style="color:#7d7d8a;font-size:13px;">If the amount doesn't reach your account within 3 business days, reply to this email so we can investigate.</p>`
  );
  return { subject, html };
}
