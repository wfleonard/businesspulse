import type { CannedPanelDefinition } from './index'

/**
 * Pest control: general pest, termites, rodents, bed bugs, mosquitoes and
 * ticks, wildlife exclusion, and commercial pest programs. Homeowner buyers,
 * plus landlords, property managers, restaurants and food businesses.
 *
 * Written 2026-09-21. Validate against a known business before relying on it.
 */
export const pestControl: CannedPanelDefinition = {
  slug: 'pest-control',
  name: 'Pest control',

  questions: [
    { c: 'service-geo', q: '{service} near {city}, {state}' },
    { c: 'service-geo', q: 'pest control companies near {city}, {state}' },
    { c: 'service-geo', q: 'best exterminators in {state}' },
    { c: 'service-geo', q: 'termite treatment near {city}' },
    { c: 'service-geo', q: 'bed bug exterminator near {city}, {state}' },
    { c: 'service-geo', q: 'rodent and mouse removal near {city}' },
    { c: 'service-geo', q: 'mosquito and tick control service near {city}' },
    { c: 'service-geo', q: 'wildlife removal and exclusion near {city}, {state}' },
    { c: 'service-geo', q: 'commercial pest control for restaurants in {state}' },
    { c: 'service-geo', q: 'same day exterminator near {city}' },

    { c: 'cost', q: 'how much does pest control cost' },
    { c: 'cost', q: 'monthly vs quarterly pest control cost' },
    { c: 'cost', q: 'termite treatment cost' },
    { c: 'cost', q: 'bed bug treatment cost' },
    { c: 'cost', q: 'how much does rodent exclusion cost' },
    { c: 'cost', q: 'mosquito spraying cost per season' },
    { c: 'cost', q: 'pest control cost in {state}' },
    { c: 'cost', q: 'is a pest control contract worth it' },

    { c: 'permits', q: 'pest control license requirements in {state}' },
    { c: 'permits', q: 'are pest control chemicals safe for kids and pets' },
    { c: 'permits', q: 'wood destroying insect inspection for a home sale in {state}' },
    { c: 'permits', q: 'landlord responsibility for pest control in {state}' },
    { c: 'permits', q: 'health code pest control requirements for restaurants' },
    { c: 'permits', q: 'rules for trapping and relocating wildlife in {state}' },

    { c: 'comparison', q: 'Orkin vs Terminix vs a local exterminator' },
    { c: 'comparison', q: 'termite bait stations vs liquid treatment' },
    { c: 'comparison', q: 'heat treatment vs chemical treatment for bed bugs' },
    { c: 'comparison', q: 'DIY pest control vs hiring a professional' },
    { c: 'comparison', q: 'organic vs conventional pest control' },
    { c: 'comparison', q: 'mosquito barrier spray vs misting system' },

    { c: 'technical', q: 'how often should I get pest control' },
    { c: 'technical', q: 'how long does it take for pest control to work' },
    { c: 'technical', q: 'signs of termites in a house' },
    { c: 'technical', q: 'what is integrated pest management' },
    { c: 'technical', q: 'how do mice get into a house' },
    { c: 'technical', q: 'how to prepare for a bed bug treatment' },
    { c: 'technical', q: 'what does a termite warranty cover' },
    { c: 'technical', q: 'how long does a termite treatment last' },

    { c: 'application', q: 'pest control before moving into a new house' },
    { c: 'application', q: 'pest control for an apartment building' },
    { c: 'application', q: 'ant control in a kitchen' },
    { c: 'application', q: 'removing a wasp or hornet nest' },
    { c: 'application', q: 'bats in the attic removal' },
    { c: 'application', q: 'tick control for a yard with kids and dogs' },

    { c: 'problem', q: 'carpenter ants in the house' },
    { c: 'problem', q: 'mice in the walls' },
    { c: 'problem', q: 'stink bugs coming inside' },
    { c: 'problem', q: 'termite swarmers in the spring' },
    { c: 'problem', q: 'cockroaches keep coming back after treatment' },
    { c: 'problem', q: 'raccoon or squirrel in the attic' },

    { c: 'vendor-selection', q: 'questions to ask a pest control company' },
    { c: 'vendor-selection', q: 'how to compare pest control quotes' },
    { c: 'vendor-selection', q: 'what to look for in a pest control contract' },
    { c: 'vendor-selection', q: 'how to cancel a pest control contract' },
    { c: 'vendor-selection', q: 'is QualityPro certification important' },
    { c: 'vendor-selection', q: 'door to door pest control sales, should I sign' },

    { c: 'buyer-role', q: 'pest control for a property management company near {city}' },
    { c: 'buyer-role', q: 'commercial pest control for a warehouse or food plant in {state}' },
    { c: 'buyer-role', q: 'pest control for an HOA or condo in {state}' },
    { c: 'buyer-role', q: 'pest control for a school or daycare near {city}' },
  ],

  directoryDomains: [
    'yelp.com', 'bbb.org', 'angi.com', 'angieslist.com', 'homeadvisor.com', 'thumbtack.com',
    'houzz.com', 'yellowpages.com', 'nextdoor.com', 'porch.com', 'bark.com', 'networx.com',
    'homeguide.com', 'fixr.com', 'birdeye.com', 'bestpickreports.com', 'consumeraffairs.com',
    'bestcompany.com', 'lawnstarter.com', 'lawnlove.com', 'justdial.com', 'expertise.com',
    'facebook.com', 'instagram.com', 'linkedin.com', 'mapquest.com', 'manta.com',
    'chamberofcommerce.com', 'superpages.com',
  ],

  referenceDomains: [
    // Found in live validation, 2026-09-21: publishers, research, insurers, lenders,
    // software, manufacturers and document hosts that don't compete for the job.
    'pestcontrolpricing.com', 'invoicefly.com', 'plos.org', 'nih.gov',
    'wikipedia.org', 'reddit.com', 'quora.com', 'youtube.com',
    'epa.gov', 'cdc.gov', 'hud.gov', 'fda.gov', 'npic.orst.edu', 'pestworld.org',
    'npmapestworld.org', 'qualityprocertified.org', 'pctonline.com', 'mypmp.net',
    'thisoldhouse.com', 'bobvila.com', 'familyhandyman.com', 'thespruce.com',
    'todayshomeowner.com', 'bhg.com', 'consumerreports.org', 'forbes.com', 'bankrate.com',
    'nerdwallet.com', 'homedepot.com', 'lowes.com', 'sentricon.com', 'ortho.com',
    'terro.com', 'victorpest.com',
    'patch.com', 'einpresswire.com', 'prnewswire.com', 'businesswire.com', 'globenewswire.com',
  ],
}
