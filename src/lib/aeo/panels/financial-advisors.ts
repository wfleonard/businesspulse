import type { CannedPanelDefinition } from './index'

/**
 * Financial advisors: independent RIAs, fee-only planners, and wealth
 * managers. Buyers are pre-retirees and retirees, business owners, widows
 * and inheritors, and professionals.
 *
 * Questions are about choosing and paying for an advisor, never about which
 * investment to buy. Rules questions use the "regulation" category, as the
 * municipal advisors panel does: licensing and fiduciary duty, not permits.
 *
 * Written 2026-09-21. Validate against a known business before relying on it.
 */
export const financialAdvisors: CannedPanelDefinition = {
  slug: 'financial-advisors',
  name: 'Financial advisors',

  questions: [
    { c: 'service-geo', q: '{service} near {city}, {state}' },
    { c: 'service-geo', q: 'financial advisors near {city}, {state}' },
    { c: 'service-geo', q: 'fee only financial planner near {city}' },
    { c: 'service-geo', q: 'fiduciary financial advisors in {state}' },
    { c: 'service-geo', q: 'retirement planning advisor near {city}, {state}' },
    { c: 'service-geo', q: 'wealth management firms near {city}' },
    { c: 'service-geo', q: 'best independent financial advisors in {state}' },
    { c: 'service-geo', q: 'certified financial planner near {city}' },
    { c: 'service-geo', q: 'financial advisor for small business owners in {state}' },
    { c: 'service-geo', q: 'tax planning and financial advisor near {city}' },

    { c: 'cost', q: 'how much does a financial advisor cost' },
    { c: 'cost', q: 'what is a typical assets under management fee' },
    { c: 'cost', q: 'flat fee vs percentage financial advisor' },
    { c: 'cost', q: 'how much does a one time financial plan cost' },
    { c: 'cost', q: 'is a financial advisor worth the fee' },
    { c: 'cost', q: 'minimum assets to hire a financial advisor' },
    { c: 'cost', q: 'hidden fees to ask a financial advisor about' },
    { c: 'cost', q: 'hourly financial planner cost' },

    { c: 'regulation', q: 'what does fiduciary mean for a financial advisor' },
    { c: 'regulation', q: 'how to check a financial advisor on BrokerCheck' },
    { c: 'regulation', q: 'what is a registered investment adviser' },
    { c: 'regulation', q: 'what is Form ADV and how do I read it' },
    { c: 'regulation', q: 'financial advisor registration requirements in {state}' },
    { c: 'regulation', q: 'how to report a financial advisor for misconduct' },
    { c: 'regulation', q: 'what is Regulation Best Interest' },

    { c: 'comparison', q: 'fee only vs fee based financial advisor' },
    { c: 'comparison', q: 'financial advisor vs robo advisor' },
    { c: 'comparison', q: 'CFP vs CFA vs financial advisor' },
    { c: 'comparison', q: 'independent advisor vs a big brokerage firm' },
    { c: 'comparison', q: 'financial planner vs wealth manager' },
    { c: 'comparison', q: 'financial advisor vs accountant for retirement planning' },

    { c: 'technical', q: 'what does a financial advisor do' },
    { c: 'technical', q: 'what happens at a first meeting with a financial advisor' },
    { c: 'technical', q: 'what documents to bring to a financial advisor' },
    { c: 'technical', q: 'how often should I meet with my financial advisor' },
    { c: 'technical', q: 'what is comprehensive financial planning' },
    { c: 'technical', q: 'what is a custodian and why does it matter' },
    { c: 'technical', q: 'when should I hire a financial advisor' },
    { c: 'technical', q: 'how do financial advisors get paid' },

    { c: 'application', q: 'financial advisor for someone about to retire' },
    { c: 'application', q: 'financial planning after the death of a spouse' },
    { c: 'application', q: 'advisor for selling a small business' },
    { c: 'application', q: 'managing an inheritance' },
    { c: 'application', q: 'rolling over a 401k when changing jobs' },
    { c: 'application', q: 'Social Security claiming strategy help' },

    { c: 'problem', q: 'not happy with my financial advisor what should I do' },
    { c: 'problem', q: 'how to switch financial advisors' },
    { c: 'problem', q: 'my advisor keeps selling me annuities' },
    { c: 'problem', q: 'paying too much in fees on my investments' },
    { c: 'problem', q: 'advisor retired and my account was transferred' },

    { c: 'vendor-selection', q: 'questions to ask a financial advisor before hiring' },
    { c: 'vendor-selection', q: 'how to choose a financial advisor' },
    { c: 'vendor-selection', q: 'red flags when choosing a financial advisor' },
    { c: 'vendor-selection', q: 'how to interview a financial planner' },
    { c: 'vendor-selection', q: 'are financial advisor matching services worth using' },
    { c: 'vendor-selection', q: 'what credentials should a financial advisor have' },

    { c: 'buyer-role', q: 'financial advisor for doctors or dentists in {state}' },
    { c: 'buyer-role', q: 'financial advisor for a widow near {city}' },
    { c: 'buyer-role', q: 'retirement plan advisor for a small business 401k in {state}' },
    { c: 'buyer-role', q: 'financial planner for young professionals near {city}' },
  ],

  directoryDomains: [
    // Found in live validation, 2026-09-21: directories, matching services and review sites.
    'plannersearch.org', 'feeonlynetwork.com', 'flat-fee-financial-advisors.com',
    'getwarmer.com', 'harness.co',
    'yelp.com', 'bbb.org', 'yellowpages.com', 'birdeye.com', 'expertise.com', 'bark.com',
    'smartasset.com', 'wiseradvisor.com', 'indyfin.com', 'zoefin.com', 'wealthtender.com',
    'advisorcheck.com', 'brightscope.com', 'paladinregistry.com', 'facebook.com',
    'instagram.com', 'linkedin.com', 'mapquest.com', 'manta.com', 'chamberofcommerce.com',
    'superpages.com',
  ],

  referenceDomains: [
    // Found in live validation, 2026-09-21: publishers, health systems, insurers, plan
    // sellers and software vendors that don't compete for the client.
    'financestrategists.com', 'wallstreetmojo.com', 'kitces.com', 'aol.com', 'yahoo.com',
    'envestnet.com', 'troweprice.com', 'truthifi.com', 'carry.com', 'sofi.com',
    'wikipedia.org', 'reddit.com', 'quora.com', 'youtube.com',
    'sec.gov', 'investor.gov', 'finra.org', 'nasaa.org', 'irs.gov', 'ssa.gov', 'dol.gov',
    'consumerfinance.gov', 'cfp.net', 'letsmakeaplan.org', 'napfa.org', 'fpanet.org',
    'cfainstitute.org', 'investopedia.com', 'kiplinger.com', 'morningstar.com', 'forbes.com',
    'bankrate.com', 'nerdwallet.com', 'cnbc.com', 'barrons.com', 'wsj.com', 'marketwatch.com',
    'thebalancemoney.com', 'fool.com', 'aarp.org', 'money.com', 'usnews.com',
    'vanguard.com', 'fidelity.com', 'schwab.com',
    'patch.com', 'einpresswire.com', 'prnewswire.com', 'businesswire.com', 'globenewswire.com',
  ],
}
