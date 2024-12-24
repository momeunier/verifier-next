import { SMTP_PROXY } from "./config";
import { logStep } from "./logging";

export const testSMTPViaProxy = async (domain) => {
  try {
    logStep("info", "Testing SMTP via proxy", { domain });

    if (!SMTP_PROXY.url) {
      throw new Error("SMTP proxy URL not configured");
    }

    const url = `${SMTP_PROXY.url}/check?domain=${encodeURIComponent(domain)}`;
    logStep("debug", `Making proxy request to: ${url}`, {
      fullUrl: url,
      domain: domain,
      proxyBaseUrl: SMTP_PROXY.url,
    });

    const response = await fetch(url);
    logStep(
      "debug",
      `Proxy response status: ${response.status} ${response.statusText}`,
      {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      }
    );

    if (!response.ok) {
      throw new Error(`Proxy request failed: ${response.statusText}`);
    }

    const result = await response.json();
    logStep("debug", "Proxy response data", result);

    // Transform proxy response to match our expected format
    const transformedResult = {
      connected: result.connected,
      sessionLog: result.sessionLog || [],
      ip: result.ip,
      details: result.details,
      proxyUsed: true,
    };

    logStep("info", "SMTP proxy check completed", transformedResult);
    return transformedResult;
  } catch (error) {
    logStep("error", `SMTP proxy check failed: ${error.message}`, {
      error: error.message,
      domain: domain,
    });
    return {
      connected: false,
      sessionLog: [
        {
          step: "error",
          data: `Proxy error: ${error.message}`,
          timestamp: new Date().toISOString(),
        },
      ],
      proxyUsed: true,
    };
  }
};
