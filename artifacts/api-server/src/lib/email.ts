import { Resend } from "resend";

let cachedSettings: { apiKey: string; fromEmail: string } | null = null;

async function getResendCredentials(): Promise<{
  apiKey: string;
  fromEmail: string;
}> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken || !hostname) {
    throw new Error("Resend integration not available");
  }

  const res = await fetch(
    "https://" +
      hostname +
      "/api/v2/connection?include_secrets=true&connector_names=resend",
    {
      headers: {
        Accept: "application/json",
        "X-Replit-Token": xReplitToken,
      },
    },
  );

  const data = (await res.json()) as { items?: Array<{ settings?: { api_key?: string; from_email?: string } }> };
  const connection = data.items?.[0];

  if (!connection?.settings?.api_key) {
    throw new Error("Resend not connected");
  }

  return {
    apiKey: connection.settings.api_key,
    fromEmail: connection.settings.from_email || "noreply@resend.dev",
  };
}

async function getResendClient(): Promise<{
  client: Resend;
  fromEmail: string;
}> {
  const creds = await getResendCredentials();
  return {
    client: new Resend(creds.apiKey),
    fromEmail: creds.fromEmail,
  };
}

export async function sendVerificationEmail(
  to: string,
  token: string,
  origin: string,
): Promise<void> {
  const verifyUrl = `${origin}/api/auth/verify-email?token=${token}`;

  try {
    const { client, fromEmail } = await getResendClient();
    await client.emails.send({
      from: `SETPIECE <${fromEmail}>`,
      to,
      subject: "Verify your SETPIECE account",
      html: `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <h2 style="color: #10b981; font-size: 24px; margin-bottom: 8px;">SETPIECE</h2>
          <p style="color: #333; font-size: 16px; margin-bottom: 24px;">Verify your email to get started.</p>
          <a href="${verifyUrl}" style="display: inline-block; background: #10b981; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">Verify Email</a>
          <p style="color: #888; font-size: 13px; margin-top: 24px;">This link expires in 24 hours. If you didn't create an account, you can ignore this email.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("Failed to send verification email:", err);
  }
}

export async function sendPasswordResetEmail(
  to: string,
  token: string,
  origin: string,
): Promise<void> {
  const resetUrl = `${origin}/reset-password?token=${token}`;

  try {
    const { client, fromEmail } = await getResendClient();
    await client.emails.send({
      from: `SETPIECE <${fromEmail}>`,
      to,
      subject: "Reset your SETPIECE password",
      html: `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <h2 style="color: #10b981; font-size: 24px; margin-bottom: 8px;">SETPIECE</h2>
          <p style="color: #333; font-size: 16px; margin-bottom: 24px;">Click below to reset your password.</p>
          <a href="${resetUrl}" style="display: inline-block; background: #10b981; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">Reset Password</a>
          <p style="color: #888; font-size: 13px; margin-top: 24px;">This link expires in 1 hour. If you didn't request a reset, you can ignore this email.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("Failed to send password reset email:", err);
  }
}
