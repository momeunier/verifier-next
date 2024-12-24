import { createClient } from "redis";
import { logSystem, logError } from "./logging";

let redisClient = null;

const ENV_PREFIX = process.env.NODE_ENV === "production" ? "prod" : "dev";

export const CACHE_KEYS = {
  IANA_TLDS: `${ENV_PREFIX}:email:validator:iana:tlds`,
  DISPOSABLE_DOMAINS: `${ENV_PREFIX}:email:validator:disposable:domains`,
  DOMAIN_RECORDS: `${ENV_PREFIX}:email:validator:domain:records:`,
  DOMAIN_AGE: `${ENV_PREFIX}:email:validator:domain:age:`,
};

export const CACHE_TTL = {
  IANA_TLDS: 24 * 60 * 60,
  DISPOSABLE_DOMAINS: 24 * 60 * 60,
  DOMAIN_RECORDS: 60 * 60,
  DOMAIN_AGE: 24 * 60 * 60,
};

export const createRedisClient = async () => {
  try {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      logSystem("redis", "Redis configuration not available");
      return null;
    }

    logSystem("redis", "Creating Redis client");

    const client = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logSystem("redis", "Maximum reconnection attempts reached");
            return false;
          }
          const delay = Math.min(Math.pow(2, retries) * 1000, 10000);
          logSystem(
            "redis",
            `Reconnecting in ${delay}ms`,
            `Attempt ${retries}`
          );
          return delay;
        },
      },
    });

    client.on("error", (err) => {
      logError("redis", "Redis client error", err);
      if (err.code === "ECONNREFUSED") {
        logSystem("redis", "Connection refused - check Redis server status");
      }
    });

    client.on("connect", () => {
      logSystem("redis", "Client connected successfully");
    });

    client.on("reconnecting", () => {
      logSystem("redis", "Client attempting to reconnect");
    });

    client.on("end", () => {
      logSystem("redis", "Connection ended");
      redisClient = null;
    });

    await client.connect();
    redisClient = client;
    return client;
  } catch (error) {
    logError("redis", "Error creating Redis client", error);
    return null;
  }
};

export const getRedisClient = async () => {
  if (!redisClient) {
    try {
      redisClient = await createRedisClient();
      if (!redisClient) {
        logSystem("redis", "Client not available, proceeding without Redis");
        return null;
      }
    } catch (error) {
      logError("redis", "Error connecting", error);
      return null;
    }
  }
  return redisClient;
};

export const getCachedSet = async (key) => {
  try {
    const client = await getRedisClient();
    if (!client) return null;

    const members = await client.sMembers(key);
    return new Set(members);
  } catch (error) {
    logError("redis", `Error getting cached set for key ${key}`, error);
    return null;
  }
};

export const setCachedSet = async (key, values, ttl = 3600) => {
  try {
    const client = await getRedisClient();
    if (!client) return false;

    await client.sAdd(key, [...values]);
    if (ttl) {
      await client.expire(key, ttl);
    }
    return true;
  } catch (error) {
    logError("redis", `Error setting cached set for key ${key}`, error);
    return false;
  }
};

export const getCachedJson = async (key) => {
  try {
    const client = await getRedisClient();
    if (!client) return null;

    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    logError("redis", `Error getting cached JSON for key ${key}`, error);
    return null;
  }
};

export const setCachedJson = async (key, value, ttl = 3600) => {
  try {
    const client = await getRedisClient();
    if (!client) return false;

    await client.set(key, JSON.stringify(value));
    if (ttl) {
      await client.expire(key, ttl);
    }
    return true;
  } catch (error) {
    logError("redis", `Error setting cached JSON for key ${key}`, error);
    return false;
  }
};

export const closeRedisConnection = async () => {
  try {
    if (redisClient) {
      await redisClient.quit();
      logSystem("redis", "Connection closed gracefully");
      redisClient = null;
    }
  } catch (error) {
    logError("redis", "Error closing connection", error);
  }
};
