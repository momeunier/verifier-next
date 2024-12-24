import net from "net";
import dns from "dns";
import { promisify } from "util";
import { logStep } from "./logging";

const resolve4 = promisify(dns.resolve4);

export const testSMTPDirect = async (host, port = 25) => {
  let sessionLog = [];
  const logStep = (step, data, details = "") => {
    const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
    sessionLog.push({
      step,
      data: data?.toString().trim(),
      details,
      timestamp,
    });
  };

  // First resolve IPv4 addresses
  let ips = [];
  try {
    ips = await resolve4(host);
    logStep("info", `Resolved IPs for ${host}`, JSON.stringify(ips));
  } catch (error) {
    logStep("error", `Failed to resolve IPs for ${host}`, error.message);
    return { connected: false, sessionLog, proxyUsed: false };
  }

  if (ips.length === 0) {
    logStep("error", "No IPv4 addresses found");
    return { connected: false, sessionLog, proxyUsed: false };
  }

  // Try each IP address
  for (const ip of ips) {
    try {
      const result = await new Promise((resolve) => {
        const socket = new net.Socket();
        let connected = false;
        let receivedData = "";

        const sendCommand = (command) => {
          socket.write(command + "\r\n");
          logStep("send", command);
        };

        socket.setTimeout(10000); // 10 second timeout per IP

        socket.on("connect", () => {
          connected = true;
          logStep("info", `Connected to ${ip}:${port}`);
        });

        socket.on("data", (data) => {
          receivedData = data.toString().trim();
          logStep("receive", receivedData);

          if (receivedData.startsWith("220")) {
            connected = true;
            sendCommand("QUIT");
          } else if (receivedData.startsWith("221")) {
            socket.end();
          }
        });

        socket.on("error", (error) => {
          logStep("error", `Error connecting to ${ip}`, error.message);
          socket.destroy();
          resolve(false);
        });

        socket.on("timeout", () => {
          logStep("error", `Connection to ${ip} timed out`);
          socket.destroy();
          resolve(false);
        });

        socket.on("close", () => {
          logStep("info", `Connection to ${ip} closed`);
          resolve(connected);
        });

        logStep("info", `Attempting connection to ${ip}:${port}`);
        socket.connect(port, ip);
      });

      if (result) {
        return { connected: true, sessionLog, ip, proxyUsed: false };
      }
    } catch (error) {
      logStep("error", `Failed to connect to ${ip}`, error.message);
    }
  }

  return {
    connected: false,
    sessionLog,
    details: `Tried IPs: ${ips.join(", ")}`,
    proxyUsed: false,
  };
};
