import type { CannedPanelDefinition } from './index'

/**
 * Municipal advisors: firms advising towns, counties, school districts,
 * utilities, and authorities on issuing debt. Buyers are finance directors,
 * treasurers, and school business administrators.
 *
 * There are no permits here; the equivalent is SEC and MSRB regulation, so
 * this panel uses a "regulation" category instead.
 *
 * Written 2026-09-18. Validate against a known business before relying on it.
 */
export const municipalAdvisors: CannedPanelDefinition = {
  slug: 'municipal-advisors',
  name: 'Municipal advisors',

  questions: [
    { c: 'service-geo', q: '{service} firms in {state}' },
    { c: 'service-geo', q: 'municipal advisors in {state}' },
    { c: 'service-geo', q: 'independent municipal advisor near {city}, {state}' },
    { c: 'service-geo', q: 'financial advisor for a school district bond issue in {state}' },
    { c: 'service-geo', q: 'municipal advisor for a county bond sale in {state}' },
    { c: 'service-geo', q: 'municipal advisory firms that work with small towns in {state}' },
    { c: 'service-geo', q: 'best municipal advisors in {state}' },
    { c: 'service-geo', q: 'municipal advisor for water and sewer utility financing in {state}' },
    { c: 'service-geo', q: 'MSRB registered municipal advisors in {state}' },
    { c: 'service-geo', q: 'bond advisor for a fire district or library district in {state}' },

    { c: 'cost', q: 'how much does a municipal advisor charge' },
    { c: 'cost', q: 'typical municipal advisor fee for a bond issue' },
    { c: 'cost', q: 'hourly vs contingent fees for municipal advisors' },
    { c: 'cost', q: 'what is included in cost of issuance for a municipal bond' },
    { c: 'cost', q: 'typical cost of issuance for a school bond' },
    { c: 'cost', q: 'are municipal advisor fees paid from bond proceeds' },
    { c: 'cost', q: 'how to reduce cost of issuance on a bond sale' },

    { c: 'regulation', q: 'what is the SEC municipal advisor rule' },
    { c: 'regulation', q: 'fiduciary duty of a municipal advisor' },
    { c: 'regulation', q: 'SEC municipal advisor registration requirements' },
    { c: 'regulation', q: 'MSRB Rule G-42 municipal advisor duties' },
    { c: 'regulation', q: 'can an underwriter also act as municipal advisor on the same deal' },
    { c: 'regulation', q: 'continuing disclosure requirements for municipal bond issuers' },
    { c: 'regulation', q: 'Series 50 exam requirement for municipal advisors' },
    { c: 'regulation', q: 'is a local government required to hire a municipal advisor in {state}' },

    { c: 'comparison', q: 'municipal advisor vs underwriter what is the difference' },
    { c: 'comparison', q: 'competitive vs negotiated bond sale which is better' },
    { c: 'comparison', q: 'bank loan vs public bond issue for a small municipality' },
    { c: 'comparison', q: 'general obligation vs revenue bonds' },
    { c: 'comparison', q: 'independent municipal advisor vs broker-dealer financial advisor' },
    { c: 'comparison', q: 'direct placement vs public offering for municipal debt' },

    { c: 'technical', q: 'how does a municipal bond sale work step by step' },
    { c: 'technical', q: 'how do rating agencies rate a municipality' },
    { c: 'technical', q: 'what is a preliminary official statement' },
    { c: 'technical', q: 'how long does it take to issue municipal bonds' },
    { c: 'technical', q: 'what is a bond anticipation note' },
    { c: 'technical', q: 'how to prepare for a bond rating agency call' },
    { c: 'technical', q: 'what is a debt service schedule' },
    { c: 'technical', q: 'what does bond counsel do on a municipal bond issue' },

    { c: 'application', q: 'refinancing outstanding municipal bonds to save interest' },
    { c: 'application', q: 'financing a new school building with bonds in {state}' },
    { c: 'application', q: 'funding water system upgrades with municipal bonds' },
    { c: 'application', q: 'capital improvement plan financing options for a town' },
    { c: 'application', q: 'using bond anticipation notes for short term financing' },
    { c: 'application', q: 'financing a public safety building for a small town' },
    { c: 'application', q: 'advance refunding vs current refunding' },

    { c: 'vendor-selection', q: 'how to hire a municipal advisor' },
    { c: 'vendor-selection', q: 'municipal advisor RFP template' },
    { c: 'vendor-selection', q: 'questions to ask a municipal advisor before hiring' },
    { c: 'vendor-selection', q: 'how to evaluate municipal advisor proposals' },
    { c: 'vendor-selection', q: 'how to check if a municipal advisor is registered' },
    { c: 'vendor-selection', q: 'what experience should a municipal advisor have' },
    { c: 'vendor-selection', q: 'how often should a municipality rebid its municipal advisor' },

    { c: 'problem', q: 'bond rating downgrade what should a town do' },
    { c: 'problem', q: 'failed bond referendum next steps' },
    { c: 'problem', q: 'interest rates rising before a planned bond sale' },
    { c: 'problem', q: 'missed continuing disclosure filing how to fix' },
    { c: 'problem', q: 'too few bids on a competitive bond sale' },

    { c: 'buyer-role', q: 'school business administrator needs a financial advisor for a bond referendum in {state}' },
    { c: 'buyer-role', q: 'county treasurer looking for a municipal advisor in {state}' },
    { c: 'buyer-role', q: 'small town finance director needs debt management advice' },
    { c: 'buyer-role', q: 'municipal utility authority financial advisor in {state}' },
    { c: 'buyer-role', q: 'housing authority bond financing advisor' },
    { c: 'buyer-role', q: 'conduit bond financing advisor for a nonprofit hospital in {state}' },
  ],

  directoryDomains: [
    'linkedin.com', 'zoominfo.com', 'dnb.com', 'manta.com', 'bizapedia.com', 'opencorporates.com',
    'crunchbase.com', 'rocketreach.co', 'yelp.com', 'bbb.org', 'facebook.com', 'mapquest.com',
  ],

  referenceDomains: [
    'wikipedia.org', 'reddit.com', 'quora.com', 'youtube.com', 'investopedia.com',
    'msrb.org', 'sec.gov', 'finra.org', 'govinfo.gov', 'ecfr.gov', 'federalregister.gov', 'law.cornell.edu',
    'municipaladvisors.org', 'gfoa.org', 'nfma.org', 'sifma.org', 'nabl.org',
    'moodys.com', 'spglobal.com', 'fitchratings.com', 'kbra.com',
    'bondbuyer.com', 'bloomberg.com', 'reuters.com',
    // Research and association-hosted documents, not advisory firms.
    'brookings.edu', 'ymaws.com',
    'patch.com', 'einpresswire.com', 'prnewswire.com', 'businesswire.com', 'globenewswire.com',
  ],
}
