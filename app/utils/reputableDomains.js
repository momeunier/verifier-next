// Reputable email providers with their characteristics
export const reputableDomains = {
  // Google
  "gmail.com": {
    provider: "Google",
    type: "personal",
    reputation: 0.95,
    features: {
      plusAddressing: true,
      dotAddressing: true,
    },
    securityExpectations: {
      spf: true,
      dkim: true,
      dmarc: true,
    },
    subdomains: {
      www: true,
      mail: true,
    },
  },
  "googlemail.com": {
    provider: "Google",
    type: "personal",
    reputation: 0.95,
    features: {
      plusAddressing: true,
      dotAddressing: true,
    },
    securityExpectations: {
      spf: true,
      dkim: true,
      dmarc: true,
    },
    subdomains: {
      www: true,
      mail: true,
    },
  },

  // Microsoft
  "outlook.com": {
    provider: "Microsoft",
    type: "personal",
    reputation: 0.9,
    features: {
      plusAddressing: true,
      dotAddressing: false,
    },
    securityExpectations: {
      spf: true,
      dkim: true,
      dmarc: true,
    },
    subdomains: {
      www: true,
      mail: true,
    },
  },
  "hotmail.com": {
    provider: "Microsoft",
    type: "personal",
    reputation: 0.9,
    features: {
      plusAddressing: true,
      dotAddressing: false,
    },
    securityExpectations: {
      spf: true,
      dkim: true,
      dmarc: true,
    },
    subdomains: {
      www: true,
      mail: true,
    },
  },
  "live.com": {
    provider: "Microsoft",
    type: "personal",
    reputation: 0.9,
    features: {
      plusAddressing: true,
      dotAddressing: false,
    },
    securityExpectations: {
      spf: true,
      dkim: true,
      dmarc: true,
    },
    subdomains: {
      www: true,
      mail: true,
    },
  },

  // Yahoo
  "yahoo.com": {
    provider: "Yahoo",
    type: "personal",
    reputation: 0.85,
    features: {
      plusAddressing: true,
      dotAddressing: false,
    },
    securityExpectations: {
      spf: true,
      dkim: true,
      dmarc: true,
    },
    subdomains: {
      www: true,
      mail: true,
    },
  },
  "ymail.com": {
    provider: "Yahoo",
    type: "personal",
    reputation: 0.85,
    features: {
      plusAddressing: true,
      dotAddressing: false,
    },
    securityExpectations: {
      spf: true,
      dkim: true,
      dmarc: true,
    },
    subdomains: {
      www: true,
      mail: true,
    },
  },

  // Apple
  "icloud.com": {
    provider: "Apple",
    type: "personal",
    reputation: 0.9,
    features: {
      plusAddressing: true,
      dotAddressing: false,
    },
    securityExpectations: {
      spf: true,
      dkim: true,
      dmarc: true,
    },
    subdomains: {
      www: true,
      mail: true,
    },
  },
  "me.com": {
    provider: "Apple",
    type: "personal",
    reputation: 0.9,
    features: {
      plusAddressing: true,
      dotAddressing: false,
    },
    securityExpectations: {
      spf: true,
      dkim: true,
      dmarc: true,
    },
    subdomains: {
      www: true,
      mail: true,
    },
  },

  // ProtonMail
  "proton.me": {
    provider: "Proton",
    type: "personal",
    reputation: 0.9,
    features: {
      plusAddressing: true,
      dotAddressing: false,
    },
    securityExpectations: {
      spf: true,
      dkim: true,
      dmarc: true,
    },
    subdomains: {
      www: true,
      mail: true,
    },
  },
  "protonmail.com": {
    provider: "Proton",
    type: "personal",
    reputation: 0.9,
    features: {
      plusAddressing: true,
      dotAddressing: false,
    },
    securityExpectations: {
      spf: true,
      dkim: true,
      dmarc: true,
    },
    subdomains: {
      www: true,
      mail: true,
    },
  },
};
