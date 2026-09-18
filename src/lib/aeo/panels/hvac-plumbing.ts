import type { CannedPanelDefinition } from './index'

/**
 * Heating, cooling, and plumbing contractors: residential replacement and
 * repair, plus commercial service contracts.
 *
 * Written 2026-09-18. Validate against a known business before relying on it.
 */
export const hvacPlumbing: CannedPanelDefinition = {
  slug: 'hvac-plumbing',
  name: 'HVAC & plumbing',

  questions: [
    { c: 'service-geo', q: '{service} near {city}, {state}' },
    { c: 'service-geo', q: 'HVAC contractors near {city}, {state}' },
    { c: 'service-geo', q: 'commercial HVAC companies in {state}' },
    { c: 'service-geo', q: 'emergency plumber near {city}' },
    { c: 'service-geo', q: 'AC repair near {city}, {state}' },
    { c: 'service-geo', q: 'furnace installation companies near {city}' },
    { c: 'service-geo', q: 'heat pump installers in {state}' },
    { c: 'service-geo', q: 'commercial plumbing contractors in {state}' },
    { c: 'service-geo', q: 'boiler repair service near {city}, {state}' },
    { c: 'service-geo', q: 'water heater replacement near {city}' },
    { c: 'service-geo', q: 'ductless mini split installers near {city}' },
    { c: 'service-geo', q: 'best HVAC companies in {state}' },

    { c: 'cost', q: 'how much does a new HVAC system cost in {state}' },
    { c: 'cost', q: 'heat pump installation cost' },
    { c: 'cost', q: 'cost to replace a furnace and air conditioner' },
    { c: 'cost', q: 'tankless water heater installation cost' },
    { c: 'cost', q: 'how much does a plumber charge per hour in {state}' },
    { c: 'cost', q: 'cost to repipe a house' },
    { c: 'cost', q: 'ductless mini split cost per zone' },
    { c: 'cost', q: 'HVAC maintenance plan cost' },
    { c: 'cost', q: 'commercial rooftop unit replacement cost' },
    { c: 'cost', q: 'heat pump rebates and tax credits in {state}' },

    { c: 'permits', q: 'do I need a permit to replace a furnace in {city}, {state}' },
    { c: 'permits', q: 'HVAC contractor license requirements in {state}' },
    { c: 'permits', q: 'plumbing license requirements in {state}' },
    { c: 'permits', q: 'permit for water heater replacement in {state}' },
    { c: 'permits', q: 'EPA 608 certification requirements for HVAC technicians' },
    { c: 'permits', q: 'backflow prevention testing requirements in {state}' },

    { c: 'comparison', q: 'heat pump vs gas furnace' },
    { c: 'comparison', q: 'tankless vs tank water heater' },
    { c: 'comparison', q: 'ductless mini split vs central air' },
    { c: 'comparison', q: 'repair or replace an old air conditioner' },
    { c: 'comparison', q: 'PEX vs copper plumbing' },
    { c: 'comparison', q: 'Trane vs Carrier vs Lennox' },
    { c: 'comparison', q: 'boiler vs furnace heating' },

    { c: 'technical', q: 'what size HVAC system do I need for my house' },
    { c: 'technical', q: 'what SEER rating should a new air conditioner have' },
    { c: 'technical', q: 'how long does a furnace last' },
    { c: 'technical', q: 'how often should HVAC filters be changed' },
    { c: 'technical', q: 'how long does a water heater last' },
    { c: 'technical', q: 'what is a Manual J load calculation' },
    { c: 'technical', q: 'how cold is too cold for a heat pump' },
    { c: 'technical', q: 'how long does an HVAC replacement take' },

    { c: 'application', q: 'adding central air to a house with radiators' },
    { c: 'application', q: 'heating and cooling for a home addition' },
    { c: 'application', q: 'improving indoor air quality in a commercial building' },
    { c: 'application', q: 'converting an oil furnace to a heat pump' },
    { c: 'application', q: 'installing a whole house water filtration system' },

    { c: 'vendor-selection', q: 'how to choose an HVAC contractor' },
    { c: 'vendor-selection', q: 'questions to ask an HVAC company before replacing a system' },
    { c: 'vendor-selection', q: 'how to compare HVAC quotes' },
    { c: 'vendor-selection', q: 'what does a good HVAC warranty cover' },
    { c: 'vendor-selection', q: 'how to find a licensed plumber in {state}' },
    { c: 'vendor-selection', q: 'what does NATE certification mean for an HVAC technician' },

    { c: 'problem', q: 'AC running but not cooling' },
    { c: 'problem', q: 'furnace blowing cold air' },
    { c: 'problem', q: 'no hot water from water heater' },
    { c: 'problem', q: 'water heater leaking from the bottom' },
    { c: 'problem', q: 'sewer line backup what to do' },
    { c: 'problem', q: 'low water pressure in the whole house' },
    { c: 'problem', q: 'burst pipe what to do first' },
    { c: 'problem', q: 'heat pump freezing up in winter' },

    { c: 'buyer-role', q: 'commercial HVAC service contract for an office building in {state}' },
    { c: 'buyer-role', q: 'property management plumbing contractor near {city}' },
    { c: 'buyer-role', q: 'restaurant HVAC and refrigeration service near {city}' },
    { c: 'buyer-role', q: 'school district HVAC contractor in {state}' },
    { c: 'buyer-role', q: 'plumbing and HVAC maintenance for multifamily buildings in {state}' },
  ],

  directoryDomains: [
    'yelp.com', 'bbb.org', 'angi.com', 'angieslist.com', 'homeadvisor.com', 'thumbtack.com',
    'houzz.com', 'yellowpages.com', 'nextdoor.com', 'porch.com', 'bark.com', 'networx.com',
    'buildzoom.com', 'homeguide.com', 'fixr.com', 'facebook.com', 'instagram.com', 'linkedin.com',
    'mapquest.com', 'manta.com', 'chamberofcommerce.com', 'superpages.com',
  ],

  referenceDomains: [
    'wikipedia.org', 'reddit.com', 'quora.com', 'youtube.com',
    'energystar.gov', 'energy.gov', 'epa.gov', 'iccsafe.org',
    'ashrae.org', 'acca.org', 'phccweb.org', 'iapmo.org', 'ahrinet.org', 'natex.org',
    'achrnews.com', 'contractormag.com', 'pmmag.com',
    'carrier.com', 'trane.com', 'lennox.com', 'daikincomfort.com', 'rheem.com', 'goodmanmfg.com',
    'mitsubishicomfort.com', 'aosmith.com', 'rinnai.us', 'navieninc.com', 'kohler.com', 'moen.com',
    'thisoldhouse.com', 'familyhandyman.com', 'bobvila.com',
  ],
}
