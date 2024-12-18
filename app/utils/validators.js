import dns from "dns";
import { promisify } from "util";

const resolveMx = promisify(dns.resolveMx);

export const validateFormat = (email) => {
  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  const strictEmailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  // Confidence factors
  const factors = {
    basicFormat: emailRegex.test(email) ? 0.5 : 0,
    strictFormat: strictEmailRegex.test(email) ? 0.3 : 0,
    noSpecialChars: !/[(),:;<>[\]\\]/.test(email) ? 0.2 : 0,
  };

  const confidence = Object.values(factors).reduce(
    (sum, score) => sum + score,
    0
  );

  return {
    isValid: emailRegex.test(email),
    confidence,
    factors,
  };
};

export const validateLength = (email) => {
  const [localPart] = email.split("@");
  const isValid = localPart.length <= 64 && email.length <= 254;

  // Confidence factors based on length best practices
  const factors = {
    localLength: (() => {
      if (localPart.length <= 32) return 0.4; // Most common length
      if (localPart.length <= 48) return 0.3;
      if (localPart.length <= 64) return 0.2;
      return 0;
    })(),
    totalLength: (() => {
      if (email.length <= 50) return 0.4; // Most common total length
      if (email.length <= 100) return 0.3;
      if (email.length <= 254) return 0.2;
      return 0;
    })(),
    notTooShort: localPart.length >= 3 ? 0.2 : 0, // Very short local parts are suspicious
  };

  const confidence = Object.values(factors).reduce(
    (sum, score) => sum + score,
    0
  );

  return {
    isValid,
    confidence,
    factors,
    localLength: localPart.length,
    totalLength: email.length,
  };
};

export const validateLocalPart = (email) => {
  const [localPart] = email.split("@");
  const localPartRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/;
  const noConsecutiveDots = !/\.{2,}/.test(localPart);
  const noStartEndDots = !localPart.startsWith(".") && !localPart.endsWith(".");

  // Confidence factors
  const factors = {
    validChars: localPartRegex.test(localPart) ? 0.3 : 0,
    noConsecutiveDots: noConsecutiveDots ? 0.2 : 0,
    noStartEndDots: noStartEndDots ? 0.2 : 0,
    simpleFormat: /^[a-zA-Z0-9]+[._%+-]*[a-zA-Z0-9]+$/.test(localPart)
      ? 0.2
      : 0, // Common format
    notAllNumbers: !/^\d+$/.test(localPart) ? 0.1 : 0, // All-number local parts are suspicious
  };

  const confidence = Object.values(factors).reduce(
    (sum, score) => sum + score,
    0
  );

  return {
    isValid:
      localPartRegex.test(localPart) && noConsecutiveDots && noStartEndDots,
    confidence,
    factors,
    issues: {
      hasInvalidChars: !localPartRegex.test(localPart),
      hasConsecutiveDots: !noConsecutiveDots,
      startsOrEndsWithDot: !noStartEndDots,
    },
  };
};

export const validateDomain = (email) => {
  const [, domain] = email.split("@");
  const domainRegex =
    /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  const hasTld = domain.includes(".");

  // Common TLDs get higher confidence
  const commonTlds = new Set([
    "com",
    "org",
    "net",
    "edu",
    "gov",
    "mil",
    "co.uk",
    "co.jp",
    "co.nz",
    "com.au",
    "de",
    "fr",
    "it",
    "es",
    "ca",
  ]);

  const tld = domain.split(".").slice(-1)[0].toLowerCase();
  const secondLevel = domain.split(".").slice(-2)[0].toLowerCase();

  // Confidence factors
  const factors = {
    validFormat: domainRegex.test(domain) ? 0.2 : 0,
    hasTld: hasTld ? 0.2 : 0,
    commonTld:
      commonTlds.has(tld) || commonTlds.has(`${secondLevel}.${tld}`) ? 0.3 : 0,
    properLength: domain.length >= 4 && domain.length <= 50 ? 0.2 : 0,
    noConsecutiveHyphens: !/--/.test(domain) ? 0.1 : 0,
  };

  const confidence = Object.values(factors).reduce(
    (sum, score) => sum + score,
    0
  );

  return {
    isValid: domainRegex.test(domain) && hasTld,
    confidence,
    factors,
    domain,
  };
};

export const validateRole = (email) => {
  const [localPart] = email.split("@");
  const commonRoles = new Set([
    "admin",
    "administrator",
    "info",
    "support",
    "contact",
    "sales",
    "marketing",
    "help",
    "no-reply",
    "noreply",
    "webmaster",
    "postmaster",
  ]);

  const localLower = localPart.toLowerCase();
  const isExactRole = commonRoles.has(localLower);
  const containsRole = Array.from(commonRoles).some((role) =>
    localLower.includes(role)
  );

  // Confidence factors
  const factors = {
    notExactRole: !isExactRole ? 0.6 : 0,
    notContainsRole: !containsRole ? 0.4 : 0,
  };

  const confidence = Object.values(factors).reduce(
    (sum, score) => sum + score,
    0
  );

  return {
    isValid: !containsRole,
    confidence,
    factors,
    detectedRole: containsRole ? localPart : null,
  };
};

export const validateDNS = async (email) => {
  const [, domain] = email.split("@");
  try {
    const records = await resolveMx(domain);

    // Confidence factors
    const factors = {
      hasMxRecords: records.length > 0 ? 0.4 : 0,
      multipleRecords: records.length > 1 ? 0.3 : 0, // Redundancy is good
      highPriorityRecord: records.some((r) => r.priority <= 10) ? 0.2 : 0,
      wellKnownProvider: records.some((r) => {
        const mxDomain = r.exchange.toLowerCase();
        return (
          mxDomain.includes("google") ||
          mxDomain.includes("outlook") ||
          mxDomain.includes("microsoft") ||
          mxDomain.includes("proton") ||
          mxDomain.includes("yahoo") ||
          mxDomain.includes("mail")
        );
      })
        ? 0.1
        : 0,
    };

    const confidence = Object.values(factors).reduce(
      (sum, score) => sum + score,
      0
    );

    return {
      isValid: records.length > 0,
      confidence,
      factors,
      records,
    };
  } catch (error) {
    return {
      isValid: false,
      confidence: 0,
      factors: {},
      error: error.message,
    };
  }
};
