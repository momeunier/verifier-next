import dns from "dns";
import { promisify } from "util";
import punycode from "punycode";
import { logStep } from "./logging";
import { SMTP_PROXY, FEATURES } from "./config";
import { testSMTPViaProxy } from "./smtpProxy";
import { testSMTPDirect } from "./smtpDirect";

const resolveMx = promisify(dns.resolveMx);
const resolveTxt = promisify(dns.resolveTxt);
const resolve4 = promisify(dns.resolve4);

// Common RBL providers
const RBL_PROVIDERS = [
  "zen.spamhaus.org",
  "bl.spamcop.net",
  "dnsbl.sorbs.net",
  "b.barracudacentral.org",
];

// Check if an IP is listed in RBL
const checkRBL = async (ip, rblProvider) => {
  const reversedIp = ip.split(".").reverse().join(".");
  const lookupDomain = `${reversedIp}.${rblProvider}`;

  try {
    await resolve4(lookupDomain);
    return true; // Listed in RBL
  } catch (error) {
    return false; // Not listed
  }
};

// Main SMTP test function that decides whether to use proxy or direct connection
const testSMTPConnection = async (host, domain, port = 25) => {
  if (SMTP_PROXY.enabled) {
    logStep("info", "Using SMTP proxy for connection test", {
      proxyUrl: SMTP_PROXY.url,
      host,
      domain,
    });
    return testSMTPViaProxy(domain); // Send the domain instead of host
  } else if (FEATURES.useDirectSMTP) {
    logStep("info", "Using direct connection for SMTP test");
    return testSMTPDirect(host, port);
  } else {
    logStep(
      "info",
      "SMTP testing disabled - no proxy configured and direct testing not allowed"
    );
    return {
      connected: false,
      sessionLog: [
        {
          step: "info",
          data: "SMTP testing disabled - configure proxy or enable direct testing",
          timestamp: new Date().toISOString(),
        },
      ],
      proxyUsed: false,
    };
  }
};

// Get MX records without testing connectivity
export const getMXRecords = async (domain) => {
  try {
    const mxRecords = await resolveMx(domain);
    if (!mxRecords || mxRecords.length === 0) {
      return {
        isValid: false,
        details: {
          error: "No MX records found",
        },
      };
    }

    // Get IP addresses for each MX record
    const results = await Promise.all(
      mxRecords.map(async (mx) => {
        const host = mx.exchange;
        let ips = [];
        try {
          ips = await resolve4(host);
        } catch (error) {
          logStep("warn", `Failed to resolve IPs for ${host}`, error.message);
        }

        return {
          host,
          priority: mx.priority,
          ips,
        };
      })
    );

    return {
      isValid: true,
      details: {
        exchangers: results.sort((a, b) => a.priority - b.priority),
        totalExchangers: mxRecords.length,
      },
    };
  } catch (error) {
    logStep("error", "MX record lookup failed", error.message);
    return {
      isValid: false,
      details: { error: error.message },
    };
  }
};

export const validateMailExchangers = async (domain) => {
  try {
    const mxRecords = await resolveMx(domain);
    if (!mxRecords || mxRecords.length === 0) {
      return {
        isValid: false,
        confidence: 0,
        factors: {},
        details: {
          error: "No MX records found",
          sessionLogs: [],
        },
      };
    }

    const results = await Promise.all(
      mxRecords.map(async (mx) => {
        const host = mx.exchange;

        // Test SMTP connection with session logging
        const {
          connected: canConnect,
          sessionLog,
          ip,
          proxyUsed,
        } = await testSMTPConnection(host, domain);

        // Get IP addresses for RBL checks
        let ips = [];
        if (proxyUsed) {
          // If using proxy, only use the IP returned by the proxy
          ips = ip ? [ip] : [];
          logStep("debug", "Using proxy-provided IP for RBL checks", { ip });
        } else {
          // If direct connection, resolve IPs
          try {
            ips = await resolve4(host);
            logStep("debug", "Resolved IPs for RBL checks", { ips });
          } catch (error) {
            logStep("warn", "Failed to resolve IPs for RBL checks", {
              error: error.message,
            });
          }
        }

        // Check RBLs for each IP
        const rblResults = await Promise.all(
          ips.flatMap(async (ip) =>
            Promise.all(
              RBL_PROVIDERS.map(async (rbl) => ({
                ip,
                rbl,
                listed: await checkRBL(ip, rbl),
              }))
            )
          )
        );

        const blacklistedCount = rblResults
          .flat()
          .filter((r) => r.listed).length;
        const totalChecks = ips.length * RBL_PROVIDERS.length;
        const rblScore =
          totalChecks > 0 ? 1 - blacklistedCount / totalChecks : 1;

        return {
          host,
          canConnect,
          ips,
          rblScore,
          blacklistedDetails: rblResults.flat().filter((r) => r.listed),
          sessionLog,
          priority: mx.priority,
          proxyUsed,
        };
      })
    );

    // Calculate confidence factors
    const factors = {
      hasMultipleMX: mxRecords.length > 1 ? 0.2 : 0,
      canConnect: results.some((r) => r.canConnect) ? 0.4 : 0,
      notBlacklisted: Math.min(...results.map((r) => r.rblScore)) * 0.4,
    };

    const confidence = Object.values(factors).reduce(
      (sum, score) => sum + score,
      0
    );

    return {
      isValid: results.some((r) => r.canConnect && r.rblScore > 0.5),
      confidence,
      factors,
      details: {
        exchangers: results.sort((a, b) => a.priority - b.priority),
        totalExchangers: mxRecords.length,
        workingExchangers: results.filter((r) => r.canConnect).length,
        proxyEnabled: SMTP_PROXY.enabled,
        directTestingEnabled: FEATURES.useDirectSMTP,
      },
    };
  } catch (error) {
    return {
      isValid: false,
      confidence: 0,
      factors: {},
      details: { error: error.message },
    };
  }
};

export const validateInternationalizedEmail = (email) => {
  logStep("info", "Starting internationalization validation for:", email);

  const [localPart, domain] = email.split("@");
  logStep("info", "Parsed email parts", JSON.stringify({ localPart, domain }));

  // Check if domain needs Punycode encoding
  const needsPunycode = domain !== punycode.toASCII(domain);
  logStep(
    "info",
    "Domain punycode check",
    JSON.stringify({
      domain,
      punycodeVersion: punycode.toASCII(domain),
      needsPunycode,
    })
  );

  // Check if local part has non-ASCII characters
  const hasNonAsciiLocal = /[^\x00-\x7F]/.test(localPart);
  logStep(
    "info",
    "Local part ASCII check",
    JSON.stringify({
      localPart,
      hasNonAsciiLocal,
      pattern: "[^\\x00-\\x7F]",
    })
  );

  const factors = {
    asciiLocalPart: !hasNonAsciiLocal ? 1.0 : 0,
    asciiDomain: !needsPunycode ? 1.0 : 0.5,
  };

  const confidence =
    Object.values(factors).reduce((sum, score) => sum + score, 0) / 2;

  const isValid = true; // All ASCII emails are valid from an internationalization perspective

  const result = {
    isValid,
    confidence,
    factors,
    details: {
      hasNonAsciiLocal,
      needsPunycode,
      punycodeDomain: needsPunycode ? punycode.toASCII(domain) : domain,
      originalDomain: domain,
    },
  };

  logStep(
    "info",
    "Internationalization validation result",
    JSON.stringify(result)
  );

  return result;
};
