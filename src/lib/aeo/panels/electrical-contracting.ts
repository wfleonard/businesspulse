import type { CannedPanelDefinition } from './index'

/**
 * Electrical contractors: residential service and upgrades, EV charging,
 * generators, and commercial and industrial work.
 *
 * Written 2026-09-18. Validate against a known business before relying on it.
 */
export const electricalContracting: CannedPanelDefinition = {
  slug: 'electrical-contracting',
  name: 'Electrical contracting',

  questions: [
    { c: 'service-geo', q: '{service} near {city}, {state}' },
    { c: 'service-geo', q: 'electricians near {city}, {state}' },
    { c: 'service-geo', q: 'commercial electrical contractors in {state}' },
    { c: 'service-geo', q: 'EV charger installers near {city}' },
    { c: 'service-geo', q: 'generator installation companies near {city}, {state}' },
    { c: 'service-geo', q: 'industrial electrical contractors in {state}' },
    { c: 'service-geo', q: 'electrical panel upgrade near {city}' },
    { c: 'service-geo', q: 'licensed electrician for a service upgrade near {city}, {state}' },
    { c: 'service-geo', q: 'solar and battery installers in {state}' },
    { c: 'service-geo', q: 'emergency electrician near {city}' },
    { c: 'service-geo', q: 'best electrical contractors in {state}' },

    { c: 'cost', q: 'electrical panel upgrade cost' },
    { c: 'cost', q: 'cost to upgrade to 200 amp service in {state}' },
    { c: 'cost', q: 'EV charger installation cost' },
    { c: 'cost', q: 'whole house generator installation cost' },
    { c: 'cost', q: 'how much does an electrician charge per hour in {state}' },
    { c: 'cost', q: 'cost to rewire a house' },
    { c: 'cost', q: 'commercial electrical cost per square foot' },
    { c: 'cost', q: 'cost to run a circuit for a hot tub or pool' },
    { c: 'cost', q: 'EV charger rebates and tax credits in {state}' },

    { c: 'permits', q: 'do I need a permit for electrical work in {city}, {state}' },
    { c: 'permits', q: 'electrician license requirements in {state}' },
    { c: 'permits', q: 'electrical inspection process for a panel upgrade' },
    { c: 'permits', q: 'utility requirements for an electrical service upgrade in {state}' },
    { c: 'permits', q: 'permit for a whole house generator in {state}' },
    { c: 'permits', q: 'which National Electrical Code edition applies in {state}' },

    { c: 'comparison', q: 'Level 1 vs Level 2 EV charger' },
    { c: 'comparison', q: 'standby generator vs portable generator' },
    { c: 'comparison', q: 'home battery backup vs generator' },
    { c: 'comparison', q: 'Generac vs Kohler vs Cummins generator' },
    { c: 'comparison', q: 'LED retrofit vs new fixtures for a commercial building' },
    { c: 'comparison', q: 'aluminum vs copper wiring' },
    { c: 'comparison', q: 'union vs non union electrical contractor' },

    { c: 'technical', q: 'how many amps does my house need' },
    { c: 'technical', q: 'what size generator do I need for my house' },
    { c: 'technical', q: 'what is an electrical load calculation' },
    { c: 'technical', q: 'how long does an electrical panel last' },
    { c: 'technical', q: 'where are GFCI outlets required' },
    { c: 'technical', q: 'what is arc fault protection' },
    { c: 'technical', q: 'how long does a panel upgrade take' },
    { c: 'technical', q: 'does an EV charger need a dedicated circuit' },

    { c: 'application', q: 'wiring a detached garage or workshop' },
    { c: 'application', q: 'adding outlets and lighting to a finished basement' },
    { c: 'application', q: 'installing EV chargers at an apartment complex' },
    { c: 'application', q: 'electrical work for a commercial tenant fit out' },
    { c: 'application', q: 'installing a transfer switch for a generator' },
    { c: 'application', q: 'upgrading warehouse lighting to LED' },

    { c: 'vendor-selection', q: 'how to choose an electrician' },
    { c: 'vendor-selection', q: 'questions to ask an electrical contractor before hiring' },
    { c: 'vendor-selection', q: 'master electrician vs journeyman electrician' },
    { c: 'vendor-selection', q: 'how to check an electrician license in {state}' },
    { c: 'vendor-selection', q: 'what insurance should an electrical contractor have' },
    { c: 'vendor-selection', q: 'how to compare electrical bids for a commercial project' },

    { c: 'problem', q: 'breaker keeps tripping what to do' },
    { c: 'problem', q: 'lights flickering throughout the house' },
    { c: 'problem', q: 'burning smell from an outlet' },
    { c: 'problem', q: 'half the house has no power' },
    { c: 'problem', q: 'is aluminum wiring safe' },
    { c: 'problem', q: 'should a Federal Pacific panel be replaced' },
    { c: 'problem', q: 'outlets stopped working after a GFCI tripped' },

    { c: 'buyer-role', q: 'electrical contractor for a restaurant build out near {city}' },
    { c: 'buyer-role', q: 'property manager needs a commercial electrician in {state}' },
    { c: 'buyer-role', q: 'school district electrical contractor in {state}' },
    { c: 'buyer-role', q: 'EV charging contractor for a fleet or workplace in {state}' },
    { c: 'buyer-role', q: 'electrical maintenance contract for a manufacturing plant in {state}' },
  ],

  directoryDomains: [
    'yelp.com', 'bbb.org', 'angi.com', 'angieslist.com', 'homeadvisor.com', 'thumbtack.com',
    'houzz.com', 'yellowpages.com', 'nextdoor.com', 'porch.com', 'bark.com', 'networx.com',
    'buildzoom.com', 'homeguide.com', 'fixr.com', 'thebluebook.com', 'facebook.com', 'instagram.com',
    'linkedin.com', 'mapquest.com', 'manta.com', 'chamberofcommerce.com', 'superpages.com',
  ],

  referenceDomains: [
    'wikipedia.org', 'reddit.com', 'quora.com', 'youtube.com',
    'energy.gov', 'energystar.gov', 'osha.gov', 'iccsafe.org', 'ul.com', 'ieee.org',
    'nfpa.org', 'necanet.org', 'ieci.org', 'ibew.org',
    'ecmweb.com', 'ecmag.com', 'mikeholt.com',
    'generac.com', 'cummins.com', 'chargepoint.com', 'tesla.com', 'enphase.com', 'eaton.com',
    'se.com', 'siemens.com', 'leviton.com',
    'thisoldhouse.com', 'familyhandyman.com', 'bobvila.com',
  ],
}
