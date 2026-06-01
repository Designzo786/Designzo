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
import type { NotificationType } from "@prisma/client";

interface SendArgs {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendArgs): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "Designzo <onboarding@resend.dev>";

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
    <div style="font-size:20px;font-weight:700;background:linear-gradient(90deg,#a855f7,#7c3aed);-webkit-background-clip:text;background-clip:text;color:transparent;margin-bottom:24px;">Designzo</div>
    <h1 style="font-size:22px;font-weight:600;color:#fff;margin:0 0 16px;">${escapeHtml(title)}</h1>
    ${bodyHtml}
    <div style="margin-top:32px;padding-top:24px;border-top:1px solid #2a2a35;color:#7d7d8a;font-size:12px;line-height:1.6;">
      You're receiving this because someone (hopefully you) used your email at Designzo.
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
  const subject = "Verify your email — Designzo";
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
  const subject = "Reset your password — Designzo";
  const html = shell(
    `Hi ${name}, reset your password`,
    `<p style="line-height:1.6;color:#cfcfd8;">We received a request to reset your password. Click the button below to set a new one.</p>
     <p style="margin:24px 0;">${button(resetUrl, "Reset password")}</p>
     <p style="color:#7d7d8a;font-size:13px;line-height:1.6;">Or paste this link:<br/><a href="${resetUrl}" style="color:#a855f7;word-break:break-all;">${escapeHtml(resetUrl)}</a></p>
     <p style="color:#7d7d8a;font-size:13px;">This link expires in 1 hour. If you didn't request a reset, ignore this email — your password stays the same.</p>`
  );
  return { subject, html };
}

/**
 * Per-type presentation for notification emails: an icon, an accent colour and
 * a call-to-action label. The accent drives the top strip, the icon ring and
 * the button. Accent colours are the -600 shades so white button text stays
 * legible on every one of them.
 */
// Partial<…> while the Prisma client is one generate behind the schema —
// WELCOME exists in the DB enum (and the schema) but a running Next dev
// server can block `prisma generate` from refreshing TS types. The render
// function below falls back to a generic style for any missing key, so this
// is always safe at runtime.
const NOTIFICATION_STYLE: Partial<
  Record<
    NotificationType | "WELCOME",
    { icon: string; accent: string; cta: string }
  >
> = {
  ASSET_APPROVED:    { icon: "🎉", accent: "#16a34a", cta: "View your asset" },
  ASSET_REJECTED:    { icon: "📝", accent: "#d97706", cta: "Review feedback" },
  SALE:              { icon: "💰", accent: "#16a34a", cta: "View your earnings" },
  PURCHASE:          { icon: "🛒", accent: "#9333ea", cta: "Go to your library" },
  PAYOUT_PROCESSING: { icon: "⏳", accent: "#2563eb", cta: "Track your payout" },
  PAYOUT_PAID:       { icon: "💸", accent: "#16a34a", cta: "View your payouts" },
  PAYOUT_FAILED:     { icon: "⚠️", accent: "#dc2626", cta: "View your payouts" },
  KYC_VERIFIED:      { icon: "🛡️", accent: "#16a34a", cta: "Open your account" },
  KYC_REJECTED:      { icon: "⚠️", accent: "#d97706", cta: "Review & resubmit" },
  CREATOR_APPROVED:  { icon: "🎨", accent: "#16a34a", cta: "Open creator dashboard" },
  CREATOR_REJECTED:  { icon: "📝", accent: "#d97706", cta: "Review feedback" },
  REVIEW:            { icon: "⭐", accent: "#9333ea", cta: "View the review" },
  WELCOME:           { icon: "🎉", accent: "#7c3aed", cta: "Get started" },
};

const FALLBACK_NOTIFICATION_STYLE = {
  icon: "🔔",
  accent: "#7c3aed",
  cta: "Open Designzo",
} as const;

/**
 * Generic notification email — the email twin of every in-app notification.
 * `createNotification` calls this so each notification reaches the user both
 * in the bell and in their inbox. The notification `type` drives the accent
 * colour, icon and call-to-action label so a sale, a rejection and a payout
 * each feel distinct at a glance.
 */
export function renderNotificationEmail(
  name: string,
  type: NotificationType,
  title: string,
  body: string,
  link: string | null
): { subject: string; html: string } {
  const style = NOTIFICATION_STYLE[type] ?? FALLBACK_NOTIFICATION_STYLE;
  const subject = `${title} — Designzo`;
  const safeBody = escapeHtml(body).replace(/\n/g, "<br/>");
  const year = new Date().getFullYear();

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="color-scheme" content="dark"/>
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#08080c;-webkit-text-size-adjust:100%;">
  <!-- preheader: the grey preview line inbox apps show next to the subject -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#08080c;">${escapeHtml(body)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#08080c;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px;max-width:100%;background:#101019;border:1px solid #23232f;border-radius:16px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

          <tr><td style="height:4px;line-height:4px;font-size:0;background:${style.accent};">&nbsp;</td></tr>

          <tr>
            <td style="padding:28px 40px 0;">
              <span style="font-size:18px;font-weight:800;letter-spacing:-0.02em;color:#a855f7;">Game<span style="color:#ffffff;">Changer</span></span>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:26px 40px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" valign="middle" width="74" height="74" style="width:74px;height:74px;background:#17171f;border:1px solid ${style.accent};border-radius:50%;font-size:32px;line-height:74px;mso-line-height-rule:exactly;">${style.icon}</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:22px 44px 0;">
              <h1 style="margin:0;font-size:22px;line-height:1.35;font-weight:700;color:#ffffff;">${escapeHtml(title)}</h1>
            </td>
          </tr>

          <tr>
            <td style="padding:18px 44px 0;">
              <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#c6c6d2;">Hi ${escapeHtml(name)},</p>
              <p style="margin:0;font-size:15px;line-height:1.65;color:#c6c6d2;">${safeBody}</p>
            </td>
          </tr>
          ${
            link
              ? `
          <tr>
            <td align="center" style="padding:30px 44px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" bgcolor="${style.accent}" style="border-radius:10px;">
                    <a href="${link}" style="display:inline-block;padding:13px 32px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">${escapeHtml(style.cta)} &rarr;</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
              : ""
          }
          <tr>
            <td style="padding:34px 44px 0;">
              <div style="border-top:1px solid #23232f;font-size:0;line-height:0;">&nbsp;</div>
            </td>
          </tr>

          <tr>
            <td style="padding:18px 44px 32px;">
              <p style="margin:0 0 6px;font-size:12px;line-height:1.6;color:#6b6b78;">
                You're receiving this because you have a Designzo account. Every notification also waits for you under the bell icon when you're signed in.
              </p>
              <p style="margin:0;font-size:12px;line-height:1.6;color:#6b6b78;">
                © ${year} Designzo — the digital asset marketplace.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  return { subject, html };
}
