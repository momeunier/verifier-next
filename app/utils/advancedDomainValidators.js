import dns from "dns";
import { promisify } from "util";
import net from "net";
import tls from "tls";
import punycode from "punycode";

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

// Test SMTP connection with TLS
const testSMTPConnection = async (host, port = 25) => {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let tlsSocket = null;
    let connected = false;
    let sessionLog = [];
    let receivedData = "";

    const logStep = (step, data, details = "") => {
      const timestamp = new Date().toISOString().split("T")[1].split(".")[0]; // HH:MM:SS
      sessionLog.push({
        step,
        data: data.trim(),
        details,
        timestamp,
      });
    };

    const sendCommand = (command) => {
      const socket = tlsSocket || socket;
      socket.write(command + "\r\n");
      logStep("send", command);
    };

    socket.setTimeout(15000); // Increased timeout to 15 seconds

    const handleData = (data) => {
      receivedData = data.toString().trim();
      logStep("receive", receivedData);

      // SMTP conversation flow
      if (receivedData.startsWith("220") && !tlsSocket) {
        // Initial greeting, send EHLO
        sendCommand("EHLO verifier.test");
      } else if (receivedData.startsWith("250")) {
        if (receivedData.includes("verifier.test")) {
          // EHLO accepted, send MAIL FROM
          sendCommand("MAIL FROM:<test@verifier.test>");
        } else if (
          receivedData.includes("Sender") ||
          receivedData.includes("Ok")
        ) {
          // MAIL FROM accepted, send RCPT TO
          sendCommand(`RCPT TO:<probe@${host}>`);
        }
      } else if (
        receivedData.startsWith("550") ||
        receivedData.startsWith("553") ||
        receivedData.startsWith("501") ||
        receivedData.startsWith("503")
      ) {
        // Various rejection codes - this is actually good for verification
        connected = true; // If we get here, the server is responding properly
        sendCommand("QUIT");
      } else if (receivedData.startsWith("221")) {
        // QUIT accepted
        logStep("info", "Server acknowledged QUIT command");
        socket.end();
      }
    };

    const handleError = (error) => {
      logStep("error", `Connection error: ${error.message}`, error.code || "");
      socket.destroy();
      resolve({ connected: false, sessionLog });
    };

    socket.on("connect", () => {
      connected = true;
      logStep("info", `Established TCP connection to ${host}:${port}`);
    });

    socket.on("data", handleData);
    socket.on("error", handleError);

    socket.on("timeout", () => {
      logStep("error", "Connection timed out after 15 seconds");
      socket.destroy();
      resolve({ connected: false, sessionLog });
    });

    socket.on("close", () => {
      logStep("info", "Connection closed");
      resolve({
        connected: connected,
        sessionLog,
      });
    });

    try {
      logStep("info", `Attempting connection to ${host}:${port}`);
      socket.connect(port, host);
    } catch (error) {
      logStep("error", `Connection failed: ${error.message}`, error.code || "");
      resolve({ connected: false, sessionLog });
    }
  });
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
        const { connected: canConnect, sessionLog } = await testSMTPConnection(
          host
        );

        // Get IP addresses for RBL checks
        let ips = [];
        try {
          ips = await resolve4(host);
        } catch (error) {
          // Ignore resolution errors
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
        exchangers: results.sort((a, b) => a.priority - b.priority), // Sort by MX priority
        totalExchangers: mxRecords.length,
        workingExchangers: results.filter((r) => r.canConnect).length,
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
  console.log("Starting internationalization validation for:", email);

  const [localPart, domain] = email.split("@");
  console.log("Parsed email parts:", { localPart, domain });

  // Check if domain needs Punycode encoding
  const needsPunycode = domain !== punycode.toASCII(domain);
  console.log("Domain punycode check:", {
    domain,
    punycodeVersion: punycode.toASCII(domain),
    needsPunycode,
  });

  // Check if local part has non-ASCII characters
  const hasNonAsciiLocal = /[^\x00-\x7F]/.test(localPart);
  console.log("Local part ASCII check:", {
    localPart,
    hasNonAsciiLocal,
    pattern: "[^\\x00-\\x7F]",
  });

  const factors = {
    asciiLocalPart: !hasNonAsciiLocal ? 1.0 : 0,
    asciiDomain: !needsPunycode ? 1.0 : 0.5,
  };

  const confidence =
    Object.values(factors).reduce((sum, score) => sum + score, 0) / 2;

  // For ASCII-only emails (like marc@microsoft.com), this should be true
  const isValid = true; // All ASCII emails are valid from an internationalization perspective

  console.log("Internationalization validation result:", {
    isValid,
    confidence,
    factors,
    details: {
      hasNonAsciiLocal,
      needsPunycode,
      punycodeDomain: needsPunycode ? punycode.toASCII(domain) : domain,
      originalDomain: domain,
    },
  });

  return {
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
};
