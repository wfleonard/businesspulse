import type { CannedPanelDefinition } from './index'

/**
 * General contractors: additions, whole-house renovations, custom homes, and
 * light commercial build-outs. Homeowner buyers, plus small business owners,
 * landlords, and architects looking for a builder.
 *
 * Kitchen and bathroom remodeling are separate panels; this one covers the
 * contractor who runs the whole job.
 *
 * Written 2026-09-21. Validate against a known business before relying on it.
 */
export const generalContractors: CannedPanelDefinition = {
  slug: 'general-contractors',
  name: 'General contracting',

  questions: [
    { c: 'service-geo', q: '{service} near {city}, {state}' },
    { c: 'service-geo', q: 'general contractors near {city}, {state}' },
    { c: 'service-geo', q: 'home addition contractors in {state}' },
    { c: 'service-geo', q: 'whole house renovation contractors near {city}' },
    { c: 'service-geo', q: 'custom home builders near {city}, {state}' },
    { c: 'service-geo', q: 'design build firms near {city}' },
    { c: 'service-geo', q: 'best general contractors in {state}' },
    { c: 'service-geo', q: 'commercial tenant fit out contractors near {city}' },
    { c: 'service-geo', q: 'licensed home improvement contractors in {state}' },
    { c: 'service-geo', q: 'second story addition builders near {city}, {state}' },

    { c: 'cost', q: 'how much does a home addition cost per square foot' },
    { c: 'cost', q: 'cost to build a house in {state}' },
    { c: 'cost', q: 'how much does a whole house renovation cost' },
    { c: 'cost', q: 'how much do general contractors charge' },
    { c: 'cost', q: 'general contractor markup percentage' },
    { c: 'cost', q: 'cost of a second story addition' },
    { c: 'cost', q: 'fixed price vs cost plus construction contract' },
    { c: 'cost', q: 'how much does a commercial office build out cost per square foot' },
    { c: 'cost', q: 'how to budget for construction change orders' },

    { c: 'permits', q: 'building permit requirements for a home addition in {city}, {state}' },
    { c: 'permits', q: 'home improvement contractor license requirements in {state}' },
    { c: 'permits', q: 'how long does a building permit take in {city}' },
    { c: 'permits', q: 'zoning setback rules for a home addition' },
    { c: 'permits', q: 'what inspections are required during a home addition' },
    { c: 'permits', q: 'do I need an architect for a building permit' },
    { c: 'permits', q: 'certificate of occupancy after a renovation' },

    { c: 'comparison', q: 'general contractor vs design build firm' },
    { c: 'comparison', q: 'hire a general contractor or manage subcontractors myself' },
    { c: 'comparison', q: 'build an addition vs move to a bigger house' },
    { c: 'comparison', q: 'renovate vs tear down and rebuild' },
    { c: 'comparison', q: 'general contractor vs construction manager' },
    { c: 'comparison', q: 'bump out vs full addition' },

    { c: 'technical', q: 'how long does a home addition take to build' },
    { c: 'technical', q: 'what does a general contractor do' },
    { c: 'technical', q: 'construction project timeline from design to move in' },
    { c: 'technical', q: 'can I live in my house during a major renovation' },
    { c: 'technical', q: 'what is a construction draw schedule' },
    { c: 'technical', q: 'what is a punch list' },
    { c: 'technical', q: 'what is a lien waiver and why does it matter' },
    { c: 'technical', q: 'how does a construction loan work' },

    { c: 'application', q: 'accessible first floor suite addition for aging in place' },
    { c: 'application', q: 'garage conversion into living space' },
    { c: 'application', q: 'renovating an older home with outdated wiring and plumbing' },
    { c: 'application', q: 'rebuilding after a house fire or flood' },
    { c: 'application', q: 'restaurant or retail space build out' },

    { c: 'problem', q: 'contractor walked off the job' },
    { c: 'problem', q: 'renovation going over budget' },
    { c: 'problem', q: 'construction project delayed' },
    { c: 'problem', q: 'failed building inspection' },
    { c: 'problem', q: 'dispute with a contractor over unfinished work' },
    { c: 'problem', q: 'mechanics lien filed on my house' },

    { c: 'vendor-selection', q: 'questions to ask a general contractor before hiring' },
    { c: 'vendor-selection', q: 'how to check a contractor license in {state}' },
    { c: 'vendor-selection', q: 'how to compare contractor bids' },
    { c: 'vendor-selection', q: 'what should be in a construction contract' },
    { c: 'vendor-selection', q: 'how much deposit should a contractor ask for' },
    { c: 'vendor-selection', q: 'red flags when hiring a contractor' },
    { c: 'vendor-selection', q: 'how to check a contractor references' },

    { c: 'buyer-role', q: 'general contractor for a small business renovation near {city}' },
    { c: 'buyer-role', q: 'contractor for landlord unit turnovers near {city}' },
    { c: 'buyer-role', q: 'builder recommended by architects in {state}' },
    { c: 'buyer-role', q: 'general contractor for a church or nonprofit building project in {state}' },
    { c: 'buyer-role', q: 'contractor for a house flip near {city}' },
  ],

  directoryDomains: [
    // Found in live validation, 2026-09-21: review and lead sites.
    'justdial.com', 'sweeten.com', 'birdeye.com',
    'yelp.com', 'bbb.org', 'angi.com', 'angieslist.com', 'homeadvisor.com', 'thumbtack.com',
    'houzz.com', 'yellowpages.com', 'nextdoor.com', 'porch.com', 'bark.com', 'networx.com',
    'buildzoom.com', 'homeguide.com', 'fixr.com', 'thebluebook.com', 'constructconnect.com',
    'dodgeconstruction.com', 'facebook.com', 'instagram.com', 'linkedin.com', 'mapquest.com',
    'manta.com', 'chamberofcommerce.com', 'superpages.com',
  ],

  referenceDomains: [
    // Found in live validation, 2026-09-21: publishers, calculators, software and suppliers
    // that answers cite but that don't compete for the job.
    'levelset.com', 'homeadditioncostcalculator.com', 'thespruce.com', 'procore.com',
    'autodesk.com', 'buildertrend.com', 'buildern.com', 'tasktag.com', 'yahoo.com',
    'ground.news', 'bignewsnetwork.com', 'realmhome.com', 'todayshomeowner.com',
    'wikipedia.org', 'reddit.com', 'quora.com', 'youtube.com',
    'iccsafe.org', 'osha.gov', 'ftc.gov', 'hud.gov', 'fema.gov', 'sba.gov',
    'nahb.org', 'nari.org', 'agc.org', 'aia.org', 'remodeling.hw.net', 'builderonline.com',
    'jlconline.com', 'thisoldhouse.com', 'bobvila.com', 'familyhandyman.com', 'consumerreports.org',
    'forbes.com', 'bankrate.com', 'nerdwallet.com', 'investopedia.com', 'nolo.com',
    'patch.com', 'einpresswire.com', 'prnewswire.com', 'businesswire.com', 'globenewswire.com',
  ],
}
