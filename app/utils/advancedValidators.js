import { promisify } from "util";
import dns from "dns";
import { reputableDomains } from "./reputableDomains";
import {
  getDisposableDomains,
  getIanaTlds,
  getCachedDomainRecords,
  cacheDomainRecords,
} from "./listManager";

const resolveTxt = promisify(dns.resolveTxt);
const resolve4 = promisify(dns.resolve4);

const isReputableDomain = (domain) => {
  return domain.toLowerCase() in reputableDomains;
};

const getReputableDomainInfo = (domain) => {
  return reputableDomains[domain.toLowerCase()];
};

// Normalize email address by handling plus addressing
const normalizeEmail = (email) => {
  const [localPart, domain] = email.toLowerCase().split("@");
  const reputableInfo = reputableDomains[domain];
  const hasPlus = localPart.includes("+");
  const plusPart = hasPlus ? localPart.split("+")[1] : null;
  const normalizedLocalPart = hasPlus ? localPart.split("+")[0] : localPart;

  return {
    original: email,
    normalized: `${normalizedLocalPart}@${domain}`,
    hasPlus,
    plusPart,
    provider: reputableInfo?.provider || null,
  };
};

export const validatePlusAddressing = async (email) => {
  const { normalized, hasPlus, plusPart } = normalizeEmail(email);
  const [localPart, domain] = normalized.split("@");

  // If there's no plus, we return null for confidence to indicate this check should be ignored
  if (!hasPlus) {
    return {
      isValid: true, // Not having plus addressing doesn't make it invalid
      confidence: null, // Null confidence means this won't affect the overall score
      factors: {
        hasPlus: 0,
      },
      details: {
        hasPlus,
        plusPart: null,
        normalizedAddress: normalized,
        originalAddress: email,
      },
    };
  }

  // If there is plus addressing, we give it full confidence
  return {
    isValid: true,
    confidence: 1.0, // 100% confidence when plus addressing is used
    factors: {
      hasPlus: 1.0,
      hasPlusPart: plusPart ? 1.0 : 0,
    },
    details: {
      hasPlus,
      plusPart,
      normalizedAddress: normalized,
      originalAddress: email,
      tag: plusPart, // The tracking tag used
    },
  };
};

export const validateReputableProvider = async (email) => {
  const { normalized, provider } = normalizeEmail(email);
  const [, domain] = normalized.split("@");
  const isReputable = isReputableDomain(domain);
  const reputableInfo = isReputable ? getReputableDomainInfo(domain) : null;

  // If not reputable, return null confidence to ignore this check
  if (!isReputable) {
    return {
      isValid: true, // Not being from a major provider doesn't make it invalid
      confidence: null, // Null confidence means this won't affect the overall score
      factors: {
        isReputableProvider: 0,
      },
      details: {
        provider: null,
        domain,
      },
    };
  }

  return {
    isValid: true,
    confidence: 1.0, // 100% confidence when it's a reputable provider
    factors: {
      isReputableProvider: 1.0,
      reputation: reputableInfo.reputation || 1.0,
    },
    details: {
      provider: reputableInfo.provider,
      domain,
      type: reputableInfo.type,
      features: reputableInfo.features,
    },
  };
};

export const validateDisposable = async (email) => {
  const { normalized } = normalizeEmail(email);
  const [, domain] = normalized.split("@");
  const disposableDomains = await getDisposableDomains();
  const isDomainDisposable = disposableDomains.has(domain);

  // Log for debugging
  console.log("Disposable check for domain:", domain);
  console.log("Is in disposable list:", isDomainDisposable);
  console.log("Disposable list size:", disposableDomains.size);

  // Simple confidence: 1.0 if not disposable, 0 if disposable
  const confidence = isDomainDisposable ? 0 : 1.0;

  return {
    isValid: !isDomainDisposable,
    confidence,
    factors: {
      notInDisposableList: !isDomainDisposable ? 1.0 : 0,
    },
    details: {
      isDomainDisposable,
      domain,
    },
  };
};

