import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { drizzle } from 'drizzle-orm/d1';
import { authSchema } from './db/schema';

export interface Env {
  DB: D1Database;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
}

type Mail = { to: string; subject: string; html: string };

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character);
}

async function sendMail(env: Env, mail: Mail): Promise<void> {
  if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) {
    throw new Error('Transactional email is not configured.');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: env.RESEND_FROM_EMAIL, to: [mail.to], subject: mail.subject, html: mail.html }),
  });

  if (!response.ok) throw new Error('Email delivery failed.');
}

function emailAction(name: string, url: string): string {
  return `<p>Hello ${escapeHtml(name)},</p><p><a href="${escapeHtml(url)}">Continue to ClubHub</a></p><p>If you did not request this, you can ignore this email.</p>`;
}

export function createAuth(env: Env) {
  if (!env.BETTER_AUTH_SECRET || env.BETTER_AUTH_SECRET.length < 32 || !env.BETTER_AUTH_URL) {
    throw new Error('Authentication is not configured.');
  }

  return betterAuth({
    appName: 'ClubHub',
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(drizzle(env.DB, { schema: authSchema }), {
      provider: 'sqlite',
      schema: authSchema,
      transaction: false,
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user: authUser, url }) => {
        await sendMail(env, {
          to: authUser.email,
          subject: 'Reset your ClubHub password',
          html: emailAction(authUser.name, url),
        });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user: authUser, url }) => {
        await sendMail(env, {
          to: authUser.email,
          subject: 'Verify your ClubHub email',
          html: emailAction(authUser.name, url),
        });
      },
    },
    trustedOrigins: [env.BETTER_AUTH_URL],
    advanced: {
      useSecureCookies: env.BETTER_AUTH_URL.startsWith('https://'),
    },
  });
}