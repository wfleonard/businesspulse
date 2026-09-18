import type { CannedPanelDefinition } from './index'

/**
 * Commercial and industrial roofing: low-slope membrane systems, coatings,
 * metal, repair, and maintenance. Buyers are building owners, property and
 * facility managers, schools, and public owners.
 *
 * Written 2026-09-18. Validate against a known business before relying on it.
 */
export const commercialRoofing: CannedPanelDefinition = {
  slug: 'commercial-roofing',
  name: 'Commercial roofing',

  questions: [
    { c: 'service-geo', q: '{service} contractor in {state}' },
    { c: 'service-geo', q: 'commercial roofing contractors near {city}, {state}' },
    { c: 'service-geo', q: 'flat roof repair companies near {city}' },
    { c: 'service-geo', q: 'TPO roofing installers in {state}' },
    { c: 'service-geo', q: 'EPDM roof replacement contractor near {city}, {state}' },
    { c: 'service-geo', q: 'metal roofing contractors for commercial buildings in {state}' },
    { c: 'service-geo', q: 'industrial roofing companies near {city}' },
    { c: 'service-geo', q: 'roof coating contractors in {state}' },
    { c: 'service-geo', q: 'best commercial roofers in {state}' },
    { c: 'service-geo', q: 'emergency commercial roof leak repair near {city}' },
    { c: 'service-geo', q: 'warehouse roof replacement contractor in {state}' },

    { c: 'cost', q: 'commercial roof replacement cost per square foot' },
    { c: 'cost', q: 'TPO roof cost per square foot' },
    { c: 'cost', q: 'EPDM vs TPO cost' },
    { c: 'cost', q: 'cost of a roof coating vs full replacement' },
    { c: 'cost', q: 'how much does commercial roof repair cost' },
    { c: 'cost', q: 'how much does a commercial roof inspection cost' },
    { c: 'cost', q: 'flat roof replacement cost in {state}' },
    { c: 'cost', q: 'roof maintenance contract cost for commercial buildings' },
    { c: 'cost', q: 'cost to add insulation during a commercial reroof' },

    { c: 'permits', q: 'do I need a permit to replace a commercial roof in {city}, {state}' },
    { c: 'permits', q: 'roofing contractor license requirements in {state}' },
    { c: 'permits', q: 'building code requirements for commercial roof replacement in {state}' },
    { c: 'permits', q: 'energy code insulation requirements for commercial reroofing in {state}' },
    { c: 'permits', q: 'does building code allow a new roof over an existing roof' },
    { c: 'permits', q: 'wind uplift rating requirements for commercial roofs' },

    { c: 'comparison', q: 'TPO vs PVC vs EPDM roofing' },
    { c: 'comparison', q: 'roof coating vs roof replacement' },
    { c: 'comparison', q: 'modified bitumen vs single ply roofing' },
    { c: 'comparison', q: 'metal roof vs membrane roof for a warehouse' },
    { c: 'comparison', q: 'roof recover vs tear off' },
    { c: 'comparison', q: 'mechanically attached vs fully adhered TPO' },
    { c: 'comparison', q: 'silicone vs acrylic roof coating' },

    { c: 'technical', q: 'how long does a TPO roof last' },
    { c: 'technical', q: 'how long does an EPDM roof last' },
    { c: 'technical', q: 'what is a roof core cut' },
    { c: 'technical', q: 'how to find a leak in a flat roof' },
    { c: 'technical', q: 'what causes ponding water on a flat roof' },
    { c: 'technical', q: 'what is an infrared roof moisture survey' },
    { c: 'technical', q: 'how often should a commercial roof be inspected' },
    { c: 'technical', q: 'what is a manufacturer NDL roof warranty' },
    { c: 'technical', q: 'how long does a commercial roof replacement take' },

    { c: 'application', q: 'installing solar panels on a flat commercial roof' },
    { c: 'application', q: 'reroofing an occupied building without shutting down operations' },
    { c: 'application', q: 'roofing for a cold storage or food processing facility' },
    { c: 'application', q: 'replacing rooftop HVAC curbs during a reroof' },
    { c: 'application', q: 'green roof installation on a commercial building' },

    { c: 'vendor-selection', q: 'how to choose a commercial roofing contractor' },
    { c: 'vendor-selection', q: 'questions to ask a commercial roofer before hiring' },
    { c: 'vendor-selection', q: 'what insurance should a commercial roofing contractor carry' },
    { c: 'vendor-selection', q: 'what does manufacturer certified roofing contractor mean' },
    { c: 'vendor-selection', q: 'how to compare commercial roofing bids' },
    { c: 'vendor-selection', q: 'what to look for in a commercial roof warranty' },
    { c: 'vendor-selection', q: 'roofing consultant vs roofing contractor' },

    { c: 'problem', q: 'flat roof leaking after heavy rain' },
    { c: 'problem', q: 'blisters on a commercial roof what to do' },
    { c: 'problem', q: 'storm damage to a commercial roof insurance claim' },
    { c: 'problem', q: 'roof membrane seams separating' },
    { c: 'problem', q: 'wet insulation under a flat roof' },
    { c: 'problem', q: 'ice dams on a commercial building' },

    { c: 'buyer-role', q: 'roofing contractor for a school district roof replacement in {state}' },
    { c: 'buyer-role', q: 'property manager needs a commercial roofer near {city}' },
    { c: 'buyer-role', q: 'roofing contractor for a church roof replacement in {state}' },
    { c: 'buyer-role', q: 'facility manager roof asset management program' },
    { c: 'buyer-role', q: 'public bid roofing contractors in {state}' },
  ],

  directoryDomains: [
    'yelp.com', 'bbb.org', 'angi.com', 'angieslist.com', 'homeadvisor.com', 'thumbtack.com',
    'houzz.com', 'yellowpages.com', 'nextdoor.com', 'porch.com', 'bark.com', 'networx.com',
    'buildzoom.com', 'homeguide.com', 'fixr.com', 'thebluebook.com', 'constructconnect.com',
    'dodgeconstruction.com', 'facebook.com', 'instagram.com', 'linkedin.com', 'mapquest.com',
    'manta.com', 'chamberofcommerce.com', 'superpages.com',
  ],

  referenceDomains: [
    'wikipedia.org', 'reddit.com', 'quora.com', 'youtube.com',
    'energystar.gov', 'energy.gov', 'osha.gov', 'iccsafe.org', 'fm.com', 'ul.com',
    'nrca.net', 'professionalroofing.net', 'iibec.org', 'roofingcontractor.com',
    'rooferscoffeeshop.com', 'roofingcalc.com',
    'gaf.com', 'carlislesyntec.com', 'jm.com', 'holcimelevate.com', 'owenscorning.com', 'sika.com',
    'versico.com', 'duro-last.com',
    'patch.com', 'einpresswire.com', 'prnewswire.com', 'businesswire.com', 'globenewswire.com',
  ],
}
