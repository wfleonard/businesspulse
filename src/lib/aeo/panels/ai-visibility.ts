import type { CannedPanelDefinition } from './index'

/**
 * AI visibility and AEO: self-serve tools that check whether ChatGPT,
 * Perplexity, Gemini, and Claude cite a business, and the agencies and
 * consultants who do answer engine optimization. Buyers are small business
 * owners checking themselves, in-house marketers, and agencies that want to
 * measure clients.
 *
 * The questions lean toward a business checking itself ("does ChatGPT
 * recommend my business") as well as hiring help, because that is where most
 * buyers start. A panel built only from agency-hiring questions measures the
 * agency half and misses the tool half.
 *
 * Review sites and agency directories (G2, Capterra, Clutch, and the rest) are
 * directory domains. Search engines, the AI companies' own help pages, and the
 * search trade press are references. SEO suites that added AI visibility
 * tracking (Semrush, Ahrefs, HubSpot) are left out of both lists: they compete.
 *
 * Written 2026-10-01. Validate against a known business before relying on it.
 */
export const aiVisibility: CannedPanelDefinition = {
  slug: 'ai-visibility',
  name: 'AI visibility & AEO',

  questions: [
    { c: 'service-geo', q: '{service} near {city}, {state}' },
    { c: 'service-geo', q: 'AEO agency near {city}, {state}' },
    { c: 'service-geo', q: 'AI search visibility audit for businesses in {state}' },
    { c: 'service-geo', q: 'who can check how my business appears in AI search near {city}' },

    { c: 'cost', q: 'how much does answer engine optimization cost' },
    { c: 'cost', q: 'how much do AI visibility tracking tools cost' },
    { c: 'cost', q: 'is there a free tool to check if ChatGPT mentions my business' },
    { c: 'cost', q: 'how much does a one-time AI search audit cost' },
    { c: 'cost', q: 'AEO agency retainer vs doing it yourself, what does each cost' },
    { c: 'cost', q: 'is paying for AI visibility monitoring worth it for a small business' },

    { c: 'comparison', q: 'AEO vs SEO, what is the difference' },
    { c: 'comparison', q: 'AEO vs GEO vs LLM SEO' },
    { c: 'comparison', q: 'best AI visibility tools for small businesses' },
    { c: 'comparison', q: 'AI search tracking tool vs hiring an AEO agency' },
    { c: 'comparison', q: 'does ranking on Google mean ChatGPT will recommend my business' },
    { c: 'comparison', q: 'Perplexity vs ChatGPT vs Google AI Overviews, which sends more customers' },
    { c: 'comparison', q: 'checking AI answers by hand vs using a tracking tool' },
    { c: 'comparison', q: 'Google Business Profile vs website, which does AI search cite for local businesses' },

    { c: 'technical', q: 'how do I check if ChatGPT recommends my business' },
    { c: 'technical', q: 'how do AI search engines decide which websites to cite' },
    { c: 'technical', q: 'how to measure AI search visibility' },
    { c: 'technical', q: 'what is an AI citation and how is it tracked' },
    { c: 'technical', q: 'does schema markup help a business get cited by AI search' },
    { c: 'technical', q: 'should I block or allow AI crawlers in robots.txt' },
    { c: 'technical', q: 'what is llms.txt and does it matter' },
    { c: 'technical', q: 'why do AI answers change from one day to the next' },
    { c: 'technical', q: 'how to see traffic from ChatGPT and Perplexity in Google Analytics' },
    { c: 'technical', q: 'how long does it take for AI search to start citing a new page' },

    { c: 'application', q: 'how can a contractor get recommended by ChatGPT' },
    { c: 'application', q: 'AI search visibility for a local service business' },
    { c: 'application', q: 'how a dentist or medical practice can show up in AI answers' },
    { c: 'application', q: 'how to get an online store cited by AI shopping answers' },
    { c: 'application', q: 'how to track which questions AI search answers about my industry' },
    { c: 'application', q: 'how to see which competitors AI search recommends instead of me' },

    { c: 'problem', q: 'ChatGPT does not mention my business, how do I fix it' },
    { c: 'problem', q: 'AI search recommends my competitors but not me' },
    { c: 'problem', q: 'why does AI search cite Yelp and Angi instead of my website' },
    { c: 'problem', q: 'ChatGPT has the wrong information about my business' },
    { c: 'problem', q: 'my website ranks on Google but never shows up in AI answers' },
    { c: 'problem', q: 'traffic dropped after Google AI Overviews, what can I do' },

    { c: 'vendor-selection', q: 'what to look for when hiring an AEO agency' },
    { c: 'vendor-selection', q: 'questions to ask an AEO agency before signing' },
    { c: 'vendor-selection', q: 'how to tell if an AEO agency is actually getting results' },
    { c: 'vendor-selection', q: 'which AI engines should an AI visibility tool track' },
    { c: 'vendor-selection', q: 'red flags when buying AI search optimization services' },
    { c: 'vendor-selection', q: 'should an AEO report show which sites were cited instead of mine' },

    { c: 'buyer-role', q: 'AI visibility reporting for a marketing agency with many clients' },
    { c: 'buyer-role', q: 'small business owner wants to know if AI search recommends them' },
    { c: 'buyer-role', q: 'in-house marketer needs to report AI search visibility to leadership' },
    { c: 'buyer-role', q: 'franchise or multi-location business tracking AI search by city' },
    { c: 'buyer-role', q: 'web designer adding AEO to client websites' },
  ],

  directoryDomains: [
    // Software review sites and agency directories: cited only through one of these is renting the answer.
    'g2.com', 'capterra.com', 'getapp.com', 'softwareadvice.com', 'trustradius.com',
    'producthunt.com', 'alternativeto.net', 'saasworthy.com', 'trustpilot.com',
    'clutch.co', 'upcity.com', 'designrush.com', 'goodfirms.co', 'sortlist.com',
    'agencyspotter.com', 'themanifest.com', 'expertise.com',
    'upwork.com', 'fiverr.com',
    'linkedin.com', 'facebook.com', 'instagram.com', 'youtube.com', 'tiktok.com',
    'yelp.com', 'bbb.org', 'yellowpages.com', 'manta.com', 'chamberofcommerce.com',
  ],

  referenceDomains: [
    'wikipedia.org', 'reddit.com', 'quora.com', 'medium.com',
    // The AI companies and search engines themselves.
    'openai.com', 'help.openai.com', 'perplexity.ai', 'anthropic.com', 'support.anthropic.com',
    'google.com', 'support.google.com', 'developers.google.com', 'blog.google', 'bing.com',
    'blogs.bing.com', 'microsoft.com', 'schema.org', 'llmstxt.org',
    // Search trade press and news.
    'searchengineland.com', 'searchenginejournal.com', 'searchengineroundtable.com',
    'theverge.com', 'techcrunch.com', 'forbes.com', 'businessinsider.com',
    'markets.businessinsider.com', 'sba.gov',
    'prnewswire.com', 'businesswire.com', 'globenewswire.com', 'einpresswire.com',
  ],
}
