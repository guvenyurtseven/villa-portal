const MAIL_DOMAIN = "xn--villadnyas-feb45d.com";
const DEFAULT_FROM_ADDRESS = `noreply@${MAIL_DOMAIN}`;
const DEFAULT_INBOX_ADDRESS = `inbox@${MAIL_DOMAIN}`;
const DISPLAY_NAME = "Villa Dunyasi";

function stripDisplayName(value: string) {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] ?? value).trim();
}

function isDomainAddress(value: string) {
  return value.toLowerCase().endsWith(`@${MAIL_DOMAIN}`);
}

function normalizeDomainAddress(value: string | null | undefined, fallback: string) {
  const address = stripDisplayName(String(value ?? "")).toLowerCase();
  return isDomainAddress(address) ? address : fallback;
}

function parseCsvEmails(value: string | null | undefined) {
  return String(value ?? "")
    .split(",")
    .map((item) => stripDisplayName(item).trim())
    .filter(Boolean);
}

export const MAIL_DOMAIN_ASCII = MAIL_DOMAIN;
export const MAIL_DOMAIN_UNICODE = "villadünyası.com";

export const MAIL_FROM_ADDRESS = normalizeDomainAddress(
  process.env.MAIL_FROM_ADDRESS ?? process.env.NEXT_PUBLIC_FROM_EMAIL,
  DEFAULT_FROM_ADDRESS,
);

export const MAIL_FROM = `${DISPLAY_NAME} <${MAIL_FROM_ADDRESS}>`;

export const MAIL_INBOX_ADDRESS = normalizeDomainAddress(
  process.env.MAIL_INBOX_ADDRESS,
  DEFAULT_INBOX_ADDRESS,
);

export const ADMIN_NOTIFICATION_RECIPIENTS = parseCsvEmails(process.env.ADMIN_EMAILS).filter(
  (email) => email.includes("@"),
);

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "http://localhost:3000"
).replace(/\/$/, "");
