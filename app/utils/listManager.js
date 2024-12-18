import fs from "fs";
import path from "path";
import {
  CACHE_KEYS,
  CACHE_TTL,
  getCachedSet,
  setCachedSet,
  getCachedJson,
  setCachedJson,
} from "./redis";

const IANA_TLD_URL = "https://data.iana.org/TLD/tlds-alpha-by-domain.txt";
const DISPOSABLE_DOMAINS_URL =
  "https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/master/disposable_email_blocklist.conf";

export const fetchAndCleanList = async (url) => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const text = await response.text();

    // Clean the list (remove comments, empty lines, etc.)
    return new Set(
      text
        .split("\n")
        .map((line) => line.trim().toLowerCase())
        .filter((line) => line && !line.startsWith("#"))
    );
  } catch (error) {
    console.error(`Error fetching list from ${url}:`, error);
    return new Set();
  }
};

export const getIanaTlds = async () => {
  try {
    // Try to get from cache first
    let tlds = await getCachedSet(CACHE_KEYS.IANA_TLDS);

    // If cache is empty, fetch and cache
    if (tlds.size === 0) {
      tlds = await fetchAndCleanList(IANA_TLD_URL);
      if (tlds.size > 0) {
        await setCachedSet(CACHE_KEYS.IANA_TLDS, tlds, CACHE_TTL.IANA_TLDS);
      }
    }

    return tlds;
  } catch (error) {
    console.error("Error getting IANA TLDs:", error);
    return new Set();
  }
};

export const getDisposableDomains = async () => {
  try {
    // Try to get from cache first
    let domains = await getCachedSet(CACHE_KEYS.DISPOSABLE_DOMAINS);

    // If cache is empty, fetch and cache
    if (domains.size === 0) {
      domains = await fetchAndCleanList(DISPOSABLE_DOMAINS_URL);
      if (domains.size > 0) {
        await setCachedSet(
          CACHE_KEYS.DISPOSABLE_DOMAINS,
          domains,
          CACHE_TTL.DISPOSABLE_DOMAINS
        );
      }
    }

    return domains;
  } catch (error) {
    console.error("Error getting disposable domains:", error);
    return new Set();
  }
};

// Cache DNS records for a domain
export const cacheDomainRecords = async (domain, records) => {
  try {
    const key = CACHE_KEYS.DOMAIN_RECORDS + domain;
    await setCachedJson(key, records, CACHE_TTL.DOMAIN_RECORDS);
  } catch (error) {
    console.error("Error caching domain records:", error);
  }
};

// Get cached DNS records for a domain
export const getCachedDomainRecords = async (domain) => {
  try {
    const key = CACHE_KEYS.DOMAIN_RECORDS + domain;
    return await getCachedJson(key);
  } catch (error) {
    console.error("Error getting cached domain records:", error);
    return null;
  }
};

// Initialize lists (can be called during app startup)
export const initializeLists = async () => {
  try {
    const [tlds, disposableDomains] = await Promise.all([
      getIanaTlds(),
      getDisposableDomains(),
    ]);

    console.log(`Initialized IANA TLDs: ${tlds.size} entries`);
    console.log(
      `Initialized Disposable Domains: ${disposableDomains.size} entries`
    );

    return {
      tlds: tlds.size,
      disposableDomains: disposableDomains.size,
    };
  } catch (error) {
    console.error("Error initializing lists:", error);
    return { tlds: 0, disposableDomains: 0 };
  }
};

// Get first names from local file
export const getFirstNames = async () => {
  try {
    const filePath = path.join(process.cwd(), "data", "first-names.json");
    const fileContent = await fs.promises.readFile(filePath, "utf8");
    const namesArray = JSON.parse(fileContent);
    return new Set(namesArray.map((name) => name.toLowerCase()));
  } catch (error) {
    console.error("Error reading first names file:", error);
    return new Set();
  }
};
