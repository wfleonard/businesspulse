import type { CannedPanelDefinition } from './index'

/**
 * Kitchen remodelers: full kitchen renovations, cabinets and countertops,
 * layout changes, and design-build kitchen firms. Mostly homeowner buyers,
 * plus landlords and small restaurant or office kitchens.
 *
 * Written 2026-09-21. Validate against a known business before relying on it.
 */
export const kitchenRemodeling: CannedPanelDefinition = {
  slug: 'kitchen-remodeling',
  name: 'Kitchen remodeling',

  questions: [
    { c: 'service-geo', q: '{service} near {city}, {state}' },
    { c: 'service-geo', q: 'kitchen remodeling contractors near {city}, {state}' },
    { c: 'service-geo', q: 'kitchen designers near {city}' },
    { c: 'service-geo', q: 'best kitchen remodelers in {state}' },
    { c: 'service-geo', q: 'custom kitchen cabinet makers near {city}' },
    { c: 'service-geo', q: 'kitchen and bath showrooms near {city}, {state}' },
    { c: 'service-geo', q: 'cabinet refacing companies near {city}' },
    { c: 'service-geo', q: 'quartz countertop installers near {city}, {state}' },
    { c: 'service-geo', q: 'design build kitchen renovation firms in {state}' },
    { c: 'service-geo', q: 'small kitchen remodel contractors near {city}' },

    { c: 'cost', q: 'how much does a kitchen remodel cost' },
    { c: 'cost', q: 'kitchen remodel cost in {state}' },
    { c: 'cost', q: 'cost of a small kitchen remodel' },
    { c: 'cost', q: 'how much do new kitchen cabinets cost' },
    { c: 'cost', q: 'cabinet refacing vs replacement cost' },
    { c: 'cost', q: 'quartz vs granite countertop cost' },
    { c: 'cost', q: 'cost to move a kitchen sink or appliances' },
    { c: 'cost', q: 'kitchen remodel return on investment' },
    { c: 'cost', q: 'how much should I budget for a kitchen renovation' },

    { c: 'permits', q: 'do I need a permit for a kitchen remodel in {city}, {state}' },
    { c: 'permits', q: 'home improvement contractor license requirements in {state}' },
    { c: 'permits', q: 'electrical code requirements for kitchen outlets' },
    { c: 'permits', q: 'range hood venting code requirements' },
    { c: 'permits', q: 'can I remove a load bearing wall to open a kitchen' },
    { c: 'permits', q: 'gas line permit for moving a range' },

    { c: 'comparison', q: 'quartz vs granite countertops' },
    { c: 'comparison', q: 'custom vs semi custom vs stock cabinets' },
    { c: 'comparison', q: 'cabinet refacing vs new cabinets' },
    { c: 'comparison', q: 'kitchen designer vs design build contractor' },
    { c: 'comparison', q: 'kitchen island vs peninsula' },
    { c: 'comparison', q: 'big box store kitchen remodel vs local contractor' },
    { c: 'comparison', q: 'framed vs frameless cabinets' },

    { c: 'technical', q: 'how long does a kitchen remodel take' },
    { c: 'technical', q: 'kitchen remodel steps in order' },
    { c: 'technical', q: 'how to live without a kitchen during a remodel' },
    { c: 'technical', q: 'what is the kitchen work triangle' },
    { c: 'technical', q: 'how long do kitchen cabinets last' },
    { c: 'technical', q: 'what countertop material lasts longest' },
    { c: 'technical', q: 'how far in advance should I plan a kitchen remodel' },
    { c: 'technical', q: 'what flooring works best in a kitchen' },

    { c: 'application', q: 'opening a kitchen to the living room' },
    { c: 'application', q: 'kitchen remodel in an older home' },
    { c: 'application', q: 'accessible kitchen design for aging in place' },
    { c: 'application', q: 'kitchen remodel in a condo with building rules' },
    { c: 'application', q: 'adding a kitchen island with seating' },

    { c: 'problem', q: 'kitchen remodel going over budget' },
    { c: 'problem', q: 'cabinets delayed during a kitchen remodel' },
    { c: 'problem', q: 'water damage under the kitchen sink' },
    { c: 'problem', q: 'kitchen too small or no counter space' },
    { c: 'problem', q: 'contractor left the kitchen unfinished' },
    { c: 'problem', q: 'countertop cracked or seam separating' },

    { c: 'vendor-selection', q: 'questions to ask a kitchen remodeler before hiring' },
    { c: 'vendor-selection', q: 'how to compare kitchen remodel quotes' },
    { c: 'vendor-selection', q: 'what should a kitchen remodel contract include' },
    { c: 'vendor-selection', q: 'what is an NKBA certified designer' },
    { c: 'vendor-selection', q: 'red flags when hiring a kitchen contractor' },
    { c: 'vendor-selection', q: 'should the contractor or I buy the appliances' },

    { c: 'buyer-role', q: 'kitchen renovation for a rental property near {city}' },
    { c: 'buyer-role', q: 'kitchen remodel before selling a house in {state}' },
    { c: 'buyer-role', q: 'commercial kitchen build out contractor near {city}' },
    { c: 'buyer-role', q: 'office break room kitchen renovation near {city}' },
  ],

  directoryDomains: [
    // Found in live validation, 2026-09-21: review and lead sites.
    'generalcontractors.org',
    'yelp.com', 'bbb.org', 'angi.com', 'angieslist.com', 'homeadvisor.com', 'thumbtack.com',
    'houzz.com', 'yellowpages.com', 'nextdoor.com', 'porch.com', 'bark.com', 'networx.com',
    'buildzoom.com', 'homeguide.com', 'fixr.com', 'modernize.com', 'sweeten.com', 'birdeye.com',
    'bestpickreports.com', 'consumeraffairs.com', 'facebook.com', 'instagram.com',
    'linkedin.com', 'mapquest.com', 'manta.com', 'chamberofcommerce.com', 'superpages.com',
  ],

  referenceDomains: [
    // Found in live validation, 2026-09-21: publishers, cost and code sites, insurers and
    // suppliers that answers cite but that don't compete for the job.
    'housebeautiful.com', 'up.codes', 'masterbrandcabinets.com', 'eatontownnj.com',
    'realcostiq.com', 'mykukun.com', 'kitchencabinetkings.com',
    'wikipedia.org', 'reddit.com', 'quora.com', 'youtube.com',
    'iccsafe.org', 'epa.gov', 'energystar.gov', 'nfpa.org', 'nkba.org', 'nari.org',
    'remodeling.hw.net', 'thisoldhouse.com', 'bobvila.com', 'familyhandyman.com', 'thespruce.com',
    'bhg.com', 'hgtv.com', 'architecturaldigest.com', 'todayshomeowner.com',
    'consumerreports.org', 'forbes.com', 'bankrate.com', 'nerdwallet.com',
    'homedepot.com', 'lowes.com', 'ikea.com', 'kraftmaid.com', 'masterbrand.com', 'merillat.com',
    'caesarstone.com', 'cosentino.com', 'msisurfaces.com', 'kohler.com', 'moen.com',
    'subzero-wolf.com',
    'patch.com', 'einpresswire.com', 'prnewswire.com', 'businesswire.com', 'globenewswire.com',
  ],
}
