// backend/src/utils/emailService.ts
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
      htmlContent: `
        <p>Your password reset code is:</p>
        <h2 style="letter-spacing: 4px;">${code}</h2>
        <p>This code expires in 15 minutes. If you didn't request this, you can safely ignore this email.</p>
      `,
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Brevo send failed (${res.status}): ${errorBody}`);
  }
}
