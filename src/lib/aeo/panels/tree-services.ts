import type { CannedPanelDefinition } from './index'

/**
 * Tree services and arborists: removal, pruning, stump grinding, storm and
 * emergency work, plant health care, and tree risk assessments. Homeowner
 * buyers, plus HOAs, property managers, municipalities and utilities.
 *
 * Written 2026-09-21. Validate against a known business before relying on it.
 */
export const treeServices: CannedPanelDefinition = {
  slug: 'tree-services',
  name: 'Tree services & arborists',

  questions: [
    { c: 'service-geo', q: '{service} near {city}, {state}' },
    { c: 'service-geo', q: 'tree service companies near {city}, {state}' },
    { c: 'service-geo', q: 'certified arborist near {city}' },
    { c: 'service-geo', q: 'tree removal near {city}, {state}' },
    { c: 'service-geo', q: 'tree trimming and pruning near {city}' },
    { c: 'service-geo', q: 'emergency tree removal after a storm near {city}' },
    { c: 'service-geo', q: 'stump grinding near {city}, {state}' },
    { c: 'service-geo', q: 'best tree care companies in {state}' },
    { c: 'service-geo', q: 'crane tree removal near {city}' },
    { c: 'service-geo', q: 'tree health care and disease treatment in {state}' },

    { c: 'cost', q: 'how much does tree removal cost' },
    { c: 'cost', q: 'tree removal cost in {state}' },
    { c: 'cost', q: 'cost to remove a large tree near a house' },
    { c: 'cost', q: 'how much does tree trimming cost' },
    { c: 'cost', q: 'stump grinding cost' },
    { c: 'cost', q: 'emergency tree removal cost' },
    { c: 'cost', q: 'does homeowners insurance cover tree removal' },
    { c: 'cost', q: 'how much does an arborist report cost' },

    { c: 'permits', q: 'do I need a permit to remove a tree in {city}, {state}' },
    { c: 'permits', q: 'tree removal ordinance and replacement rules in {state}' },
    { c: 'permits', q: 'who is responsible for a tree on the property line' },
    { c: 'permits', q: 'who removes a tree near power lines' },
    { c: 'permits', q: 'tree service license or insurance requirements in {state}' },
    { c: 'permits', q: 'can my neighbor cut branches that hang over my yard' },

    { c: 'comparison', q: 'arborist vs tree service company' },
    { c: 'comparison', q: 'tree removal vs cabling and bracing' },
    { c: 'comparison', q: 'stump grinding vs stump removal' },
    { c: 'comparison', q: 'crown thinning vs crown reduction' },
    { c: 'comparison', q: 'topping a tree vs proper pruning' },
    { c: 'comparison', q: 'treat vs remove an ash tree' },

    { c: 'technical', q: 'best time of year to prune trees' },
    { c: 'technical', q: 'how to tell if a tree is dying' },
    { c: 'technical', q: 'what is a tree risk assessment' },
    { c: 'technical', q: 'how close can a tree be to a house' },
    { c: 'technical', q: 'what does an ISA certified arborist do' },
    { c: 'technical', q: 'how is a large tree removed in a tight space' },
    { c: 'technical', q: 'what happens to the wood after tree removal' },
    { c: 'technical', q: 'how often should trees be trimmed' },

    { c: 'application', q: 'removing a tree before building an addition' },
    { c: 'application', q: 'protecting trees during construction' },
    { c: 'application', q: 'clearing trees for a new driveway or lot' },
    { c: 'application', q: 'tree roots damaging a sewer line or foundation' },
    { c: 'application', q: 'tree work for a home sale inspection' },

    { c: 'problem', q: 'tree fell on my house what do I do' },
    { c: 'problem', q: 'leaning tree after a storm' },
    { c: 'problem', q: 'dead branches over the roof' },
    { c: 'problem', q: 'spotted lanternfly or emerald ash borer damage' },
    { c: 'problem', q: 'mushrooms growing at the base of a tree' },
    { c: 'problem', q: 'tree roots lifting a driveway or sidewalk' },

    { c: 'vendor-selection', q: 'questions to ask a tree service before hiring' },
    { c: 'vendor-selection', q: 'how to check if a tree company is insured' },
    { c: 'vendor-selection', q: 'how to compare tree removal quotes' },
    { c: 'vendor-selection', q: 'door to door tree service scams after storms' },
    { c: 'vendor-selection', q: 'is TCIA accreditation important' },
    { c: 'vendor-selection', q: 'what should a tree removal estimate include' },

    { c: 'buyer-role', q: 'tree care contractor for an HOA in {state}' },
    { c: 'buyer-role', q: 'commercial property tree maintenance near {city}' },
    { c: 'buyer-role', q: 'municipal tree contractor in {state}' },
    { c: 'buyer-role', q: 'tree clearing for a builder or developer near {city}' },
  ],

  directoryDomains: [
    // Found in live validation, 2026-09-21: review and lead sites.
    'lawnlove.com', 'gigopro.com', 'booktreework.com',
    'yelp.com', 'bbb.org', 'angi.com', 'angieslist.com', 'homeadvisor.com', 'thumbtack.com',
    'houzz.com', 'yellowpages.com', 'nextdoor.com', 'porch.com', 'bark.com', 'networx.com',
    'homeguide.com', 'fixr.com', 'birdeye.com', 'bestpickreports.com', 'consumeraffairs.com',
    'lawnstarter.com', 'facebook.com', 'instagram.com', 'linkedin.com', 'mapquest.com',
    'manta.com', 'chamberofcommerce.com', 'superpages.com',
  ],

  referenceDomains: [
    // Found in live validation, 2026-09-21: publishers, cost and code sites, insurers and
    // suppliers that answers cite but that don't compete for the job.
    'treelaws.org', 'ecode360.com', 'treeawareness.com',
    'wikipedia.org', 'reddit.com', 'quora.com', 'youtube.com',
    'isa-arbor.com', 'treesaregood.org', 'tcia.org', 'arborday.org', 'usda.gov', 'aphis.usda.gov',
    'fs.usda.gov', 'osha.gov', 'iii.org', 'nolo.com', 'thisoldhouse.com', 'bobvila.com',
    'familyhandyman.com', 'thespruce.com', 'todayshomeowner.com', 'bhg.com',
    'consumerreports.org', 'forbes.com', 'bankrate.com', 'homedepot.com', 'lowes.com',
    'patch.com', 'einpresswire.com', 'prnewswire.com', 'businesswire.com', 'globenewswire.com',
  ],
}
