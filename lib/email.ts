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
<body style="margin:0;padding:0;background:#f8f8f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f8f8;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

          <!-- Header: white with orange accent bar -->
          <tr>
            <td style="background:#ffffff;padding:32px 40px 24px;border-bottom:3px solid #FE3A01;">
              <span style="font-size:24px;font-weight:800;color:#FE3A01;letter-spacing:-0.5px;">Everstride</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 32px;">

              <!-- Greeting -->
              <p style="margin:0 0 6px;font-size:26px;font-weight:700;color:#0a0a0a;line-height:1.3;">
                Hi ${athleteName.split(" ")[0]},
              </p>
              <p style="margin:0 0 28px;font-size:15px;color:#52525b;line-height:1.7;">
                ${coachName ? `<strong style="color:#0a0a0a;">${coachName}</strong> has` : "Your coach has"} added you to <strong style="color:#0a0a0a;">${teamName}</strong> on Everstride.
              </p>

              <!-- What is Everstride box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                <tr>
                  <td style="background:#fff7f5;border-left:4px solid #FE3A01;border-radius:0 10px 10px 0;padding:18px 20px;">
                    <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#FE3A01;text-transform:uppercase;letter-spacing:0.5px;">What is Everstride?</p>
                    <p style="margin:0;font-size:14px;color:#52525b;line-height:1.7;">
                      Everstride is an intelligent coaching platform that connects your wearable data — like recovery scores, HRV, sleep quality and resting heart rate — directly to your coach's dashboard. This means your coach can make smarter, data-driven decisions about your training load, rest days and performance planning.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Steps -->
              <p style="margin:0 0 16px;font-size:15px;font-weight:600;color:#0a0a0a;">Here's how to get started:</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                <tr>
                  <td style="padding:0 0 12px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background:#FE3A01;color:#fff;font-size:12px;font-weight:700;border-radius:50%;width:22px;height:22px;text-align:center;vertical-align:middle;padding:0;">1</td>
                        <td style="padding-left:12px;font-size:14px;color:#52525b;">Click the button below to open your personal pairing page</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 12px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background:#FE3A01;color:#fff;font-size:12px;font-weight:700;border-radius:50%;width:22px;height:22px;text-align:center;vertical-align:middle;padding:0;">2</td>
                        <td style="padding-left:12px;font-size:14px;color:#52525b;">Connect your WHOOP (or other wearable) in one click</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td>
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background:#FE3A01;color:#fff;font-size:12px;font-weight:700;border-radius:50%;width:22px;height:22px;text-align:center;vertical-align:middle;padding:0;">3</td>
                        <td style="padding-left:12px;font-size:14px;color:#52525b;">Your data syncs automatically — your coach will do the rest</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                <tr>
                  <td style="background:#FE3A01;border-radius:10px;">
                    <a href="${pairingLink}"
                      style="display:inline-block;padding:15px 36px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:-0.1px;">
                      Connect your wearable →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 6px;font-size:13px;color:#a1a1aa;">Or copy this link into your browser:</p>
              <p style="margin:0 0 28px;font-size:12px;color:#71717a;word-break:break-all;background:#f8f8f8;padding:10px 14px;border-radius:8px;font-family:monospace;border:1px solid #e4e4e7;">
                ${pairingLink}
              </p>

              <hr style="border:none;border-top:1px solid #f0f0f0;margin:0 0 20px;" />

              <p style="margin:0;font-size:13px;color:#a1a1aa;line-height:1.6;">
                Not expecting this email? You can safely ignore it. Questions? Reply to this email and we'll help you out.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#fafafa;border-top:1px solid #f0f0f0;padding:20px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size:13px;font-weight:700;color:#FE3A01;">Everstride</span>
                    <span style="font-size:12px;color:#d4d4d8;margin:0 6px;">·</span>
                    <a href="https://everstride.fit" style="font-size:12px;color:#a1a1aa;text-decoration:none;">everstride.fit</a>
                  </td>
                  <td align="right">
                    <span style="font-size:12px;color:#d4d4d8;">© ${new Date().getFullYear()} Everstride</span>
                  </td>
                </tr>
              </table>
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
