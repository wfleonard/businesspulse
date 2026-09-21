import type { CannedPanelDefinition } from './index'

/**
 * Window and door replacement: replacement windows, entry and patio doors,
 * storm doors, and repair. Mostly homeowner buyers, plus HOAs and small
 * multifamily and commercial owners.
 *
 * Written 2026-09-21. Validate against a known business before relying on it.
 */
export const windowsDoors: CannedPanelDefinition = {
  slug: 'windows-doors',
  name: 'Windows & doors',

  questions: [
    { c: 'service-geo', q: '{service} near {city}, {state}' },
    { c: 'service-geo', q: 'window replacement companies near {city}, {state}' },
    { c: 'service-geo', q: 'replacement window installers in {state}' },
    { c: 'service-geo', q: 'entry door installation near {city}' },
    { c: 'service-geo', q: 'patio door replacement near {city}, {state}' },
    { c: 'service-geo', q: 'window repair near {city}' },
    { c: 'service-geo', q: 'Andersen window dealers near {city}' },
    { c: 'service-geo', q: 'best window companies in {state}' },
    { c: 'service-geo', q: 'foggy window glass replacement near {city}' },
    { c: 'service-geo', q: 'storm door installers near {city}, {state}' },

    { c: 'cost', q: 'how much do replacement windows cost' },
    { c: 'cost', q: 'window replacement cost per window' },
    { c: 'cost', q: 'cost to replace all the windows in a house' },
    { c: 'cost', q: 'vinyl vs wood window cost' },
    { c: 'cost', q: 'how much does a new front door cost installed' },
    { c: 'cost', q: 'sliding patio door replacement cost' },
    { c: 'cost', q: 'cost to replace foggy window glass only' },
    { c: 'cost', q: 'window replacement cost in {state}' },
    { c: 'cost', q: 'energy efficient window tax credits and rebates' },

    { c: 'permits', q: 'do I need a permit to replace windows in {city}, {state}' },
    { c: 'permits', q: 'egress window requirements for a bedroom' },
    { c: 'permits', q: 'tempered glass requirements near doors and bathtubs' },
    { c: 'permits', q: 'lead safe rules for replacing windows in an older home' },
    { c: 'permits', q: 'historic district rules for replacing windows' },
    { c: 'permits', q: 'energy code window U-factor requirements in {state}' },

    { c: 'comparison', q: 'vinyl vs fiberglass windows' },
    { c: 'comparison', q: 'Andersen vs Pella vs Marvin windows' },
    { c: 'comparison', q: 'double hung vs casement windows' },
    { c: 'comparison', q: 'double pane vs triple pane windows' },
    { c: 'comparison', q: 'insert replacement vs full frame window replacement' },
    { c: 'comparison', q: 'fiberglass vs steel entry door' },
    { c: 'comparison', q: 'sliding vs French patio doors' },

    { c: 'technical', q: 'how long do replacement windows last' },
    { c: 'technical', q: 'how long does window replacement take' },
    { c: 'technical', q: 'what does low-E glass do' },
    { c: 'technical', q: 'what do U-factor and solar heat gain ratings mean' },
    { c: 'technical', q: 'what is argon gas in windows' },
    { c: 'technical', q: 'can windows be replaced in winter' },
    { c: 'technical', q: 'how to tell if windows need replacing' },
    { c: 'technical', q: 'what does a window warranty cover' },

    { c: 'application', q: 'replacing windows in a historic home' },
    { c: 'application', q: 'noise reducing windows for a house near a highway' },
    { c: 'application', q: 'impact windows for storm protection' },
    { c: 'application', q: 'adding a new window opening to an existing wall' },
    { c: 'application', q: 'basement egress window installation' },

    { c: 'problem', q: 'condensation between window panes' },
    { c: 'problem', q: 'drafty windows' },
    { c: 'problem', q: 'window is hard to open or will not stay up' },
    { c: 'problem', q: 'water leaking around a window' },
    { c: 'problem', q: 'front door sticking or letting in air' },
    { c: 'problem', q: 'rotted window sill' },

    { c: 'vendor-selection', q: 'questions to ask a window replacement company' },
    { c: 'vendor-selection', q: 'how to compare window replacement quotes' },
    { c: 'vendor-selection', q: 'are in-home window sales appointments high pressure' },
    { c: 'vendor-selection', q: 'manufacturer certified window installer meaning' },
    { c: 'vendor-selection', q: 'what should a window installation warranty cover' },
    { c: 'vendor-selection', q: 'buy windows from the manufacturer or a local installer' },

    { c: 'buyer-role', q: 'window replacement for a condo association in {state}' },
    { c: 'buyer-role', q: 'commercial storefront door and window installers near {city}' },
    { c: 'buyer-role', q: 'window replacement for rental properties near {city}' },
    { c: 'buyer-role', q: 'window company that works with historic commissions in {state}' },
  ],

  directoryDomains: [
    'yelp.com', 'bbb.org', 'angi.com', 'angieslist.com', 'homeadvisor.com', 'thumbtack.com',
    'houzz.com', 'yellowpages.com', 'nextdoor.com', 'porch.com', 'bark.com', 'networx.com',
    'buildzoom.com', 'homeguide.com', 'fixr.com', 'modernize.com', 'facebook.com',
    'instagram.com', 'linkedin.com', 'mapquest.com', 'manta.com', 'chamberofcommerce.com',
    'superpages.com',
  ],

  referenceDomains: [
    'wikipedia.org', 'reddit.com', 'quora.com', 'youtube.com',
    'energystar.gov', 'energy.gov', 'irs.gov', 'epa.gov', 'iccsafe.org', 'nps.gov', 'nfrc.org',
    'thisoldhouse.com', 'bobvila.com', 'familyhandyman.com', 'consumerreports.org', 'forbes.com',
    'bankrate.com', 'remodeling.hw.net', 'windowanddoor.com',
    'andersenwindows.com', 'pella.com', 'marvin.com', 'milgard.com', 'jeld-wen.com',
    'provia.com', 'therma-tru.com', 'larsondoors.com', 'plygem.com', 'simonton.com',
    'patch.com', 'einpresswire.com', 'prnewswire.com', 'businesswire.com', 'globenewswire.com',
  ],
}
