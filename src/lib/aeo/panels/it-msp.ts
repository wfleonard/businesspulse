import type { CannedPanelDefinition } from './index'

/**
 * IT companies and managed service providers: managed IT, help desk,
 * cybersecurity, cloud and Microsoft 365, backup and recovery, networks, and
 * compliance. Buyers are small and midsize business owners, office managers,
 * medical and legal practices, and nonprofits.
 *
 * Written 2026-09-21. Validate against a known business before relying on it.
 */
export const itMsp: CannedPanelDefinition = {
  slug: 'it-msp',
  name: 'IT companies & MSPs',

  questions: [
    { c: 'service-geo', q: '{service} near {city}, {state}' },
    { c: 'service-geo', q: 'managed IT services near {city}, {state}' },
    { c: 'service-geo', q: 'IT support companies for small business near {city}' },
    { c: 'service-geo', q: 'best managed service providers in {state}' },
    { c: 'service-geo', q: 'cybersecurity companies for small business in {state}' },
    { c: 'service-geo', q: 'outsourced IT help desk near {city}' },
    { c: 'service-geo', q: 'IT consulting firms near {city}, {state}' },
    { c: 'service-geo', q: 'network installation and cabling near {city}' },
    { c: 'service-geo', q: 'Microsoft 365 support providers in {state}' },
    { c: 'service-geo', q: 'emergency IT support near {city}' },

    { c: 'cost', q: 'how much do managed IT services cost per user' },
    { c: 'cost', q: 'managed IT services pricing in {state}' },
    { c: 'cost', q: 'in-house IT staff vs managed service provider cost' },
    { c: 'cost', q: 'how much does a cybersecurity assessment cost' },
    { c: 'cost', q: 'IT support hourly rate vs monthly contract' },
    { c: 'cost', q: 'cost of a server migration to the cloud' },
    { c: 'cost', q: 'how much should a small business spend on IT' },
    { c: 'cost', q: 'cost of downtime for a small business' },

    { c: 'regulation', q: 'HIPAA IT requirements for a medical practice' },
    { c: 'regulation', q: 'CMMC requirements for defense contractors' },
    { c: 'regulation', q: 'data breach notification laws in {state}' },
    { c: 'regulation', q: 'what does cyber insurance require from my IT' },
    { c: 'regulation', q: 'PCI compliance requirements for a small business' },
    { c: 'regulation', q: 'FTC Safeguards Rule requirements for small businesses' },

    { c: 'comparison', q: 'managed IT vs break fix IT support' },
    { c: 'comparison', q: 'MSP vs MSSP' },
    { c: 'comparison', q: 'co-managed IT vs fully managed IT' },
    { c: 'comparison', q: 'Microsoft 365 vs Google Workspace for a small business' },
    { c: 'comparison', q: 'on premise server vs cloud' },
    { c: 'comparison', q: 'local MSP vs national IT provider' },

    { c: 'technical', q: 'what does a managed service provider do' },
    { c: 'technical', q: 'what is included in managed IT services' },
    { c: 'technical', q: 'what is an IT service level agreement' },
    { c: 'technical', q: 'what is endpoint detection and response' },
    { c: 'technical', q: 'what is a business continuity and disaster recovery plan' },
    { c: 'technical', q: 'how does onboarding with a new MSP work' },
    { c: 'technical', q: 'what is multi factor authentication and do we need it' },
    { c: 'technical', q: 'what is a virtual CIO' },

    { c: 'application', q: 'IT support for a dental or medical office' },
    { c: 'application', q: 'IT support for a law firm' },
    { c: 'application', q: 'setting up IT for a new office' },
    { c: 'application', q: 'IT for a company with remote employees' },
    { c: 'application', q: 'IT support for a nonprofit' },
    { c: 'application', q: 'IT support for an accounting firm during tax season' },

    { c: 'problem', q: 'small business hit by ransomware what to do' },
    { c: 'problem', q: 'employee clicked a phishing email' },
    { c: 'problem', q: 'our IT person quit and nobody has the passwords' },
    { c: 'problem', q: 'slow network and WiFi at the office' },
    { c: 'problem', q: 'unhappy with our current IT provider' },
    { c: 'problem', q: 'business email account hacked' },

    { c: 'vendor-selection', q: 'questions to ask a managed service provider' },
    { c: 'vendor-selection', q: 'how to choose an MSP' },
    { c: 'vendor-selection', q: 'how to compare managed IT proposals' },
    { c: 'vendor-selection', q: 'what should be in an MSP contract' },
    { c: 'vendor-selection', q: 'how to switch IT providers' },
    { c: 'vendor-selection', q: 'red flags when hiring an IT company' },

    { c: 'buyer-role', q: 'IT provider for a 25 person office near {city}' },
    { c: 'buyer-role', q: 'office manager looking for IT support near {city}' },
    { c: 'buyer-role', q: 'IT services for a school or private school in {state}' },
    { c: 'buyer-role', q: 'IT support for a manufacturing company in {state}' },
  ],

  directoryDomains: [
    // Found in live validation, 2026-09-21: directories, matching services and review sites.
    'cloudtango.net', 'mymsphub.com',
    'yelp.com', 'bbb.org', 'yellowpages.com', 'birdeye.com', 'expertise.com', 'bark.com',
    'thumbtack.com', 'clutch.co', 'goodfirms.co', 'designrush.com', 'upcity.com', 'g2.com',
    'capterra.com', 'techbehemoths.com', 'itfirms.co', 'justdial.com', 'facebook.com',
    'instagram.com', 'linkedin.com', 'mapquest.com', 'manta.com', 'chamberofcommerce.com',
    'superpages.com', 'upwork.com', 'indeed.com', 'glassdoor.com',
  ],

  referenceDomains: [
    // Found in live validation, 2026-09-21: publishers, health systems, insurers, plan
    // sellers and software vendors that don't compete for the client.
    'manageengine.com', 'solarwinds.com', 'amazon.com', 'atlassian.com',
    'wikipedia.org', 'reddit.com', 'quora.com', 'youtube.com',
    'cisa.gov', 'nist.gov', 'ftc.gov', 'fbi.gov', 'ic3.gov', 'hhs.gov', 'sba.gov', 'dodcio.defense.gov',
    'pcisecuritystandards.org', 'comptia.org', 'mspalliance.com', 'crn.com', 'channele2e.com',
    'msspalert.com', 'techtarget.com', 'zdnet.com', 'pcmag.com', 'techrepublic.com',
    'forbes.com', 'investopedia.com', 'gartner.com', 'ibm.com',
    'microsoft.com', 'google.com', 'cisco.com', 'fortinet.com', 'sonicwall.com',
    'crowdstrike.com', 'sentinelone.com', 'connectwise.com', 'kaseya.com', 'datto.com',
    'n-able.com', 'huntress.com', 'knowbe4.com',
    'patch.com', 'einpresswire.com', 'prnewswire.com', 'businesswire.com', 'globenewswire.com',
  ],
}
