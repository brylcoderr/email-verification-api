const dns = require('dns').promises;

// ── Regex ────────────────────────────────────────────────────────────────────
// RFC 5322-inspired, practical regex (not full RFC but catches real-world issues)
const EMAIL_REGEX =
  /^(?:[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-zA-Z0-9-]*[a-zA-Z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/;

// ── Disposable email domains list ────────────────────────────────────────────
// A curated starter set — extend as needed or load from a file
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com','guerrillamail.com','guerrillamail.net','guerrillamail.org',
  'guerrillamail.de','guerrillamail.info','grr.la','sharklasers.com','guerrillamailblock.com',
  'spam4.me','yopmail.com','yopmail.fr','cool.fr.nf','jetable.fr.nf','nospam.ze.tc',
  'nomail.xl.cx','mega.zik.dj','speed.1s.fr','courriel.fr.nf','moncourrier.fr.nf',
  'monemail.fr.nf','monmail.fr.nf','tempmail.com','temp-mail.org','dispostable.com',
  'maildrop.cc','trashmail.com','trashmail.me','trashmail.at','discard.email',
  'fakeinbox.com','throwam.com','spamgourmet.com','getairmail.com','filzmail.com',
  'throwam.com','owlpic.com','tempinbox.com','mailnull.com','spamgourmet.org',
  'spamgourmet.net','trashmail.io','getnada.com','mailnesia.com','spamex.com',
  'mytrashmail.com','mintemail.com','trashmail.net','tempr.email','discard.email',
  '10minutemail.com','10minutemail.net','10minutemail.org','10minutemail.de',
  '20minutemail.com','tempsky.com','mailtemp.info','sharklasers.com',
  'inboxkitten.com','burnermail.io','throwaway.email','spamwc.de','spamdecoy.net',
  'binkmail.com','bobmail.info','chammy.info','devnullmail.com','letthemeatspam.com',
  'mailinater.com','reallymymail.com','reconmail.com','safetymail.info','sendspamhere.com',
  'shieldedmail.com','spamavert.com','spamherelots.com','spamhereplease.com',
  'spamthis.co.uk','supergreatmail.com','thelimestones.com','throthingmail.com',
  'trashdevil.com','trashdevil.de','tyldd.com','yomail.info','zippymail.info',
  'spambog.com','tempail.com','nwldx.com',
]);

// ── Role-based local parts ────────────────────────────────────────────────────
const ROLE_BASED = new Set([
  'admin','administrator','abuse','billing','compliance','contact',
  'cto','ceo','cfo','customer','customerservice','dns','ftp','hello',
  'help','helpdesk','hostmaster','info','it','jobs','legal','mailer-daemon',
  'marketing','media','news','newsletter','nobody','noc','noreply','no-reply',
  'noresponder','office','ops','operations','postmaster','press','privacy',
  'recruitment','register','root','sales','security','service','services',
  'spam','support','sysadmin','tech','test','usenet','webmaster','www',
]);

// ── Free webmail providers ────────────────────────────────────────────────────
const FREE_PROVIDERS = new Set([
  'gmail.com','googlemail.com','yahoo.com','yahoo.co.uk','yahoo.fr','yahoo.es',
  'yahoo.de','yahoo.it','yahoo.co.in','outlook.com','hotmail.com','hotmail.co.uk',
  'hotmail.fr','hotmail.de','hotmail.es','hotmail.it','live.com','msn.com',
  'icloud.com','me.com','mac.com','aol.com','protonmail.com','protonmail.ch',
  'proton.me','pm.me','tutanota.com','tutanota.de','tuta.io','zoho.com',
  'yandex.com','yandex.ru','mail.ru','gmx.com','gmx.de','gmx.net',
  'web.de','libero.it','virgilio.it','orange.fr','laposte.net','free.fr',
  'sfr.fr','wanadoo.fr','comcast.net','verizon.net','att.net','cox.net',
  'earthlink.net','optonline.net','bellsouth.net','charter.net','rediffmail.com',
  'sina.com','163.com','126.com','qq.com','foxmail.com','naver.com',
  'daum.net','hanmail.net',
]);

