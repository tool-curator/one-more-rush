import { DEFAULT_SITE_URL, ROUTE_SEO_DATA, AUTH_ROUTE_SEO } from '../config/seoContent.js';

export { DEFAULT_SITE_URL, ROUTE_SEO_DATA, AUTH_ROUTE_SEO };

export const SITE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SITE_URL)
  ? import.meta.env.VITE_SITE_URL.replace(/\/+$/, '')
  : DEFAULT_SITE_URL;

export const ROUTE_METADATA = {
  ...ROUTE_SEO_DATA,
  ...AUTH_ROUTE_SEO,
};

/**
 * Apply SEO metadata dynamically based on current path
 */
export function updatePageSEO(pathname = '/') {
  if (typeof document === 'undefined') return;

  const cleanPath = pathname.replace(/\/+$/, '') || '/';
  const meta = ROUTE_METADATA[cleanPath] || ROUTE_METADATA['/404'];

  // 1. Page Title
  document.title = meta.title;

  // 2. Meta Description
  setMetaTag('name', 'description', meta.description);

  // 3. Robots Directive
  if (meta.noindex) {
    setMetaTag('name', 'robots', 'noindex, follow');
  } else {
    setMetaTag('name', 'robots', 'index, follow');
  }

  // 4. Canonical URL (Always uses canonical production domain)
  const canonicalUrl = `${SITE_URL}${meta.path === '/' ? '/' : meta.path}`;
  setCanonicalLink(canonicalUrl);

  // 5. Open Graph Metadata
  setMetaTag('property', 'og:title', meta.title);
  setMetaTag('property', 'og:description', meta.description);
  setMetaTag('property', 'og:url', canonicalUrl);
  setMetaTag('property', 'og:type', 'website');
  setMetaTag('property', 'og:site_name', 'ONE MORE RUSH');
  const ogImageUrl = `${SITE_URL}/og-image.png`;
  setMetaTag('property', 'og:image', ogImageUrl);

  // 6. Twitter Card Metadata
  setMetaTag('name', 'twitter:card', 'summary_large_image');
  setMetaTag('name', 'twitter:title', meta.title);
  setMetaTag('name', 'twitter:description', meta.description);
  setMetaTag('name', 'twitter:image', ogImageUrl);

  // 7. Theme Color
  setMetaTag('name', 'theme-color', '#07070a');

  // 8. JSON-LD Structured Data
  updateStructuredData(meta, canonicalUrl);
}

function setMetaTag(attrName, attrVal, content) {
  let tag = document.querySelector(`meta[${attrName}="${attrVal}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attrName, attrVal);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

function setCanonicalLink(href) {
  let link = document.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

function updateStructuredData(meta, canonicalUrl) {
  let script = document.querySelector('#seo-structured-data');
  if (!script) {
    script = document.createElement('script');
    script.id = 'seo-structured-data';
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }

  let structuredData;

  if (meta.type === 'game' && meta.gameName) {
    structuredData = [
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: `${SITE_URL}/`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Games',
            item: `${SITE_URL}/#games-section`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: meta.gameName,
            item: canonicalUrl,
          },
        ],
      },
      {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: `${meta.gameName} — One More Rush`,
        url: canonicalUrl,
        applicationCategory: 'GameApplication',
        operatingSystem: 'Any',
        genre: meta.genre || 'Arcade Game',
        description: meta.description,
        inLanguage: 'en',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
      },
    ];
  } else if (meta.breadcrumbName) {
    structuredData = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: `${SITE_URL}/`,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: meta.breadcrumbName,
          item: canonicalUrl,
        },
      ],
    };
  } else {
    structuredData = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'ONE MORE RUSH',
      url: `${SITE_URL}/`,
      description: meta.description,
    };
  }

  script.textContent = JSON.stringify(structuredData);
}
