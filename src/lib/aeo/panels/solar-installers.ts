import type { CannedPanelDefinition } from './index'

/**
 * Solar installers: residential rooftop and ground-mount systems, battery
 * storage, and small commercial solar. Mostly homeowner buyers, plus farms,
 * small businesses, and nonprofits.
 *
 * Incentive questions are asked neutrally. Credits and rebates change often,
 * so the panel measures who answers them, not what the answer should be.
 *
 * Written 2026-09-21. Validate against a known business before relying on it.
 */
export const solarInstallers: CannedPanelDefinition = {
  slug: 'solar-installers',
  name: 'Solar installation',

  questions: [
    { c: 'service-geo', q: '{service} near {city}, {state}' },
    { c: 'service-geo', q: 'solar panel installers near {city}, {state}' },
    { c: 'service-geo', q: 'best solar companies in {state}' },
    { c: 'service-geo', q: 'local solar installer vs national company in {state}' },
    { c: 'service-geo', q: 'home battery backup installers near {city}' },
    { c: 'service-geo', q: 'ground mount solar installers in {state}' },
    { c: 'service-geo', q: 'commercial solar installers near {city}, {state}' },
    { c: 'service-geo', q: 'solar panel repair and service near {city}' },
    { c: 'service-geo', q: 'Enphase certified installers near {city}' },
    { c: 'service-geo', q: 'solar panel removal and reinstall for a roof replacement near {city}' },

    { c: 'cost', q: 'how much do solar panels cost for a house' },
    { c: 'cost', q: 'solar installation cost per watt' },
    { c: 'cost', q: 'solar panel cost in {state}' },
    { c: 'cost', q: 'how much does a home solar battery cost' },
    { c: 'cost', q: 'solar payback period' },
    { c: 'cost', q: 'solar loan vs lease vs cash purchase' },
    { c: 'cost', q: 'is there still a federal tax credit for home solar' },
    { c: 'cost', q: 'solar incentives and rebates in {state}' },
    { c: 'cost', q: 'does solar increase home value' },

    { c: 'permits', q: 'solar panel permit requirements in {city}, {state}' },
    { c: 'permits', q: 'how does net metering work in {state}' },
    { c: 'permits', q: 'utility interconnection approval for home solar' },
    { c: 'permits', q: 'can an HOA stop me from installing solar panels in {state}' },
    { c: 'permits', q: 'fire code setbacks for rooftop solar' },
    { c: 'permits', q: 'solar contractor license requirements in {state}' },

    { c: 'comparison', q: 'microinverters vs string inverters' },
    { c: 'comparison', q: 'Enphase vs SolarEdge' },
    { c: 'comparison', q: 'monocrystalline vs polycrystalline solar panels' },
    { c: 'comparison', q: 'Tesla Powerwall vs Enphase battery' },
    { c: 'comparison', q: 'roof mount vs ground mount solar' },
    { c: 'comparison', q: 'solar with battery vs grid tied only' },
    { c: 'comparison', q: 'solar lease vs power purchase agreement' },

    { c: 'technical', q: 'how many solar panels do I need for my house' },
    { c: 'technical', q: 'how long do solar panels last' },
    { c: 'technical', q: 'do solar panels work during a power outage' },
    { c: 'technical', q: 'how long does solar installation take from contract to power on' },
    { c: 'technical', q: 'is my roof good for solar' },
    { c: 'technical', q: 'do solar panels work in winter or on cloudy days' },
    { c: 'technical', q: 'what maintenance do solar panels need' },
    { c: 'technical', q: 'what solar warranties should I expect' },

    { c: 'application', q: 'solar for a house with a shaded roof' },
    { c: 'application', q: 'solar panels on a flat roof' },
    { c: 'application', q: 'solar for an electric vehicle charger' },
    { c: 'application', q: 'solar for a farm or barn' },
    { c: 'application', q: 'adding panels to an existing solar system' },

    { c: 'problem', q: 'solar panels producing less than expected' },
    { c: 'problem', q: 'solar installer went out of business, who services my system' },
    { c: 'problem', q: 'roof leak after solar installation' },
    { c: 'problem', q: 'inverter error or system offline' },
    { c: 'problem', q: 'utility bill still high after solar' },
    { c: 'problem', q: 'animals nesting under solar panels' },

    { c: 'vendor-selection', q: 'questions to ask a solar installer before signing' },
    { c: 'vendor-selection', q: 'how to compare solar quotes' },
    { c: 'vendor-selection', q: 'how to spot solar sales scams' },
    { c: 'vendor-selection', q: 'what is NABCEP certification' },
    { c: 'vendor-selection', q: 'what should a solar contract include' },
    { c: 'vendor-selection', q: 'door to door solar sales, should I trust them' },

    { c: 'buyer-role', q: 'commercial solar for a small business in {state}' },
    { c: 'buyer-role', q: 'solar for a church or nonprofit in {state}' },
    { c: 'buyer-role', q: 'community solar options in {state}' },
    { c: 'buyer-role', q: 'solar for a rental property owner near {city}' },
  ],

  directoryDomains: [
    // Found in live validation, 2026-09-21: review and lead sites.
    'solar.com', 'consumeraffairs.com',
    'yelp.com', 'bbb.org', 'angi.com', 'angieslist.com', 'homeadvisor.com', 'thumbtack.com',
    'houzz.com', 'yellowpages.com', 'nextdoor.com', 'porch.com', 'bark.com', 'networx.com',
    'buildzoom.com', 'homeguide.com', 'fixr.com', 'modernize.com', 'energysage.com',
    'solarreviews.com', 'facebook.com', 'instagram.com', 'linkedin.com', 'mapquest.com',
    'manta.com', 'chamberofcommerce.com', 'superpages.com',
  ],

  referenceDomains: [
    // Found in live validation, 2026-09-21: publishers, calculators, software and suppliers
    // that answers cite but that don't compete for the job.
    'ecowatch.com', 'thecooldown.com', 'cnet.com', 'solartechonline.com',
    'solarunitedneighbors.org', 'aurorasolar.com', 'greenlancer.com',
    'solarpermitsolutions.com', 'rencalc.com', 'solarbidanalyzer.com', 'surgepv.com',
    'ecoflow.com', 'a1solarstore.com', 'anernstore.com',
    'wikipedia.org', 'reddit.com', 'quora.com', 'youtube.com',
    'energy.gov', 'nrel.gov', 'irs.gov', 'eia.gov', 'epa.gov', 'ftc.gov', 'nfpa.org',
    'seia.org', 'dsireusa.org', 'nabcep.org', 'solarpowerworldonline.com', 'pv-magazine-usa.com',
    'cleantechnica.com', 'electrek.co', 'consumerreports.org', 'forbes.com', 'bankrate.com',
    'nerdwallet.com', 'thisoldhouse.com',
    'enphase.com', 'solaredge.com', 'qcells.com', 'recgroup.com', 'canadiansolar.com',
    'jinkosolar.com', 'fronius.com', 'generac.com',
    'patch.com', 'einpresswire.com', 'prnewswire.com', 'businesswire.com', 'globenewswire.com',
  ],
}
