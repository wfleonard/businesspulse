import type { CannedPanelDefinition } from './index'

/**
 * Commercial cleaning and janitorial: office cleaning, medical and dental
 * offices, schools, industrial and warehouse, post-construction cleaning,
 * floor care, and disinfection. Buyers are office and facility managers,
 * property managers, medical practices, and business owners.
 *
 * Franchise brands (Jan-Pro, Coverall, Anago) are competitors, not directories.
 *
 * Written 2026-09-21. Validate against a known business before relying on it.
 */
export const commercialCleaning: CannedPanelDefinition = {
  slug: 'commercial-cleaning',
  name: 'Commercial cleaning & janitorial',

  questions: [
    { c: 'service-geo', q: '{service} near {city}, {state}' },
    { c: 'service-geo', q: 'commercial cleaning companies near {city}, {state}' },
    { c: 'service-geo', q: 'office cleaning services near {city}' },
    { c: 'service-geo', q: 'janitorial services in {state}' },
    { c: 'service-geo', q: 'medical office cleaning near {city}, {state}' },
    { c: 'service-geo', q: 'post construction cleaning companies near {city}' },
    { c: 'service-geo', q: 'commercial floor stripping and waxing near {city}' },
    { c: 'service-geo', q: 'warehouse and industrial cleaning in {state}' },
    { c: 'service-geo', q: 'best janitorial companies in {state}' },
    { c: 'service-geo', q: 'school and daycare cleaning services near {city}' },

    { c: 'cost', q: 'how much does commercial cleaning cost per square foot' },
    { c: 'cost', q: 'office cleaning prices per month' },
    { c: 'cost', q: 'janitorial service cost in {state}' },
    { c: 'cost', q: 'post construction cleaning cost per square foot' },
    { c: 'cost', q: 'floor stripping and waxing cost per square foot' },
    { c: 'cost', q: 'in-house janitor vs cleaning company cost' },
    { c: 'cost', q: 'how often should an office be cleaned and what does it cost' },
    { c: 'cost', q: 'medical office cleaning cost' },

    { c: 'permits', q: 'OSHA requirements for commercial cleaning companies' },
    { c: 'permits', q: 'bloodborne pathogen rules for medical office cleaning' },
    { c: 'permits', q: 'does a cleaning company need a license in {state}' },
    { c: 'permits', q: 'insurance and bonding a commercial cleaning company should carry' },
    { c: 'permits', q: 'green cleaning certification requirements for buildings' },
    { c: 'permits', q: 'EPA registered disinfectants for commercial cleaning' },

    { c: 'comparison', q: 'franchise cleaning company vs independent janitorial service' },
    { c: 'comparison', q: 'day porter vs nightly janitorial service' },
    { c: 'comparison', q: 'commercial cleaning vs janitorial services' },
    { c: 'comparison', q: 'electrostatic spraying vs manual disinfection' },
    { c: 'comparison', q: 'Jan-Pro vs Coverall vs a local cleaning company' },
    { c: 'comparison', q: 'monthly contract vs one time deep clean' },

    { c: 'technical', q: 'what is included in a commercial cleaning contract' },
    { c: 'technical', q: 'what does a janitorial scope of work include' },
    { c: 'technical', q: 'how to write a cleaning RFP' },
    { c: 'technical', q: 'how to measure cleaning quality with inspections' },
    { c: 'technical', q: 'what is the APPA cleaning standard' },
    { c: 'technical', q: 'how long does post construction cleaning take' },
    { c: 'technical', q: 'how often should commercial carpets be deep cleaned' },
    { c: 'technical', q: 'what is a day porter and what do they do' },

    { c: 'application', q: 'cleaning for a dental or medical practice' },
    { c: 'application', q: 'cleaning for a gym or fitness studio' },
    { c: 'application', q: 'cleaning a restaurant after hours' },
    { c: 'application', q: 'turnover cleaning for vacant commercial space' },
    { c: 'application', q: 'cleaning a multi-tenant office building' },

    { c: 'problem', q: 'cleaning company keeps missing tasks' },
    { c: 'problem', q: 'high turnover of cleaning staff at our office' },
    { c: 'problem', q: 'office restrooms not clean enough' },
    { c: 'problem', q: 'security concerns with after hours cleaners' },
    { c: 'problem', q: 'how to fire a janitorial company' },
    { c: 'problem', q: 'cleaning supplies running out between visits' },

    { c: 'vendor-selection', q: 'questions to ask a commercial cleaning company' },
    { c: 'vendor-selection', q: 'how to compare janitorial bids' },
    { c: 'vendor-selection', q: 'what is CIMS certification for cleaning companies' },
    { c: 'vendor-selection', q: 'do cleaning companies background check employees' },
    { c: 'vendor-selection', q: 'how to switch commercial cleaning companies' },
    { c: 'vendor-selection', q: 'what should a cleaning service agreement include' },

    { c: 'buyer-role', q: 'janitorial vendor for a property management company near {city}' },
    { c: 'buyer-role', q: 'office manager looking for a cleaning service near {city}' },
    { c: 'buyer-role', q: 'cleaning contractor for a general contractor final clean in {state}' },
    { c: 'buyer-role', q: 'janitorial services for a school district in {state}' },
    { c: 'buyer-role', q: 'public bid janitorial contracts in {state}' },
  ],

  directoryDomains: [
    // Found in live validation, 2026-09-21: directories, marketplaces and review sites.
    'care.com',
    'yelp.com', 'bbb.org', 'angi.com', 'homeadvisor.com', 'thumbtack.com', 'yellowpages.com',
    'bark.com', 'birdeye.com', 'justdial.com', 'expertise.com', 'bestpickreports.com',
    'consumeraffairs.com', 'bestcompany.com', 'thebluebook.com', 'nextdoor.com', 'facebook.com',
    'instagram.com', 'linkedin.com', 'mapquest.com', 'manta.com', 'chamberofcommerce.com',
    'superpages.com', 'indeed.com', 'glassdoor.com',
  ],

  referenceDomains: [
    // Found in live validation, 2026-09-21: publishers, research, insurers, lenders,
    // software, manufacturers and document hosts that don't compete for the job.
    'foremanpro.com',
    'wikipedia.org', 'reddit.com', 'quora.com', 'youtube.com',
    'osha.gov', 'epa.gov', 'cdc.gov', 'usgbc.org', 'greenseal.org', 'issa.com', 'bscai.org',
    'appa.org', 'cmmonline.com', 'cleanlink.com', 'facilitiesnet.com', 'buildings.com',
    'bomaonline.org', 'boma.org', 'irem.org', 'forbes.com', 'nerdwallet.com', 'investopedia.com',
    'sba.gov', 'swept.com', 'janitorialmanager.com', 'cleanguru.com',
    'ecolab.com', 'diversey.com', 'uline.com', 'clorox.com', 'tennantco.com',
    'patch.com', 'einpresswire.com', 'prnewswire.com', 'businesswire.com', 'globenewswire.com',
  ],
}
