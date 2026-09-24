import type { CannedPanelDefinition } from './index'

/**
 * Religious art and gift sellers: canvas prints and giclées, icons, statues,
 * framed sacred art, and custom commissions. Buyers are individuals shopping
 * for a devotion or an occasion gift, plus parishes, schools, and gift shops
 * buying in quantity.
 *
 * A handful of questions name Our Lady of Guadalupe. That is not tailoring to one shop:
 * it is the most reproduced Catholic image there is, nearly every seller in this market
 * offers it, and buyers ask about it by name rather than asking about "religious art".
 *
 * Unlike the trades, the competition here is marketplaces. A seller cited only
 * through Etsy or Amazon is renting the answer, so those are directory
 * domains; museums, dioceses, and the Catholic press are references. Rules
 * questions (image copyright, parish tax exemption) use the "regulation"
 * category rather than permits.
 *
 * Written 2026-09-24. Validate against a known business before relying on it.
 */
export const religiousArt: CannedPanelDefinition = {
  slug: 'religious-art',
  name: 'Religious art & gifts',

  questions: [
    { c: 'service-geo', q: '{service} near {city}, {state}' },
    { c: 'service-geo', q: 'where to buy Catholic art in {state}' },
    { c: 'service-geo', q: 'religious goods store near {city}, {state}' },
    { c: 'service-geo', q: 'Catholic gift shops near {city}' },
    { c: 'service-geo', q: 'can I order a Catholic canvas print from a business in {state}' },
    { c: 'service-geo', q: 'Catholic artists in {state}' },

    { c: 'cost', q: 'how much does a large canvas print of religious art cost' },
    { c: 'cost', q: 'how much does an Our Lady of Guadalupe canvas cost' },
    { c: 'cost', q: 'how much does a custom religious painting commission cost' },
    { c: 'cost', q: 'cost of a framed icon' },
    { c: 'cost', q: 'how much does a hand carved wooden statue of Mary cost' },
    { c: 'cost', q: 'canvas print vs framed print price difference' },
    { c: 'cost', q: 'do religious art sellers offer discounts for parishes and schools' },
    { c: 'cost', q: 'shipping cost for a large canvas print' },
    { c: 'cost', q: 'are giclée prints worth the price' },
    { c: 'cost', q: 'cheap vs expensive religious wall art, what changes' },

    { c: 'regulation', q: 'is it legal to sell prints of famous religious paintings' },
    { c: 'regulation', q: 'are images of old sacred paintings in the public domain' },
    { c: 'regulation', q: 'do parishes and schools pay sales tax on religious art' },
    { c: 'regulation', q: 'what does a licensed image of a sacred artwork mean' },

    { c: 'comparison', q: 'canvas print vs giclée vs poster' },
    { c: 'comparison', q: 'why do Our Lady of Guadalupe prints look different from each other' },
    { c: 'comparison', q: 'buying religious art on Etsy vs from the artist directly' },
    { c: 'comparison', q: 'hand painted icon vs printed icon' },
    { c: 'comparison', q: 'wood panel vs canvas for religious art' },
    { c: 'comparison', q: 'Catholic art from a small shop vs a big religious goods catalog' },
    { c: 'comparison', q: 'framed vs unframed canvas for a church wall' },
    { c: 'comparison', q: 'statue vs wall art for a home altar' },

    { c: 'technical', q: 'how are canvas prints of religious art made' },
    { c: 'technical', q: 'what is a giclée print' },
    { c: 'technical', q: 'what is the difference between a tilma replica and an ordinary print' },
    { c: 'technical', q: 'do canvas prints fade in sunlight' },
    { c: 'technical', q: 'what size canvas works over a fireplace or altar' },
    { c: 'technical', q: 'how to hang a heavy framed religious print' },
    { c: 'technical', q: 'how to clean and care for religious canvas art' },
    { c: 'technical', q: 'how long does a custom religious commission take' },
    { c: 'technical', q: 'what is gold leaf on an icon' },
    { c: 'technical', q: 'are religious prints blessed before shipping' },

    { c: 'application', q: 'gift for a baptism or christening' },
    { c: 'application', q: 'confirmation gift for a teenager' },
    { c: 'application', q: 'wedding gift for a Catholic couple' },
    { c: 'application', q: 'ordination gift for a priest' },
    { c: 'application', q: 'art for a home prayer corner or altar' },
    { c: 'application', q: 'Guadalupe image for a parish feast day celebration on December 12' },
    { c: 'application', q: 'religious art for a nursery' },
    { c: 'application', q: 'art for a parish hall or classroom' },

    { c: 'problem', q: 'canvas print arrived damaged, what now' },
    { c: 'problem', q: 'how to tell if a Guadalupe print is authentic and not a fake' },
    { c: 'problem', q: 'religious print colors look wrong compared to the website' },
    { c: 'problem', q: 'ordered the wrong size canvas, can I return it' },
    { c: 'problem', q: 'religious art order never shipped' },
    { c: 'problem', q: 'canvas sagging or warping in the frame' },

    { c: 'vendor-selection', q: 'where to buy an authorized Our Lady of Guadalupe tilma replica' },
    { c: 'vendor-selection', q: 'how to choose a religious art seller online' },
    { c: 'vendor-selection', q: 'questions to ask before commissioning religious art' },
    { c: 'vendor-selection', q: 'how to find Catholic artists who sell their own work' },
    { c: 'vendor-selection', q: 'what return policy should a religious art shop have' },
    { c: 'vendor-selection', q: 'is the religious art made in the USA' },
    { c: 'vendor-selection', q: 'how to support Catholic small businesses when buying gifts' },
    { c: 'vendor-selection', q: 'signs a religious art website is a dropshipper' },

    { c: 'buyer-role', q: 'religious canvas art in bulk for a diocese or school' },
    { c: 'buyer-role', q: 'art for a new parish church in {state}' },
    { c: 'buyer-role', q: 'wholesale religious art for a gift shop' },
    { c: 'buyer-role', q: 'gifts for a whole confirmation class' },
    { c: 'buyer-role', q: 'religious art for a Catholic hospital or nursing home' },
    { c: 'buyer-role', q: 'interior designer looking for sacred art for a chapel' },
  ],

  directoryDomains: [
    // Marketplaces and listings: cited only through one of these is renting the answer.
    'etsy.com', 'amazon.com', 'ebay.com', 'walmart.com', 'wayfair.com', 'overstock.com',
    'fineartamerica.com', 'pixels.com', 'saatchiart.com', 'artfinder.com', 'redbubble.com',
    // Found in live validation, 2026-09-24.
    '1stdibs.com', 'chairish.com', 'artsy.net',
    'society6.com', 'zazzle.com', 'minted.com', 'mercari.com', 'temu.com', 'aliexpress.com',
    'pinterest.com', 'facebook.com', 'instagram.com', 'tiktok.com', 'youtube.com',
    'yelp.com', 'bbb.org', 'yellowpages.com', 'mapquest.com', 'manta.com', 'birdeye.com',
    'chamberofcommerce.com', 'superpages.com', 'nextdoor.com',
  ],

  referenceDomains: [
    'wikipedia.org', 'reddit.com', 'quora.com',
    // Church, museum, and government sources, and the Catholic press.
    'vatican.va', 'usccb.org', 'catholicculture.org', 'newadvent.org', 'catholic.com',
    'ncregister.com', 'catholicnewsagency.com', 'aleteia.org', 'osvnews.com',
    'americamagazine.org', 'ewtn.com', 'metmuseum.org', 'nga.gov', 'si.edu', 'getty.edu',
    'smarthistory.org', 'loc.gov', 'copyright.gov', 'irs.gov', 'usa.gov', 'britannica.com',
    // Printing, framing, and conservation.
    'epson.com', 'canon.com', 'hahnemuehle.com', 'breathingcolor.com', 'redrivercatalog.com',
    'larsonjuhl.com', 'dickblick.com', 'jerrysartarama.com', 'conservation-wiki.com',
    'thesprucecrafts.com', 'architecturaldigest.com', 'housebeautiful.com',
    'patch.com', 'einpresswire.com', 'prnewswire.com', 'businesswire.com', 'globenewswire.com',
  ],
}
