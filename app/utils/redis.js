import { createClient } from "redis";

const getRedisConfig = () => {
  if (!process.env.REDIS_URL) {
    console.warn("REDIS_URL is not set");
    return null;
  }

  return {
    url: process.env.REDIS_URL,
    socket: {
      keepAlive: 30000,
      reconnectStrategy: (retries) => {
        const delay = Math.min(Math.pow(2, retries) * 1000, 10000);
        return delay;
      },
    },
  };
};

let redisClient = null;

const createRedisClient = () => {
  if (!redisClient) {
    try {
      const config = getRedisConfig();
      if (!config) {
        console.log("Redis configuration not available");
        return null;
      }

      redisClient = createClient(config);

      redisClient.on("error", (err) => {
        console.error("Redis Client Error:", err);
        if (err.code === "ECONNREFUSED" || err.code === "ENOTFOUND") {
          redisClient = null;
        }
      });

      redisClient.on("connect", () => {
        console.log("Redis client connected");
      });

      redisClient.on("reconnecting", () => {
        console.log("Redis client reconnecting");
      });

      redisClient.on("end", () => {
        console.log("Redis client connection ended");
        redisClient = null;
      });
    } catch (error) {
      console.error("Error creating Redis client:", error);
      redisClient = null;
    }
  }

  return redisClient;
};

// Connect to Redis with error handling and retries
const connectRedis = async () => {
  try {
    const client = createRedisClient();

    if (!client) {
      console.log("Redis client not available, proceeding without Redis");
      return null;
    }

    if (!client.isOpen) {
      await client.connect();
    }

    return client;
  } catch (error) {
    console.error("Error connecting to Redis:", error);
    return null;
  }
};

// Cache keys with environment-specific prefixes
const ENV_PREFIX = process.env.NODE_ENV === "production" ? "prod" : "dev";

export const CACHE_KEYS = {
  IANA_TLDS: `${ENV_PREFIX}:email:validator:iana:tlds`,
  DISPOSABLE_DOMAINS: `${ENV_PREFIX}:email:validator:disposable:domains`,
  DOMAIN_RECORDS: `${ENV_PREFIX}:email:validator:domain:records:`, // Append domain name
  DOMAIN_AGE: `${ENV_PREFIX}:email:validator:domain:age:`, // Append domain name
};

// Cache durations (in seconds)
export const CACHE_TTL = {
  IANA_TLDS: 24 * 60 * 60, // 24 hours
  DISPOSABLE_DOMAINS: 24 * 60 * 60, // 24 hours
  DOMAIN_RECORDS: 60 * 60, // 1 hour
  DOMAIN_AGE: 24 * 60 * 60, // 24 hours
};

// Helper functions with improved error handling
export const getRedisClient = async () => {
  try {
    return await connectRedis();
  } catch (error) {
    console.error("Failed to get Redis client:", error);
    return null;
  }
};

export const getCachedSet = async (key) => {
  try {
    const client = await getRedisClient();
    if (!client) return new Set();

    const members = await client.sMembers(key);
    return new Set(members);
  } catch (error) {
    console.error(`Error getting cached set for key ${key}:`, error);
    return new Set();
  }
};

export const setCachedSet = async (key, values, ttl = 3600) => {
  try {
    const client = await getRedisClient();
    if (!client) return;

    if (values.size > 0 || Array.isArray(values)) {
      await client.sAdd(key, Array.from(values));
      await client.expire(key, ttl);
    }
  } catch (error) {
    console.error(`Error setting cached set for key ${key}:`, error);
  }
};

export const getCachedJson = async (key) => {
  try {
    const client = await getRedisClient();
    if (!client) return null;

    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error(`Error getting cached JSON for key ${key}:`, error);
    return null;
  }
};

export const setCachedJson = async (key, value, ttl = 3600) => {
  try {
    const client = await getRedisClient();
    if (!client) return;

    await client.set(key, JSON.stringify(value));
    await client.expire(key, ttl);
  } catch (error) {
    console.error(`Error setting cached JSON for key ${key}:`, error);
  }
};

// Graceful shutdown helper
export const closeRedisConnection = async () => {
  if (redisClient && redisClient.isOpen) {
    try {
      await redisClient.quit();
      console.log("Redis connection closed gracefully");
    } catch (error) {
      console.error("Error closing Redis connection:", error);
      // Force close if graceful shutdown fails
      redisClient.disconnect();
    }
    redisClient = null;
  }
};
