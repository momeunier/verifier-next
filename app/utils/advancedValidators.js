import { promisify } from "util";
import dns from "dns";
import { reputableDomains } from "./reputableDomains";
import {
  getDisposableDomains,
  getIanaTlds,
  getCachedDomainRecords,
  cacheDomainRecords,
} from "./listManager";
import { logStep } from "./logging";

const resolveTxt = promisify(dns.resolveTxt);
const resolve4 = promisify(dns.resolve4);
const resolveMx = promisify(dns.resolveMx);

// Check if a domain exists by verifying DNS records
const domainExists = async (domain) => {
  try {
    // Try to get MX records first (most reliable for email domains)
    try {
      const mxRecords = await resolveMx(domain);
      if (mxRecords && mxRecords.length > 0) {
        return true;
      }
    } catch (error) {
      // No MX records, continue checking other record types
    }

    // Try to get A records as fallback
    try {
      const aRecords = await resolve4(domain);
      if (aRecords && aRecords.length > 0) {
        return true;
      }
    } catch (error) {
      // No A records either
    }

    // If no MX or A records found, domain doesn't exist or can't receive email
    return false;
  } catch (error) {
    console.error("Error checking domain existence:", error);
    return false;
  }
};

// Normalize email address by handling plus addressing
const normalizeEmail = async (email) => {
  const [localPart, domain] = email.toLowerCase().split("@");

  // Killer criteria: Domain must exist
  const exists = await domainExists(domain);
  if (!exists) {
    return {
      original: email,
      normalized: null,
      hasPlus: false,
      plusPart: null,
      provider: null,
      exists: false,
    };
  }

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
    exists: true,
  };
};

