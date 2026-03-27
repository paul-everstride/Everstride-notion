"use server";

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = "Everstride <noreply@everstride.fit>";

function pairingEmailHtml({
  athleteName,
  coachName,
  teamName,
  pairingLink,
}: {
  athleteName: string;
  coachName?: string | null;
  teamName: string;
  pairingLink: string;
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Connect your wearable — Everstride</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#0a0a0a;padding:32px 40px;text-align:center;">
              <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Everstride</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 8px;font-size:24px;font-weight:700;color:#09090b;line-height:1.3;">
                Hi ${athleteName.split(" ")[0]} 👋
              </p>
              <p style="margin:0 0 24px;font-size:15px;color:#52525b;line-height:1.6;">
                ${coachName ? `<strong style="color:#09090b;">${coachName}</strong> has` : "Your coach has"} added you to <strong style="color:#09090b;">${teamName}</strong> on Everstride — a coaching platform that uses your wearable data to optimise your training.
              </p>

              <p style="margin:0 0 16px;font-size:15px;color:#52525b;line-height:1.6;">
                To get started, connect your wearable device using the button below. It only takes a minute.
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin:32px 0;">
                <tr>
                  <td style="background:#ea580c;border-radius:10px;">
                    <a href="${pairingLink}"
                      style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:-0.1px;">
                      Connect your wearable →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:13px;color:#a1a1aa;">
                Or copy this link into your browser:
              </p>
              <p style="margin:0 0 24px;font-size:12px;color:#71717a;word-break:break-all;background:#f4f4f5;padding:10px 14px;border-radius:8px;font-family:monospace;">
                ${pairingLink}
              </p>

              <hr style="border:none;border-top:1px solid #e4e4e7;margin:24px 0;" />

              <p style="margin:0;font-size:13px;color:#a1a1aa;line-height:1.6;">
                If you weren't expecting this email or have questions, you can ignore it or reply to this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#fafafa;border-top:1px solid #f0f0f0;padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;">
                © ${new Date().getFullYear()} Everstride · <a href="https://everstride.fit" style="color:#a1a1aa;text-decoration:underline;">everstride.fit</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendPairingEmail({
  to,
  athleteName,
  coachName,
  teamName,
  pairingLink,
}: {
  to: string;
  athleteName: string;
  coachName?: string | null;
  teamName: string;
  pairingLink: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to,
      subject: `Connect your wearable — ${teamName} on Everstride`,
      html: pairingEmailHtml({ athleteName, coachName, teamName, pairingLink }),
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}
