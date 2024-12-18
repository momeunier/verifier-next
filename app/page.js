"use client";

import { useState, useEffect } from "react";
import { CHECK_DETAILS } from "./constants/checkDetails";

export default function Home() {
  const [email, setEmail] = useState("");
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState({});
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const [expandedChecks, setExpandedChecks] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize the service when the page loads
  useEffect(() => {
    const initializeService = async () => {
      try {
        const response = await fetch("/api/initialize");
        const data = await response.json();
        setIsInitialized(true);
      } catch (error) {
        console.error("Initialization failed:", error);
      }
    };

    initializeService();
  }, []);

  const toggleCheck = (checkType) => {
    setExpandedChecks((prev) => ({
      ...prev,
      [checkType]: !prev[checkType],
    }));
  };

  const runCheck = async (checkType) => {
    setLoading((prev) => ({ ...prev, [checkType]: true }));
    try {
      const response = await fetch(`/api/validate/${checkType}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      setResults((prev) => ({
        ...prev,
        [checkType]: { ...data, check: checkType },
      }));
    } catch (error) {
      setResults((prev) => ({
        ...prev,
        [checkType]: { error: "Failed to validate", check: checkType },
      }));
    }
    setLoading((prev) => ({ ...prev, [checkType]: false }));
  };

  const runAllChecks = () => {
    setIsProcessing(true);
    setResults({});
    setLoading({});
    Object.keys(CHECK_DETAILS).forEach((checkType) => runCheck(checkType));
  };

  const calculateProgress = () => {
    const totalChecks = Object.keys(CHECK_DETAILS).length;
    const completedChecks = Object.values(results).length;
    return (completedChecks / totalChecks) * 100;
  };

  const getResultColor = (checkType) => {
    if (!results[checkType]) return "bg-white";
    if (results[checkType].error) return "bg-white";
    return results[checkType].isValid ? "bg-green-50" : "bg-red-50";
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return "text-green-600";
    if (confidence >= 0.6) return "text-blue-600";
    if (confidence >= 0.4) return "text-yellow-600";
    return "text-red-600";
  };

  const calculateOverallConfidence = () => {
    const validChecks = Object.values(results).filter(
      (r) =>
        !r.error && typeof r.confidence === "number" && r.confidence !== null
    );
    if (validChecks.length === 0) return 0;

    const weights = {
      format: 0.15,
      length: 0.1,
      local: 0.15,
      domain: 0.2,
      role: 0.1,
      dns: 0.3,
      disposable: 0.2,
      security: 0.3,
      domainAge: 0.2,
      plusAddressing: 0.2,
    };

    let totalWeight = 0;
    const weightedSum = validChecks.reduce((sum, result) => {
      const weight = weights[result.check] || 0;
      totalWeight += weight;
      return sum + result.confidence * weight;
    }, 0);

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  };

  const renderConfidenceBar = (confidence) => {
    const width = `${Math.round(confidence * 100)}%`;
    const bgColor =
      confidence >= 0.8
        ? "bg-green-500"
        : confidence >= 0.6
        ? "bg-blue-500"
        : confidence >= 0.4
        ? "bg-yellow-500"
        : "bg-red-500";

    return (
      <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
        <div
          className={`h-2.5 rounded-full ${bgColor} transition-all duration-500`}
          style={{ width }}
        ></div>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto">
        {!isProcessing ? (
          // Initial clean UI
          <div className="min-h-screen flex flex-col items-center justify-center p-8">
            <h1 className="text-4xl font-bold mb-12 text-center text-gray-900">
              Email Validation Service
            </h1>
            <div className="w-full max-w-2xl">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (email) runAllChecks();
                }}
                className="space-y-4"
              >
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="w-full p-4 text-lg border-2 border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                />
                <button
                  type="submit"
                  disabled={!email}
                  className="w-full p-4 text-lg bg-blue-600 text-white font-medium rounded-lg shadow hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  Validate Email
                </button>
              </form>
            </div>
          </div>
        ) : (
          // Results UI
          <div className="p-8 space-y-8">
            {/* Compact header with input */}
            <div className="flex items-center justify-between gap-4 bg-white sticky top-0 z-10 py-4 border-b">
              <h1 className="text-2xl font-bold text-gray-900">
                Email Validation Service
              </h1>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (email) runAllChecks();
                }}
                className="flex gap-4 flex-1 max-w-xl"
              >
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="flex-1 p-3 border-2 border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                />
                <button
                  type="submit"
                  disabled={!email}
                  className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg shadow hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Validate
                </button>
              </form>
            </div>

            {/* Progress indicator */}
            <div className="p-6 rounded-lg border border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-gray-900">
                  {Object.keys(results).length ===
                  Object.keys(CHECK_DETAILS).length
                    ? "Validation Complete"
                    : "Validating Email"}
                </h2>
                <span className="text-sm text-gray-600">
                  {Math.round(calculateProgress())}% Complete
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="h-2.5 rounded-full bg-blue-600 transition-all duration-500"
                  style={{ width: `${calculateProgress()}%` }}
                ></div>
              </div>
              <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(CHECK_DETAILS).map(([checkType, details]) => (
                  <div
                    key={checkType}
                    className="flex items-center gap-2 text-sm"
                  >
                    {loading[checkType] ? (
                      <div className="w-4 h-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                    ) : results[checkType] ? (
                      <div
                        className={`w-4 h-4 rounded-full ${
                          results[checkType].error
                            ? "bg-red-500"
                            : results[checkType].isValid
                            ? "bg-green-500"
                            : "bg-yellow-500"
                        }`}
                      />
                    ) : (
                      <div className="w-4 h-4 rounded-full bg-gray-200" />
                    )}
                    <span className="text-gray-700">{details.title}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Results sections */}
            {Object.keys(results).length > 0 && (
              <>
                {/* Check cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(CHECK_DETAILS).map(([checkType, details]) => (
                    <div
                      key={checkType}
                      className={`p-6 rounded-lg shadow border border-gray-200 ${getResultColor(
                        checkType
                      )}`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex justify-between items-center">
                            <h2 className="text-xl font-semibold text-gray-900">
                              {details.title}
                            </h2>
                            <button
                              onClick={() => toggleCheck(checkType)}
                              className="ml-2 text-blue-600 hover:text-blue-800"
                            >
                              <span className="text-lg">
                                {expandedChecks[checkType] ? "▼" : "▶"}
                              </span>
                            </button>
                          </div>
                          {results[checkType] && !results[checkType].error && (
                            <div className="flex items-center gap-2 mt-2">
                              <span
                                className={`text-sm font-medium ${
                                  results[checkType].isValid
                                    ? "text-green-700"
                                    : "text-red-700"
                                }`}
                              >
                                {results[checkType].message}
                              </span>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => runCheck(checkType)}
                          disabled={!email || loading[checkType]}
                          className="px-4 py-2 text-sm bg-white border-2 border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 disabled:opacity-50 font-medium text-gray-700 ml-4"
                        >
                          {loading[checkType] ? "Checking..." : "Check"}
                        </button>
                      </div>

                      {expandedChecks[checkType] && (
                        <>
                          <p className="text-base text-gray-700 mb-4 leading-relaxed">
                            {details.description}
                          </p>

                          {/* Detailed explanations */}
                          <div className="mt-4 space-y-4 text-sm text-gray-600">
                            <div>
                              <h3 className="font-medium text-gray-900 mb-2">
                                What we check:
                              </h3>
                              <p className="leading-relaxed">
                                {details.details.what}
                              </p>
                            </div>

                            <div>
                              <h3 className="font-medium text-gray-900 mb-2">
                                Why it matters:
                              </h3>
                              <p className="leading-relaxed">
                                {details.details.why}
                              </p>
                            </div>

                            <div>
                              <h3 className="font-medium text-gray-900 mb-2">
                                Standards & Protocols:
                              </h3>
                              <ul className="list-disc list-inside space-y-1">
                                {details.details.standards.map(
                                  (standard, index) => (
                                    <li key={index}>{standard}</li>
                                  )
                                )}
                              </ul>
                            </div>

                            <div>
                              <h3 className="font-medium text-gray-900 mb-2">
                                Recommendations:
                              </h3>
                              <ul className="list-disc list-inside space-y-1">
                                {details.details.recommendations.map(
                                  (rec, index) => (
                                    <li key={index}>{rec}</li>
                                  )
                                )}
                              </ul>
                            </div>
                          </div>

                          {results[checkType] && !results[checkType].error && (
                            <div className="mt-4">
                              {/* Check-specific results */}
                              {checkType === "length" &&
                                results[checkType].metrics && (
                                  <div className="mt-3 text-base text-gray-700 space-y-1">
                                    <p>
                                      Local part length:{" "}
                                      <span className="font-medium">
                                        {results[checkType].metrics.localLength}
                                      </span>
                                    </p>
                                    <p>
                                      Total length:{" "}
                                      <span className="font-medium">
                                        {results[checkType].metrics.totalLength}
                                      </span>
                                    </p>
                                  </div>
                                )}

                              {checkType === "local" &&
                                results[checkType].issues && (
                                  <div className="mt-3 space-y-1">
                                    {Object.entries(
                                      results[checkType].issues
                                    ).map(
                                      ([issue, hasIssue]) =>
                                        hasIssue && (
                                          <p
                                            key={issue}
                                            className="text-base text-red-700 flex items-center"
                                          >
                                            <span className="mr-2">•</span>
                                            {issue
                                              .replace(/([A-Z])/g, " $1")
                                              .toLowerCase()}
                                          </p>
                                        )
                                    )}
                                  </div>
                                )}

                              {checkType === "role" &&
                                results[checkType].detectedRole && (
                                  <p className="mt-3 text-base text-gray-700">
                                    Detected role account:{" "}
                                    <span className="font-medium">
                                      {results[checkType].detectedRole}
                                    </span>
                                  </p>
                                )}

                              {checkType === "dns" &&
                                results[checkType].records && (
                                  <div className="mt-3 text-base text-gray-700">
                                    <p>
                                      MX Records found:{" "}
                                      <span className="font-medium">
                                        {results[checkType].records.length}
                                      </span>
                                    </p>
                                  </div>
                                )}

                              {/* Mail exchanger details */}
                              {checkType === "mailExchangers" &&
                                results[checkType].details.exchangers && (
                                  <div className="mt-3 space-y-4">
                                    {/* MX Records Section */}
                                    <div className="border rounded-lg p-4 bg-white">
                                      <h3 className="font-medium text-gray-900 mb-2">
                                        {details.details.sections.mx.title}
                                      </h3>
                                      <p className="text-sm text-gray-600 mb-4">
                                        {
                                          details.details.sections.mx
                                            .description
                                        }
                                      </p>
                                      {results[
                                        checkType
                                      ].details.exchangers.map(
                                        (exchanger, index) => (
                                          <div
                                            key={exchanger.host}
                                            className="border rounded-lg p-4 bg-gray-50 mb-4 last:mb-0"
                                          >
                                            <div className="flex items-center justify-between mb-2">
                                              <h4 className="font-medium text-gray-900">
                                                MX {index + 1}: {exchanger.host}
                                              </h4>
                                              <span className="text-sm text-gray-600">
                                                Priority: {exchanger.priority}
                                              </span>
                                            </div>
                                            <div className="space-y-2">
                                              <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-gray-700">
                                                  Status:
                                                </span>
                                                <span
                                                  className={`text-sm ${
                                                    exchanger.canConnect
                                                      ? "text-green-600"
                                                      : "text-red-600"
                                                  }`}
                                                >
                                                  {exchanger.canConnect
                                                    ? "Connected"
                                                    : "Failed to connect"}
                                                </span>
                                              </div>
                                              {exchanger.ips.length > 0 && (
                                                <div>
                                                  <span className="text-sm font-medium text-gray-700">
                                                    IP Addresses:
                                                  </span>
                                                  <div className="ml-4">
                                                    {exchanger.ips.map((ip) => (
                                                      <div
                                                        key={ip}
                                                        className="text-sm text-gray-600"
                                                      >
                                                        {ip}
                                                      </div>
                                                    ))}
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        )
                                      )}
                                    </div>

                                    {/* RBL Status Section */}
                                    <div className="border rounded-lg p-4 bg-white">
                                      <h3 className="font-medium text-gray-900 mb-2">
                                        {details.details.sections.rbl.title}
                                      </h3>
                                      <p className="text-sm text-gray-600 mb-4">
                                        {
                                          details.details.sections.rbl
                                            .description
                                        }
                                      </p>

                                      {/* List of RBL providers being checked */}
                                      <div className="mb-4">
                                        <h4 className="text-sm font-medium text-gray-700 mb-2">
                                          Checking against:
                                        </h4>
                                        <ul className="text-sm text-gray-600 space-y-1">
                                          {details.details.sections.rbl.providers.map(
                                            (provider, index) => (
                                              <li
                                                key={index}
                                                className="flex items-center"
                                              >
                                                <span className="mr-2">•</span>
                                                {provider}
                                              </li>
                                            )
                                          )}
                                        </ul>
                                      </div>

                                      {/* Blacklist Results */}
                                      <div className="space-y-4">
                                        <h4 className="text-sm font-medium text-gray-700">
                                          Results:
                                        </h4>
                                        {results[
                                          checkType
                                        ].details.exchangers.map(
                                          (exchanger) =>
                                            exchanger.blacklistedDetails
                                              .length > 0 && (
                                              <div
                                                key={`${exchanger.host}-rbl`}
                                                className="border rounded-lg p-4 bg-red-50"
                                              >
                                                <h4 className="font-medium text-red-700 mb-2">
                                                  {exchanger.host}
                                                </h4>
                                                <div className="space-y-1">
                                                  {exchanger.blacklistedDetails.map(
                                                    (detail) => (
                                                      <div
                                                        key={`${detail.ip}-${detail.rbl}`}
                                                        className="text-sm text-red-600"
                                                      >
                                                        • {detail.ip} listed in{" "}
                                                        {detail.rbl}
                                                      </div>
                                                    )
                                                  )}
                                                </div>
                                              </div>
                                            )
                                        )}
                                        {!results[
                                          checkType
                                        ].details.exchangers.some(
                                          (e) => e.blacklistedDetails.length > 0
                                        ) && (
                                          <div className="text-sm text-green-600 border rounded-lg p-4 bg-green-50">
                                            ✓ No blacklist entries found in any
                                            of the RBL providers
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* SMTP Session Logs */}
                                    <div className="border rounded-lg p-4 bg-white">
                                      <h3 className="font-medium text-gray-900 mb-2">
                                        {details.details.sections.smtp.title}
                                      </h3>
                                      <p className="text-sm text-gray-600 mb-4">
                                        {
                                          details.details.sections.smtp
                                            .description
                                        }
                                      </p>
                                      {results[
                                        checkType
                                      ].details.exchangers.map(
                                        (exchanger) =>
                                          exchanger.sessionLog &&
                                          exchanger.sessionLog.length > 0 && (
                                            <div
                                              key={`${exchanger.host}-smtp`}
                                              className="mb-4 last:mb-0"
                                            >
                                              <h4 className="font-medium text-gray-900 mb-2">
                                                {exchanger.host}
                                              </h4>
                                              <pre className="text-xs bg-black text-gray-100 p-4 rounded-lg overflow-x-auto font-mono leading-relaxed">
                                                {exchanger.sessionLog.map(
                                                  (log, i) => {
                                                    let prefix, textColor;
                                                    switch (log.step) {
                                                      case "send":
                                                        prefix = ">";
                                                        textColor =
                                                          "text-blue-400";
                                                        break;
                                                      case "receive":
                                                        prefix = "<";
                                                        textColor =
                                                          "text-green-400";
                                                        break;
                                                      case "error":
                                                        prefix = "!";
                                                        textColor =
                                                          "text-red-400";
                                                        break;
                                                      default:
                                                        prefix = "-";
                                                        textColor =
                                                          "text-gray-400";
                                                    }
                                                    return (
                                                      <div
                                                        key={i}
                                                        className={`${textColor}`}
                                                      >
                                                        <span className="text-gray-500">
                                                          {log.timestamp}
                                                        </span>{" "}
                                                        <span className="text-gray-500">
                                                          {prefix}
                                                        </span>{" "}
                                                        <span>{log.data}</span>
                                                        {log.details && (
                                                          <span className="text-gray-500 ml-2">
                                                            ({log.details})
                                                          </span>
                                                        )}
                                                      </div>
                                                    );
                                                  }
                                                )}
                                              </pre>
                                            </div>
                                          )
                                      )}
                                    </div>
                                  </div>
                                )}
                            </div>
                          )}
                        </>
                      )}

                      {results[checkType]?.error && (
                        <p className="mt-3 text-base font-medium text-red-700">
                          {results[checkType].error}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