export const validatePlusAddressing = async (email) => {
  const normalizedResult = await normalizeEmail(email);

  // Killer criteria: Domain must exist
  if (!normalizedResult.exists) {
    return {
      isValid: false,
      confidence: 0,
      factors: {
        domainExists: 0,
      },
      details: {
        error: "Domain does not exist",
        originalAddress: email,
      },
    };
  }

  const { normalized, hasPlus, plusPart } = normalizedResult;

  // If there's no plus, we return null for confidence to indicate this check should be ignored
  if (!hasPlus) {
    return {
      isValid: true,
      confidence: null,
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

  return {
    isValid: true,
    confidence: 1.0,
    factors: {
      hasPlus: 1.0,
      hasPlusPart: plusPart ? 1.0 : 0,
      domainExists: 1.0,
    },
    details: {
      hasPlus,
      plusPart,
      normalizedAddress: normalized,
      originalAddress: email,
      tag: plusPart,
    },
  };
};

export const validateReputableProvider = async (email) => {
  const normalizedResult = await normalizeEmail(email);

  // Killer criteria: Domain must exist
  if (!normalizedResult.exists) {
    return {
      isValid: false,
      confidence: 0,
      factors: {
        domainExists: 0,
      },
      details: {
        error: "Domain does not exist",
        originalAddress: email,
      },
    };
  }

  const { normalized, provider } = normalizedResult;
  const [, domain] = normalized.split("@");
  const isReputable = domain in reputableDomains;
  const reputableInfo = isReputable ? reputableDomains[domain] : null;

  if (!isReputable) {
    return {
      isValid: true,
      confidence: null,
      factors: {
        isReputableProvider: 0,
        domainExists: 1.0,
      },
      details: {
        provider: null,
        domain,
      },
    };
  }

  return {
    isValid: true,
    confidence: 1.0,
    factors: {
      isReputableProvider: 1.0,
      reputation: reputableInfo.reputation || 1.0,
      domainExists: 1.0,
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
  const normalizedResult = await normalizeEmail(email);

  logStep("info", `Starting disposable check for: ${email}`);

  // Killer criteria: Domain must exist
  if (!normalizedResult.exists) {
    logStep("error", "Domain does not exist", email);
    return {
      isValid: false,
      confidence: 0,
      factors: {
        domainExists: 0,
      },
      details: {
        error: "Domain does not exist",
        originalAddress: email,
      },
    };
  }

  const { normalized } = normalizedResult;
  const [, domain] = normalized.split("@");
  const disposableDomains = await getDisposableDomains();
  const isDomainDisposable = disposableDomains.has(domain);

  logStep(
    "info",
    `Checking domain: ${domain}`,
    `In disposable list: ${isDomainDisposable}`
  );
  logStep("debug", `Disposable domains list size: ${disposableDomains.size}`);

  const confidence = isDomainDisposable ? 0 : 1.0;
  const result = {
    isValid: !isDomainDisposable,
    confidence,
    factors: {
      notInDisposableList: !isDomainDisposable ? 1.0 : 0,
      domainExists: 1.0,
    },
    details: {
      isDomainDisposable,
      domain,
    },
  };

  logStep("info", `Disposable check result`, JSON.stringify(result));
  return result;
};

// Helper functions for reputable domain checking
const isReputableDomain = (domain) => {
  return domain in reputableDomains;
};

const getReputableDomainInfo = (domain) => {
  return reputableDomains[domain] || null;
};

export const validateEmailSecurity = async (domain) => {
  logStep("info", `Starting security check for domain: ${domain}`);

  const isReputable = isReputableDomain(domain);
  const reputableInfo = isReputable ? getReputableDomainInfo(domain) : null;

  try {
    // Check cache first
    const cachedRecords = await getCachedDomainRecords(domain);
    if (cachedRecords) {
      logStep("info", "Using cached security records", domain);
      return cachedRecords;
    }

    if (isReputable) {
      logStep("info", `Domain ${domain} is reputable`, reputableInfo?.provider);
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
      logStep("info", "SPF check", spfRecord || "No SPF record found");
    } catch (error) {
      logStep("error", "SPF lookup failed", error.message);
    }

    let dmarcRecord = null;
    try {
      const dmarcRecords = await resolveTxt(`_dmarc.${domain}`);
      dmarcRecord = dmarcRecords
        .flat()
        .find((record) => record.startsWith("v=DMARC1"));
      logStep("info", "DMARC check", dmarcRecord || "No DMARC record found");
    } catch (error) {
      logStep("error", "DMARC lookup failed", error.message);
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
          logStep("info", `DKIM found with selector: ${selector}`, dkimRecord);
          break;
        }
      } catch (error) {
        logStep("debug", `No DKIM record for selector: ${selector}`);
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
    logStep("error", "Security check failed", error.message);
    return {
      isValid: false,
      confidence: 0,
      factors: {},
      error: error.message,
    };
  }
};

export const validateDomainAge = async (domain) => {
  logStep("info", `Starting domain age check for domain: ${domain}`);

  const ianaTlds = await getIanaTlds();

  try {
    // Check if TLD is valid
    const tld = domain.split(".").pop().toLowerCase();
    const hasTld = ianaTlds.has(tld);
    logStep("info", `TLD check: ${tld}`, hasTld ? "Valid" : "Invalid");

    if (!hasTld) {
      return {
        isValid: false,
        confidence: 0,
        factors: {
          invalidTld: 0,
        },
        details: {
          error: "Invalid TLD",
          errorDetails: {
            message: `The top-level domain '${tld}' is not recognized in the IANA database`,
            foundIssues: ["Invalid or unrecognized TLD"],
            recommendations: [
              "Verify the domain spelling is correct",
              "Check if the TLD is newly registered with IANA",
              "Consider using a well-established TLD like .com, .org, .net",
            ],
          },
          tld,
        },
      };
    }

    // Check domain infrastructure
    let hasIp = false;
    try {
      const ips = await resolve4(domain);
      hasIp = true;
      logStep("info", `IP check: Found ${ips.length} IP(s)`, ips);
    } catch (error) {
      logStep("error", "IP check failed", {
        error: error.message,
        code: error.code,
      });
    }

    // Calculate domain age score based on infrastructure
    const infrastructureScore = hasIp ? 0.4 : 0;

    // Note: We need to implement WHOIS lookup to get actual domain age
    // For now, we'll return a clear message about this limitation
    return {
      isValid: hasIp && hasTld,
      confidence: infrastructureScore,
      factors: {
        hasIpAddress: hasIp ? 0.4 : 0,
        validTld: hasTld ? 0.2 : 0,
      },
      details: {
        hasIp,
        tld,
        status: "Infrastructure check only",
        analysis:
          "Note: Actual domain age verification requires WHOIS data access",
        limitations: [
          "Current check only verifies domain infrastructure",
          "WHOIS data access needed for true age verification",
          "Consider implementing WHOIS lookup for complete age verification",
        ],
        recommendations: [
          "To implement full domain age verification:",
          "1. Add WHOIS data access",
          "2. Calculate age from domain creation date",
          "3. Factor age into confidence score",
        ],
      },
    };
  } catch (error) {
    logStep("error", "Domain age check failed", error.message);
    return {
      isValid: false,
      confidence: 0,
      factors: {},
      details: {
        error: "Domain age check failed",
        errorDetails: {
          message: "Unable to complete domain age verification",
          foundIssues: ["Unexpected error during domain verification"],
          recommendations: [
            "Verify the domain spelling is correct",
            "Check if the domain's DNS is properly configured",
            "Try again in a few minutes",
          ],
          technicalDetails: {
            error: error.message,
            errorCode: error.code || null,
          },
        },
      },
    };
  }
};