// ── Typo suggestions for common domains ─────────────────────────────────────
const COMMON_TYPOS = {
  'gnail.com': 'gmail.com', 'gmaill.com': 'gmail.com', 'gamil.com': 'gmail.com',
  'gmal.com': 'gmail.com', 'gmil.com': 'gmail.com', 'gmail.co': 'gmail.com',
  'gmail.cm': 'gmail.com', 'gmail.con': 'gmail.com', 'gmail.cpm': 'gmail.com',
  'hotmil.com': 'hotmail.com', 'hotmal.com': 'hotmail.com', 'hotmai.com': 'hotmail.com',
  'hotmail.co': 'hotmail.com', 'hotmall.com': 'hotmail.com',
  'outlok.com': 'outlook.com', 'outllok.com': 'outlook.com', 'outlookk.com': 'outlook.com',
  'yahooo.com': 'yahoo.com', 'yhoo.com': 'yahoo.com', 'yahoo.co': 'yahoo.com',
  'yaho.com': 'yahoo.com', 'yaoo.com': 'yahoo.com',
  'iclod.com': 'icloud.com', 'icoud.com': 'icloud.com',
};

// ── MX lookup with timeout ────────────────────────────────────────────────────
async function getMxRecords(domain) {
  try {
    const records = await Promise.race([
      dns.resolveMx(domain),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('DNS timeout')), 5000)
      ),
    ]);
    return records.sort((a, b) => a.priority - b.priority);
  } catch {
    return null;
  }
}

// ── Main validator ────────────────────────────────────────────────────────────
async function validateEmail(email) {
  const startedAt = Date.now();
  const result = {
    email,
    valid: false,
    score: 0,           // 0–100 quality score
    checks: {
      syntax: false,
      mxRecords: false,
      notDisposable: false,
      notRoleBased: false,
    },
    meta: {
      local: null,
      domain: null,
      isFreeProvider: false,
      isDisposable: false,
      isRoleBased: false,
      mxRecords: [],
      suggestion: null,
    },
    error: null,
    latencyMs: null,
  };

  // ── 1. Basic structure ─────────────────────────────────────────────────────
  if (!email || typeof email !== 'string') {
    result.error = 'Email must be a non-empty string.';
    result.latencyMs = Date.now() - startedAt;
    return result;
  }

  if (email.length > 320) {
    result.error = 'Email address exceeds maximum length of 320 characters.';
    result.latencyMs = Date.now() - startedAt;
    return result;
  }

  // ── 2. Split parts ─────────────────────────────────────────────────────────
  const atIndex = email.lastIndexOf('@');
  if (atIndex < 1) {
    result.error = 'Email must contain an @ symbol.';
    result.latencyMs = Date.now() - startedAt;
    return result;
  }

  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1).toLowerCase();
  result.meta.local = local;
  result.meta.domain = domain;

  if (local.length > 64) {
    result.error = 'Local part exceeds maximum length of 64 characters.';
    result.latencyMs = Date.now() - startedAt;
    return result;
  }

  // ── 3. Syntax check ────────────────────────────────────────────────────────
  result.checks.syntax = EMAIL_REGEX.test(email);

  // ── 4. Typo suggestion ─────────────────────────────────────────────────────
  if (COMMON_TYPOS[domain]) {
    result.meta.suggestion = `${local}@${COMMON_TYPOS[domain]}`;
  }

  // ── 5. Disposable check ────────────────────────────────────────────────────
  result.meta.isDisposable = DISPOSABLE_DOMAINS.has(domain);
  result.checks.notDisposable = !result.meta.isDisposable;

  // ── 6. Role-based check ────────────────────────────────────────────────────
  result.meta.isRoleBased = ROLE_BASED.has(local.toLowerCase());
  result.checks.notRoleBased = !result.meta.isRoleBased;

  // ── 7. Free provider check ─────────────────────────────────────────────────
  result.meta.isFreeProvider = FREE_PROVIDERS.has(domain);

  // ── 8. MX record lookup ────────────────────────────────────────────────────
  if (result.checks.syntax) {
    const mx = await getMxRecords(domain);
    if (mx && mx.length > 0) {
      result.checks.mxRecords = true;
      result.meta.mxRecords = mx.map((r) => ({ exchange: r.exchange, priority: r.priority }));
    }
  }

  // ── 9. Validity decision ───────────────────────────────────────────────────
  result.valid =
    result.checks.syntax && result.checks.mxRecords && !result.meta.isDisposable;

  // ── 10. Quality score (0-100) ─────────────────────────────────────────────
  let score = 0;
  if (result.checks.syntax)        score += 30;
  if (result.checks.mxRecords)     score += 35;
  if (result.checks.notDisposable) score += 20;
  if (result.checks.notRoleBased)  score += 10;
  if (!result.meta.isFreeProvider) score += 5;
  result.score = score;

  result.latencyMs = Date.now() - startedAt;
  return result;
}

module.exports = { validateEmail };
