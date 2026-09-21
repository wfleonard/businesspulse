import type { CannedPanelDefinition } from './index'

/**
 * Excavation and site work: site preparation, grading, land clearing,
 * foundation digs, utility trenching, driveways, drainage, and demolition.
 * Buyers are builders and general contractors, developers, homeowners with a
 * project, and public and commercial owners.
 *
 * Written 2026-09-21. Validate against a known business before relying on it.
 */
export const excavationSiteWork: CannedPanelDefinition = {
  slug: 'excavation-site-work',
  name: 'Excavation & site work',

  questions: [
    { c: 'service-geo', q: '{service} near {city}, {state}' },
    { c: 'service-geo', q: 'excavation contractors near {city}, {state}' },
    { c: 'service-geo', q: 'site work contractors in {state}' },
    { c: 'service-geo', q: 'land clearing companies near {city}' },
    { c: 'service-geo', q: 'grading and site preparation near {city}, {state}' },
    { c: 'service-geo', q: 'foundation excavation for a new home near {city}' },
    { c: 'service-geo', q: 'utility trenching contractors in {state}' },
    { c: 'service-geo', q: 'demolition and excavation contractors near {city}' },
    { c: 'service-geo', q: 'commercial site development contractors in {state}' },
    { c: 'service-geo', q: 'driveway excavation and stone base near {city}' },

    { c: 'cost', q: 'how much does excavation cost per cubic yard' },
    { c: 'cost', q: 'cost to excavate for a house foundation' },
    { c: 'cost', q: 'land clearing cost per acre' },
    { c: 'cost', q: 'site preparation cost for a new home in {state}' },
    { c: 'cost', q: 'how much does grading a yard cost' },
    { c: 'cost', q: 'cost to dig a trench for utilities' },
    { c: 'cost', q: 'excavator hourly rate with operator' },
    { c: 'cost', q: 'cost to remove rock found during excavation' },
    { c: 'cost', q: 'fill dirt and topsoil cost per yard' },

    { c: 'permits', q: 'grading or excavation permit requirements in {city}, {state}' },
    { c: 'permits', q: 'soil erosion and sediment control plan requirements in {state}' },
    { c: 'permits', q: 'call before you dig 811 rules in {state}' },
    { c: 'permits', q: 'wetlands permit for clearing land in {state}' },
    { c: 'permits', q: 'stormwater management requirements for new construction' },
    { c: 'permits', q: 'OSHA trench safety requirements' },
    { c: 'permits', q: 'tree clearing rules for a building lot' },

    { c: 'comparison', q: 'excavation contractor vs general contractor for site work' },
    { c: 'comparison', q: 'rent an excavator vs hire an excavation contractor' },
    { c: 'comparison', q: 'crushed stone vs recycled concrete for a driveway base' },
    { c: 'comparison', q: 'full basement vs crawl space excavation' },
    { c: 'comparison', q: 'land clearing with forestry mulching vs removal' },
    { c: 'comparison', q: 'cut and fill vs importing fill' },

    { c: 'technical', q: 'site work steps before building a house' },
    { c: 'technical', q: 'how long does excavation for a house take' },
    { c: 'technical', q: 'what is a perc test' },
    { c: 'technical', q: 'what is compaction testing and why does it matter' },
    { c: 'technical', q: 'how to grade a yard for drainage' },
    { c: 'technical', q: 'what happens if you hit rock or groundwater during excavation' },
    { c: 'technical', q: 'what is a geotechnical soil report' },
    { c: 'technical', q: 'how deep do footings need to be for frost' },

    { c: 'application', q: 'excavation for an in-ground pool' },
    { c: 'application', q: 'septic system excavation and installation' },
    { c: 'application', q: 'building pad preparation on a sloped lot' },
    { c: 'application', q: 'new water or sewer line from the street to the house' },
    { c: 'application', q: 'parking lot site work and paving base' },
    { c: 'application', q: 'house demolition and lot clearing' },

    { c: 'problem', q: 'yard floods after heavy rain' },
    { c: 'problem', q: 'water pooling against the foundation' },
    { c: 'problem', q: 'soil settling after construction' },
    { c: 'problem', q: 'excavation damaged a utility line' },
    { c: 'problem', q: 'muddy construction site and erosion' },

    { c: 'vendor-selection', q: 'questions to ask an excavation contractor' },
    { c: 'vendor-selection', q: 'how to compare excavation bids' },
    { c: 'vendor-selection', q: 'what insurance should an excavation contractor carry' },
    { c: 'vendor-selection', q: 'what should a site work contract include' },
    { c: 'vendor-selection', q: 'how to find a reliable site work subcontractor' },

    { c: 'buyer-role', q: 'site work subcontractor for a home builder in {state}' },
    { c: 'buyer-role', q: 'excavation contractor for a developer near {city}' },
    { c: 'buyer-role', q: 'public bid site work contractors in {state}' },
    { c: 'buyer-role', q: 'homeowner building on a vacant lot near {city}' },
    { c: 'buyer-role', q: 'farm or large property land clearing in {state}' },
  ],

  directoryDomains: [
    'yelp.com', 'bbb.org', 'angi.com', 'angieslist.com', 'homeadvisor.com', 'thumbtack.com',
    'houzz.com', 'yellowpages.com', 'nextdoor.com', 'porch.com', 'bark.com', 'networx.com',
    'buildzoom.com', 'homeguide.com', 'fixr.com', 'birdeye.com', 'bestpickreports.com',
    'thebluebook.com', 'constructconnect.com', 'dodgeconstruction.com', 'justdial.com',
    'facebook.com', 'instagram.com', 'linkedin.com', 'mapquest.com', 'manta.com',
    'chamberofcommerce.com', 'superpages.com',
  ],

  referenceDomains: [
    // Found in live validation, 2026-09-21: publishers, cost and code sites, insurers and
    // suppliers that answers cite but that don't compete for the job.
    'latestcost.com',
    'wikipedia.org', 'reddit.com', 'quora.com', 'youtube.com',
    'osha.gov', 'epa.gov', 'usda.gov', 'nrcs.usda.gov', 'fema.gov', 'usace.army.mil',
    'call811.com', 'iccsafe.org', 'nahb.org', 'agc.org', 'nuca.com',
    'forconstructionpros.com', 'equipmentworld.com', 'constructionequipment.com',
    'thisoldhouse.com', 'bobvila.com', 'familyhandyman.com', 'thespruce.com', 'forbes.com',
    'bankrate.com', 'procore.com', 'autodesk.com',
    'cat.com', 'deere.com', 'komatsu.com', 'bobcat.com', 'kubota.com', 'volvoce.com',
    'unitedrentals.com', 'sunbeltrentals.com', 'homedepot.com',
    'patch.com', 'einpresswire.com', 'prnewswire.com', 'businesswire.com', 'globenewswire.com',
  ],
}
