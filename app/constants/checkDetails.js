export const CHECK_DETAILS = {
  format: {
    title: "Format Check",
    description:
      "Verifies that the email follows the basic email format requirements",
    success: "Email format is valid and follows RFC 5322 standards",
    failure: "Email format does not comply with RFC 5322 standards",
    details: {
      what: "Format check ensures the email follows the standard email address structure (local-part@domain)",
      why: "Proper email format is essential for deliverability and compatibility with email systems",
      standards: [
        "RFC 5322 - Internet Message Format",
        "RFC 6531 - SMTP Extension for Internationalized Email",
      ],
      recommendations: [
        "Use only allowed characters in the local part",
        "Ensure domain follows proper DNS naming conventions",
        "Avoid spaces and special characters unless properly quoted",
      ],
    },
  },
  length: {
    title: "Length Check",
    description: "Ensures the email length is within RFC 5321 limits",
    success:
      "Email length is within acceptable limits (local part ≤ 64, total ≤ 254)",
    failure:
      "Email exceeds maximum allowed length (local part > 64 or total > 254)",
    details: {
      what: "Validates that both the local part and total email length are within RFC specifications",
      why: "Email systems may reject or truncate addresses that exceed standard length limits",
      standards: [
        "RFC 5321 - Maximum local-part length: 64 characters",
        "RFC 5321 - Maximum total length: 254 characters",
      ],
      recommendations: [
        "Keep local part under 64 characters",
        "Consider using shorter aliases for long addresses",
        "Total email length should not exceed 254 characters",
      ],
    },
  },
  local: {
    title: "Local Part Check",
    description: "Validates the local part of the email address",
    success: "Local part is valid and follows RFC standards",
    failure: "Local part contains invalid characters or format",
    details: {
      what: "Checks the username portion of the email address",
      why: "Local part must follow specific formatting rules for valid email addresses",
      standards: [
        "RFC 5321 - Local part specifications",
        "RFC 5322 - Local part format rules",
      ],
      recommendations: [
        "Use only allowed characters",
        "Avoid starting or ending with dots",
        "Avoid consecutive dots",
      ],
    },
  },
  domain: {
    title: "Domain Check",
    description: "Validates the email domain format and TLD",
    success: "Domain format is valid with a registered TLD",
    failure: "Invalid domain format or unregistered TLD",
    details: {
      what: "Checks domain format and validates the top-level domain",
      why: "Valid domain and TLD are essential for email delivery",
      standards: ["RFC 1035 - Domain format", "IANA TLD list"],
      recommendations: [
        "Use properly formatted domains",
        "Ensure TLD is registered with IANA",
        "Check domain spelling",
      ],
    },
  },
  role: {
    title: "Role Account Check",
    description: "Detects common role-based email addresses",
    success: "Not a role account",
    failure: "Detected as a role account (e.g., admin@, info@, support@)",
    details: {
      what: "Identifies email addresses typically used for organizational roles rather than individuals",
      why: "Role accounts often indicate shared mailboxes or automated systems",
      standards: ["Common industry practices", "Security best practices"],
      recommendations: [
        "Use personal email addresses for individual communication",
        "Role accounts should be used for their intended organizational purpose",
        "Consider security implications of shared mailboxes",
      ],
    },
  },
  dns: {
    title: "DNS Check",
    description: "Verifies the existence of domain DNS records",
    success: "Domain has valid DNS records",
    failure: "No valid DNS records found for the domain",
    details: {
      what: "Checks if the email domain has valid DNS records",
      why: "Valid DNS records are essential for email delivery",
      standards: ["RFC 1035 - Domain Name System", "RFC 2181 - DNS Protocol"],
      recommendations: [
        "Ensure proper DNS configuration",
        "Verify A/AAAA records exist",
        "Keep DNS records updated",
      ],
    },
  },
  disposable: {
    title: "Disposable Email Check",
    description: "Detects temporary or disposable email addresses",
    success: "Not a disposable email address",
    failure: "Detected as a disposable or temporary email address",
    details: {
      what: "Checks if the email domain is associated with disposable email services",
      why: "Disposable emails are often used for spam or abuse",
      standards: ["Industry blacklists", "Known disposable email providers"],
      recommendations: [
        "Use permanent email addresses for legitimate communication",
        "Avoid temporary email services",
        "Consider business email addresses for professional use",
      ],
    },
  },
  security: {
    title: "Email Security Check",
    description: "Validates email domain security configurations",
    success: "Domain has proper email security measures",
    failure: "Missing or incomplete email security configurations",
    details: {
      what: "Checks for SPF, DKIM, and DMARC implementations",
      why: "Email security measures prevent spoofing and ensure deliverability",
      standards: [
        "SPF - Sender Policy Framework",
        "DKIM - DomainKeys Identified Mail",
        "DMARC - Domain-based Message Authentication",
      ],
      recommendations: [
        "Implement SPF records",
        "Configure DKIM signing",
        "Enable DMARC protection",
      ],
    },
  },
  domainAge: {
    title: "Domain Age Check",
    description: "Evaluates domain establishment and infrastructure",
    success: "Domain appears well-established",
    failure: "Domain appears new or poorly configured",
    details: {
      what: "Analyzes domain infrastructure and configuration patterns",
      why: "Established domains are more likely to be legitimate",
      standards: [
        "DNS infrastructure best practices",
        "Domain registration patterns",
      ],
      recommendations: [
        "Use domains with established history",
        "Ensure proper DNS configuration",
        "Maintain consistent domain infrastructure",
      ],
    },
  },
  plusAddressing: {
    title: "Plus Addressing Check",
    description: "Detects the use of plus addressing for email tracking",
    success: "Uses plus addressing for email tracking",
    failure: "No plus addressing detected (this is not an issue)",
    details: {
      what: "Checks if the email uses plus addressing (e.g., user+tag@domain.com)",
      why: "Plus addressing indicates a sophisticated user tracking email sources",
      standards: ["Email provider plus addressing support", "RFC 5233"],
      recommendations: [
        "Use plus addressing to track email sources",
        "Check if your email provider supports plus addressing",
        "Consider using plus addressing for better email organization",
      ],
    },
  },
  reputableProvider: {
    title: "Reputable Provider Check",
    description: "Verifies if the email is from a known reputable provider",
    success: "Email is from a reputable provider",
    failure: "Not from a major email provider (this is not an issue)",
    details: {
      what: "Checks if the email domain belongs to a known reputable email provider",
      why: "Major email providers have established trust and security measures",
      standards: [
        "Industry standard email providers",
        "Email security best practices",
      ],
      recommendations: [
        "Consider using business email for professional communication",
        "Major providers often have better security and deliverability",
        "Custom domains are also valid for business use",
      ],
    },
  },
  personalFormat: {
    title: "Personal Format Check",
    description: "Detects if the email follows a personal name format",
    success: "Uses a personal name format",
    failure: "Does not use a personal name format",
    details: {
      what: "Checks if the email address uses common personal name patterns (e.g., firstname.lastname@)",
      why: "Personal format emails are more likely to belong to individuals rather than systems or roles",
      standards: ["Common naming conventions", "Professional email practices"],
      recommendations: [
        "Use firstname.lastname@ format for professional emails",
        "Consider using just firstname@ for personal domains",
        "Maintain consistency in email naming across organization",
      ],
    },
  },
  mailExchangers: {
    title: "Mail Exchanger Check",
    description:
      "Validates mail server configuration, responsiveness, and reputation",
    success: "Mail exchangers are properly configured and responsive",
    failure: "Issues detected with mail exchangers",
    details: {
      what: "Performs comprehensive validation of mail server configuration including MX records, SMTP connectivity, blacklist status, and security settings",
      why: "Proper mail server configuration is crucial for email deliverability and security",
      standards: [
        "RFC 5321 - SMTP Protocol",
        "RFC 7208 - Sender Policy Framework (SPF)",
        "DNS MX record configuration",
        "Real-time Blackhole Lists (RBLs)",
      ],
      recommendations: [
        "Configure multiple MX records for redundancy",
        "Ensure proper SPF record configuration",
        "Monitor and maintain clean IP reputation",
        "Keep mail server software updated",
        "Implement proper security measures",
      ],
      sections: {
        mx: {
          title: "MX Records",
          description: "Mail exchanger records in order of priority",
          fields: [
            "Priority - Lower numbers indicate preferred servers",
            "Hostname - The mail server's domain name",
            "IP Addresses - Associated IP addresses",
            "Connection Status - SMTP connectivity test results",
          ],
        },
        rbl: {
          title: "Blacklist Status",
          description: "Real-time blacklist check results",
          providers: [
            "Spamhaus (zen.spamhaus.org) - Industry standard blacklist",
            "SpamCop (bl.spamcop.net) - Community-driven spam reporting",
            "SORBS (dnsbl.sorbs.net) - Spam and Open Relay Blocking System",
            "Barracuda (b.barracudacentral.org) - Commercial reputation data",
          ],
        },
        smtp: {
          title: "SMTP Session",
          description: "Detailed SMTP conversation logs",
          steps: [
            "Initial Connection - TCP connection establishment",
            "Greeting - Server's initial response",
            "EHLO - Extended SMTP handshake",
            "Mail Flow - Test email transaction",
            "Response Codes - Server's acceptance/rejection indicators",
          ],
        },
      },
    },
  },
  internationalized: {
    title: "Internationalization Check",
    description: "Validates internationalized email address format",
    success: "Email follows internationalization standards",
    failure: "Issues with internationalized format",
    details: {
      what: "Checks if the email follows internationalized email standards",
      why: "Ensures proper handling of non-ASCII characters in email addresses",
      standards: [
        "RFC 6531 - SMTP Extension for Internationalized Email",
        "IDNA - Internationalizing Domain Names in Applications",
      ],
      recommendations: [
        "Use ASCII characters when possible",
        "Ensure proper encoding of international characters",
        "Verify email client support for internationalized addresses",
      ],
    },
  },
};