export const validateEmailSecurity = async (domain) => {
  const isReputable = isReputableDomain(domain);
  const reputableInfo = isReputable ? getReputableDomainInfo(domain) : null;

  try {
    // Check cache first
    const cachedRecords = await getCachedDomainRecords(domain);
    if (cachedRecords) {
      return cachedRecords;
    }

    if (isReputable) {
      const result = {
        isValid: true,
        confidence: reputableInfo.reputation,
        factors: {
          isReputableProvider: reputableInfo.reputation,
          hasExpectedSecurity: 0.1,
        },
        details: {
          spf: "Verified Provider",
          dmarc: "Verified Provider",
          dkim: true,
          provider: reputableInfo.provider,
        },
      };
      await cacheDomainRecords(domain, result);
      return result;
    }

    // Regular security checks for non-reputable domains
    let spfRecord = null;
    try {
      const txtRecords = await resolveTxt(domain);
      spfRecord = txtRecords
        .flat()
        .find((record) => record.startsWith("v=spf1"));
    } catch (error) {
      // SPF record not found
    }

    let dmarcRecord = null;
    try {
      const dmarcRecords = await resolveTxt(`_dmarc.${domain}`);
      dmarcRecord = dmarcRecords
        .flat()
        .find((record) => record.startsWith("v=DMARC1"));
    } catch (error) {
      // DMARC record not found
    }

    let dkimRecord = null;
    const commonSelectors = ["default", "google", "k1", "selector1", "mail"];
    for (const selector of commonSelectors) {
      try {
        const dkimRecords = await resolveTxt(
          `${selector}._domainkey.${domain}`
        );
        if (dkimRecords.length > 0) {
          dkimRecord = dkimRecords[0];
          break;
        }
      } catch (error) {
        continue;
      }
    }

    const factors = {
      hasSpf: spfRecord ? 0.3 : 0,
      hasDmarc: dmarcRecord ? 0.4 : 0,
      hasDkim: dkimRecord ? 0.3 : 0,
    };

    if (spfRecord) {
      factors.spfStrict = spfRecord.includes("-all") ? 0.1 : 0;
    }
    if (dmarcRecord) {
      factors.dmarcStrict = dmarcRecord.includes("p=reject")
        ? 0.1
        : dmarcRecord.includes("p=quarantine")
        ? 0.05
        : 0;
    }

    const confidence = Object.values(factors).reduce(
      (sum, score) => sum + score,
      0
    );
    const normalizedConfidence = Math.min(confidence, 1);

    const result = {
      isValid:
        spfRecord !== null || dmarcRecord !== null || dkimRecord !== null,
      confidence: normalizedConfidence,
      factors,
      details: {
        spf: spfRecord || null,
        dmarc: dmarcRecord || null,
        dkim: dkimRecord ? true : false,
      },
    };

    // Cache the results
    await cacheDomainRecords(domain, result);
    return result;
  } catch (error) {
    return {
      isValid: false,
      confidence: 0,
      factors: {},
      error: error.message,
    };
  }
};

export const validateDomainAge = async (domain) => {
  const isReputable = isReputableDomain(domain);
  const reputableInfo = isReputable ? getReputableDomainInfo(domain) : null;
  const ianaTlds = await getIanaTlds();

  try {
    // Check if TLD is valid
    const tld = domain.split(".").pop().toLowerCase();
    const hasTld = ianaTlds.has(tld);

    if (!hasTld) {
      return {
        isValid: false,
        confidence: 0,
        factors: {
          invalidTld: 0,
        },
        details: {
          error: "Invalid TLD",
        },
      };
    }

    if (isReputable) {
      return {
        isValid: true,
        confidence: reputableInfo.reputation,
        factors: {
          isReputableProvider: reputableInfo.reputation,
          wellEstablished: 0.1,
          validTld: 0.1,
        },
        details: {
          hasIp: true,
          hasWww: true,
          hasMailSubdomain: true,
          provider: reputableInfo.provider,
        },
      };
    }

    // Check cache first
    const cacheKey = `domain:age:${domain}`;
    const cachedResult = await getCachedDomainRecords(domain);
    if (cachedResult) {
      return cachedResult;
    }

    // Regular checks for non-reputable domains
    let hasIp = false;
    try {
      await resolve4(domain);
      hasIp = true;
    } catch (error) {
      // No A record
    }

    let hasWww = false;
    try {
      await resolve4(`www.${domain}`);
      hasWww = true;
    } catch (error) {
      // No www record
    }

    let hasMailSubdomain = false;
    try {
      await resolve4(`mail.${domain}`);
      hasMailSubdomain = true;
    } catch (error) {
      // No mail subdomain
    }

    const factors = {
      hasIpAddress: hasIp ? 0.4 : 0,
      hasWwwSubdomain: hasWww ? 0.3 : 0,
      hasMailSubdomain: hasMailSubdomain ? 0.3 : 0,
      validTld: hasTld ? 0.2 : 0,
      domainStructure:
        /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/.test(domain)
          ? 0.2
          : 0,
    };

    const confidence = Object.values(factors).reduce(
      (sum, score) => sum + score,
      0
    );
    const normalizedConfidence = Math.min(confidence, 1);

    const result = {
      isValid: hasIp && hasTld,
      confidence: normalizedConfidence,
      factors,
      details: {
        hasIp,
        hasWww,
        hasMailSubdomain,
        tld,
      },
    };

    // Cache the results
    await cacheDomainRecords(domain, result);
    return result;
  } catch (error) {
    return {
      isValid: false,
      confidence: 0,
      factors: {},
      error: error.message,
    };
  }
};
