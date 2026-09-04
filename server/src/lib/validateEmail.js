const dns = require('dns').promises;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Format check plus a DNS lookup confirming the domain actually has mail
 * servers configured — catches typos (gmial.con) and made-up domains
 * without sending any email or adding a step for the user. DNS lookups
 * are a completely different, never-blocked kind of network request from
 * the SMTP ports Render blocks on its free tier (see email.service.js).
 */
async function isValidEmail(email) {
  if (!email || !EMAIL_RE.test(email)) return false;

  const domain = email.split('@')[1];
  try {
    const mxRecords = await dns.resolveMx(domain);
    if (mxRecords.length > 0) return true;
  } catch {
    // ENOTFOUND / ENODATA — domain doesn't exist or has no mail servers.
    // Fall through to the A-record fallback below.
  }

  // Some (rare, mostly legacy) domains accept mail without an MX record,
  // falling back to their A/AAAA record instead — still worth allowing.
  try {
    await dns.resolve4(domain);
    return true;
  } catch {
    return false;
  }
}

module.exports = { isValidEmail };
