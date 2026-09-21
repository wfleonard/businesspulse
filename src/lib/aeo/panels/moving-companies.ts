import type { CannedPanelDefinition } from './index'

/**
 * Moving companies: local and long distance household moves, packing,
 * storage, specialty items, and office relocation. Homeowner and renter
 * buyers, plus seniors downsizing, businesses, and real estate agents.
 *
 * Truck rental brands are listed as references, not competitors: they are
 * the do-it-yourself alternative, not another mover.
 *
 * Written 2026-09-21. Validate against a known business before relying on it.
 */
export const movingCompanies: CannedPanelDefinition = {
  slug: 'moving-companies',
  name: 'Moving companies',

  questions: [
    { c: 'service-geo', q: '{service} near {city}, {state}' },
    { c: 'service-geo', q: 'moving companies near {city}, {state}' },
    { c: 'service-geo', q: 'best local movers in {state}' },
    { c: 'service-geo', q: 'long distance movers from {state}' },
    { c: 'service-geo', q: 'piano movers near {city}' },
    { c: 'service-geo', q: 'packing services near {city}, {state}' },
    { c: 'service-geo', q: 'office relocation companies near {city}' },
    { c: 'service-geo', q: 'senior moving and downsizing services near {city}' },
    { c: 'service-geo', q: 'moving and storage companies in {state}' },
    { c: 'service-geo', q: 'last minute movers near {city}, {state}' },

    { c: 'cost', q: 'how much do movers cost' },
    { c: 'cost', q: 'local movers cost per hour in {state}' },
    { c: 'cost', q: 'long distance moving cost' },
    { c: 'cost', q: 'how much does it cost to move a 3 bedroom house' },
    { c: 'cost', q: 'cost of packing services' },
    { c: 'cost', q: 'how much to tip movers' },
    { c: 'cost', q: 'moving insurance and valuation cost' },
    { c: 'cost', q: 'binding vs non binding moving estimate' },
    { c: 'cost', q: 'cheapest time of year to move' },

    { c: 'permits', q: 'how to check a mover USDOT number' },
    { c: 'permits', q: 'moving company license requirements in {state}' },
    { c: 'permits', q: 'your rights and responsibilities when you move' },
    { c: 'permits', q: 'do I need a parking permit for a moving truck in {city}' },
    { c: 'permits', q: 'how to file a complaint against a moving company' },
    { c: 'permits', q: 'what is full value protection vs released value' },

    { c: 'comparison', q: 'full service movers vs rental truck' },
    { c: 'comparison', q: 'moving company vs moving broker' },
    { c: 'comparison', q: 'PODS vs hiring movers' },
    { c: 'comparison', q: 'local mover vs national van line' },
    { c: 'comparison', q: 'hourly vs flat rate movers' },
    { c: 'comparison', q: 'moving labor only vs full service move' },

    { c: 'technical', q: 'how far in advance should I book movers' },
    { c: 'technical', q: 'what movers will not move' },
    { c: 'technical', q: 'how long does a local move take' },
    { c: 'technical', q: 'how long does a long distance move take to deliver' },
    { c: 'technical', q: 'what is an in-home or virtual moving survey' },
    { c: 'technical', q: 'moving checklist timeline' },
    { c: 'technical', q: 'how do movers protect furniture and floors' },
    { c: 'technical', q: 'what should I pack myself and what should movers pack' },

    { c: 'application', q: 'moving an elderly parent into assisted living' },
    { c: 'application', q: 'moving a gun safe or pool table' },
    { c: 'application', q: 'moving out of a high rise apartment' },
    { c: 'application', q: 'storage between selling and buying a house' },
    { c: 'application', q: 'moving a small business office over a weekend' },

    { c: 'problem', q: 'movers damaged my furniture what can I do' },
    { c: 'problem', q: 'moving company holding my belongings hostage' },
    { c: 'problem', q: 'final moving bill much higher than the estimate' },
    { c: 'problem', q: 'movers showed up late or did not show up' },
    { c: 'problem', q: 'items lost during a move' },
    { c: 'problem', q: 'moving day falls through after closing is delayed' },

    { c: 'vendor-selection', q: 'questions to ask movers before hiring' },
    { c: 'vendor-selection', q: 'how to spot a moving scam' },
    { c: 'vendor-selection', q: 'how to compare moving quotes' },
    { c: 'vendor-selection', q: 'how many moving estimates should I get' },
    { c: 'vendor-selection', q: 'are online moving quote sites legit' },
    { c: 'vendor-selection', q: 'red flags when hiring a moving company' },

    { c: 'buyer-role', q: 'movers recommended by real estate agents near {city}' },
    { c: 'buyer-role', q: 'commercial movers for a company relocation in {state}' },
    { c: 'buyer-role', q: 'corporate relocation moving company in {state}' },
    { c: 'buyer-role', q: 'movers for a college student near {city}' },
  ],

  directoryDomains: [
    // Found in live validation, 2026-09-21: directories, marketplaces and review sites.
    'movers.com', 'moveadvisor.com', 'moverscorecard.com', 'movingrated.com', 'airtasker.com',
    'goloadup.com', 'sparefoot.com',
    'yelp.com', 'bbb.org', 'angi.com', 'angieslist.com', 'homeadvisor.com', 'thumbtack.com',
    'yellowpages.com', 'nextdoor.com', 'bark.com', 'birdeye.com', 'bestpickreports.com',
    'consumeraffairs.com', 'bestcompany.com', 'justdial.com', 'expertise.com', 'moving.com',
    'mymovingreviews.com', 'movingscam.com', 'hireahelper.com', 'unpakt.com', 'movebuddha.com',
    'movingapt.com', 'porch.com', 'facebook.com', 'instagram.com', 'linkedin.com',
    'mapquest.com', 'manta.com', 'chamberofcommerce.com', 'superpages.com',
  ],

  referenceDomains: [
    // Found in live validation, 2026-09-21: publishers, research, insurers, lenders,
    // software, manufacturers and document hosts that don't compete for the job.
    'move.org', 'thisoldhouse.com', 'extraspace.com',
    'wikipedia.org', 'reddit.com', 'quora.com', 'youtube.com',
    'fmcsa.dot.gov', 'protectyourmove.gov', 'transportation.gov', 'ftc.gov', 'usps.com',
    'moving.org', 'forbes.com', 'bankrate.com', 'nerdwallet.com', 'investopedia.com',
    'thespruce.com', 'apartmenttherapy.com', 'realtor.com', 'zillow.com', 'redfin.com',
    'consumerreports.org', 'uhaul.com', 'budgettruck.com', 'pensketruckrental.com',
    'enterprisetrucks.com', 'homedepot.com', 'lowes.com', 'uline.com',
    'patch.com', 'einpresswire.com', 'prnewswire.com', 'businesswire.com', 'globenewswire.com',
  ],
}
