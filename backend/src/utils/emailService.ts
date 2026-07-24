// backend/src/utils/emailService.ts
function buildPasswordResetEmailHtml(code: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>APIIS LMS Password Reset</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f1f5f9; font-family:'Segoe UI', Helvetica, Arial, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9; padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px; width:100%; background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.08);">
            <!-- Header -->
            <tr>
              <td style="background-color:#1d4ed8; padding:24px 32px;">
                <span style="color:#ffffff; font-size:18px; font-weight:700; letter-spacing:0.5px;">
                  APIIS LMS
                </span>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 12px; font-size:20px; color:#0f172a;">
                  Reset your password
                </h1>
                <p style="margin:0 0 24px; font-size:14px; line-height:1.6; color:#475569;">
                  We received a request to reset your password. Use the code below to continue. This code is valid for the next
                  <strong>15 minutes</strong>.
                </p>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center" style="background-color:#f1f5f9; border:1px solid #e2e8f0; border-radius:10px; padding:20px;">
                      <span style="font-size:32px; font-weight:700; letter-spacing:8px; color:#1d4ed8;">
                        ${code}
                      </span>
                    </td>
                  </tr>
                </table>

                <p style="margin:24px 0 0; font-size:13px; line-height:1.6; color:#94a3b8;">
                  If you didn't request this, you can safely ignore this email — your password will remain unchanged.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:20px 32px; background-color:#f8fafc; border-top:1px solid #e2e8f0;">
                <p style="margin:0; font-size:12px; color:#94a3b8;">
                  This is an automated message from APIIS LMS. Please don't reply to this email.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `;
}

export async function sendPasswordResetEmail(
  to: string,
  code: string,
): Promise<void> {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": process.env.BREVO_API_KEY as string,
    },
    body: JSON.stringify({
      sender: { name: "APIIS LMS", email: "superlaring8@gmail.com" },
      to: [{ email: to }],
      subject: "Your APIIS LMS password reset code",
      htmlContent: buildPasswordResetEmailHtml(code),
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Brevo send failed (${res.status}): ${errorBody}`);
  }
}
