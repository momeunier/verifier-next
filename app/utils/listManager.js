import { readFile } from "fs/promises";
import { join } from "path";
import { logStep, logError, logSystem } from "./logging";
import {
  getCachedSet,
  setCachedSet,
  getCachedJson,
  setCachedJson,
  CACHE_KEYS,
  CACHE_TTL,
} from "./redis";

const fetchList = async (url) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const text = await response.text();
    return new Set(text.split("\n").filter(Boolean));
  } catch (error) {
    logError("listManager", `Error fetching list from ${url}`, error);
    return new Set();
  }
};

let ianaTlds = null;
let disposableDomains = null;

export const getIanaTlds = async () => {
  try {
    if (ianaTlds) return ianaTlds;

    // Try to get from cache first
    const cachedTlds = await getCachedSet(CACHE_KEYS.IANA_TLDS);
    if (cachedTlds && cachedTlds.size > 0) {
      ianaTlds = cachedTlds;
      return ianaTlds;
    }

    // Fetch and cache if not found
    ianaTlds = await fetchList(
      "https://data.iana.org/TLD/tlds-alpha-by-domain.txt"
    );
    await setCachedSet(CACHE_KEYS.IANA_TLDS, ianaTlds, CACHE_TTL.IANA_TLDS);
    return ianaTlds;
  } catch (error) {
    logError("listManager", "Error getting IANA TLDs", error);
    return new Set();
  }
};

export const getDisposableDomains = async () => {
  try {
    if (disposableDomains) return disposableDomains;

    // Try to get from cache first
    const cachedDomains = await getCachedSet(CACHE_KEYS.DISPOSABLE_DOMAINS);
    if (cachedDomains && cachedDomains.size > 0) {
      disposableDomains = cachedDomains;
      return disposableDomains;
    }

    // Fetch and cache if not found
    disposableDomains = await fetchList(
      "https://raw.githubusercontent.com/disposable/disposable-email-domains/master/domains.txt"
    );
    await setCachedSet(
      CACHE_KEYS.DISPOSABLE_DOMAINS,
      disposableDomains,
      CACHE_TTL.DISPOSABLE_DOMAINS
    );
    return disposableDomains;
  } catch (error) {
    logError("listManager", "Error getting disposable domains", error);
    return new Set();
  }
};

export const cacheDomainRecords = async (domain, records) => {
  try {
    await setCachedJson(
      CACHE_KEYS.DOMAIN_RECORDS + domain,
      records,
      CACHE_TTL.DOMAIN_RECORDS
    );
  } catch (error) {
    logError("listManager", "Error caching domain records", error);
  }
};

export const getCachedDomainRecords = async (domain) => {
  try {
    return await getCachedJson(CACHE_KEYS.DOMAIN_RECORDS + domain);
  } catch (error) {
    logError("listManager", "Error getting cached domain records", error);
    return null;
  }
};

export const initializeLists = async () => {
  try {
    const [tlds, disposable] = await Promise.all([
      getIanaTlds(),
      getDisposableDomains(),
    ]);

    logSystem(
      "listManager",
      `Initialized IANA TLDs: ${tlds.size} entries`,
      `Disposable domains: ${disposable.size} entries`
    );

    return {
      tlds,
      disposable,
    };
  } catch (error) {
    logError("listManager", "Error initializing lists", error);
    return {
      tlds: new Set(),
      disposable: new Set(),
    };
  }
};
