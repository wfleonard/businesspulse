import type { CannedPanelDefinition } from './index'

/**
 * Fire protection: sprinkler installation and inspection, fire alarm systems,
 * extinguisher service, kitchen hood suppression, and backflow testing.
 * Buyers are building owners, facility and property managers, restaurants,
 * general contractors, and schools and public owners.
 *
 * Written 2026-09-21. Validate against a known business before relying on it.
 */
export const fireProtection: CannedPanelDefinition = {
  slug: 'fire-protection',
  name: 'Fire protection',

  questions: [
    { c: 'service-geo', q: '{service} near {city}, {state}' },
    { c: 'service-geo', q: 'fire protection companies near {city}, {state}' },
    { c: 'service-geo', q: 'fire sprinkler contractors in {state}' },
    { c: 'service-geo', q: 'fire sprinkler inspection companies near {city}' },
    { c: 'service-geo', q: 'fire alarm installation and monitoring near {city}, {state}' },
    { c: 'service-geo', q: 'fire extinguisher inspection service near {city}' },
    { c: 'service-geo', q: 'restaurant hood suppression service near {city}, {state}' },
    { c: 'service-geo', q: 'backflow testing near {city}' },
    { c: 'service-geo', q: 'fire sprinkler design build contractors in {state}' },
    { c: 'service-geo', q: 'emergency fire sprinkler repair near {city}' },

    { c: 'cost', q: 'how much does a commercial fire sprinkler system cost per square foot' },
    { c: 'cost', q: 'fire sprinkler inspection cost' },
    { c: 'cost', q: 'how much does a commercial fire alarm system cost' },
    { c: 'cost', q: 'kitchen hood fire suppression system cost' },
    { c: 'cost', q: 'fire extinguisher inspection cost per unit' },
    { c: 'cost', q: 'cost to retrofit sprinklers in an older building' },
    { c: 'cost', q: 'fire alarm monitoring cost per month' },
    { c: 'cost', q: 'do fire sprinklers lower insurance premiums' },

    { c: 'permits', q: 'fire sprinkler requirements for commercial buildings in {state}' },
    { c: 'permits', q: 'NFPA 25 sprinkler inspection frequency' },
    { c: 'permits', q: 'NFPA 72 fire alarm inspection requirements' },
    { c: 'permits', q: 'fire marshal inspection checklist for a business in {city}' },
    { c: 'permits', q: 'fire protection contractor license requirements in {state}' },
    { c: 'permits', q: 'when is a fire sprinkler system required for a change of use' },
    { c: 'permits', q: 'how often do fire extinguishers need to be inspected' },

    { c: 'comparison', q: 'wet vs dry pipe sprinkler system' },
    { c: 'comparison', q: 'addressable vs conventional fire alarm' },
    { c: 'comparison', q: 'pre-action vs deluge sprinkler system' },
    { c: 'comparison', q: 'clean agent vs sprinkler system for a server room' },
    { c: 'comparison', q: 'CPVC vs steel pipe for fire sprinklers' },
    { c: 'comparison', q: 'one vendor for sprinklers and alarms vs separate contractors' },

    { c: 'technical', q: 'how does a fire sprinkler system work' },
    { c: 'technical', q: 'what happens during a fire sprinkler inspection' },
    { c: 'technical', q: 'what is a five year sprinkler internal pipe inspection' },
    { c: 'technical', q: 'what is a fire alarm monitoring central station' },
    { c: 'technical', q: 'how long do fire sprinkler heads last' },
    { c: 'technical', q: 'what is a fire department connection' },
    { c: 'technical', q: 'what is a hydraulic calculation for sprinklers' },
    { c: 'technical', q: 'what does a fire watch mean' },

    { c: 'application', q: 'fire sprinkler system for a warehouse' },
    { c: 'application', q: 'fire protection for a new restaurant build out' },
    { c: 'application', q: 'fire alarm upgrade for an apartment building' },
    { c: 'application', q: 'fire suppression for a data or server room' },
    { c: 'application', q: 'sprinkler system for a church or school' },

    { c: 'problem', q: 'fire sprinkler pipe leaking or frozen' },
    { c: 'problem', q: 'fire alarm false alarms keep happening' },
    { c: 'problem', q: 'failed a fire marshal inspection' },
    { c: 'problem', q: 'sprinkler system corrosion and pinhole leaks' },
    { c: 'problem', q: 'fire alarm panel showing a trouble signal' },
    { c: 'problem', q: 'deficiencies found on a sprinkler inspection report' },

    { c: 'vendor-selection', q: 'questions to ask a fire protection contractor' },
    { c: 'vendor-selection', q: 'how to compare fire sprinkler bids' },
    { c: 'vendor-selection', q: 'what is NICET certification for fire protection' },
    { c: 'vendor-selection', q: 'what should a fire protection service contract include' },
    { c: 'vendor-selection', q: 'local fire protection company vs national provider' },

    { c: 'buyer-role', q: 'fire protection vendor for a property management company near {city}' },
    { c: 'buyer-role', q: 'fire sprinkler subcontractor for a general contractor in {state}' },
    { c: 'buyer-role', q: 'fire alarm service for a school district in {state}' },
    { c: 'buyer-role', q: 'facility manager fire life safety inspection program' },
    { c: 'buyer-role', q: 'public bid fire protection contractors in {state}' },
  ],

  directoryDomains: [
    // Found in live validation, 2026-09-21: directories, marketplaces and review sites.
    'thebigredguide.com',
    'yelp.com', 'bbb.org', 'angi.com', 'homeadvisor.com', 'thumbtack.com', 'yellowpages.com',
    'bark.com', 'birdeye.com', 'justdial.com', 'expertise.com', 'thebluebook.com',
    'constructconnect.com', 'dodgeconstruction.com', 'buildzoom.com', 'facebook.com',
    'instagram.com', 'linkedin.com', 'mapquest.com', 'manta.com', 'chamberofcommerce.com',
    'superpages.com',
  ],

  referenceDomains: [
    // Found in live validation, 2026-09-21: publishers, research, insurers, lenders,
    // software, manufacturers and document hosts that don't compete for the job.
    'oxmaint.com', 'scribd.com', 'hubspot.net', 'tfp1.com',
    'wikipedia.org', 'reddit.com', 'quora.com', 'youtube.com',
    'nfpa.org', 'osha.gov', 'usfa.fema.gov', 'fema.gov', 'iccsafe.org', 'up.codes', 'ul.com',
    'fm.com', 'fmglobal.com', 'nicet.org', 'nfsa.org', 'afsa.org', 'sfpe.org', 'nafed.org',
    'epa.gov', 'facilitiesnet.com', 'buildings.com', 'sdmmag.com', 'firehouse.com',
    'meyerfire.com', 'qrfs.com',
    'vikinggroupinc.com', 'reliablesprinkler.com', 'ansul.com', 'amerex-fire.com', 'kidde.com',
    'notifier.com', 'firelite.com', 'victaulic.com',
    'patch.com', 'einpresswire.com', 'prnewswire.com', 'businesswire.com', 'globenewswire.com',
  ],
}
