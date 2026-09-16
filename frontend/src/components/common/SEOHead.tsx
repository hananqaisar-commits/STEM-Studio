import { useEffect } from 'react';
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE, SEO_METADATA } from '../../data/seoMetadata';

export interface SEOHeadProps {
  title?: string;
  description?: string;
  canonical?: string;
  image?: string;
  noIndex?: boolean;
}

export function SEOHead({ 
  title, 
  description, 
  canonical, 
  image = DEFAULT_OG_IMAGE, 
  noIndex = false 
}: SEOHeadProps) {
  useEffect(() => {
    // Defaults from homepage metadata if not provided
    const defaultSEO = SEO_METADATA[''];
    
    const finalTitle = title || defaultSEO.title;
    const finalDescription = description || defaultSEO.description;
    const finalCanonical = canonical || defaultSEO.canonical;
    const finalCanonicalUrl = finalCanonical.startsWith('http') ? finalCanonical : `${SITE_URL}${finalCanonical}`;

    // Set document title
    const prevTitle = document.title;
    document.title = finalTitle;

    // Helper to manage meta tags
    const setMetaTag = (selector: string, attribute: string, value: string) => {
      let element = document.head.querySelector(selector);
      if (!element) {
        element = document.createElement('meta');
        
        // Parse selector to create the right attributes
        if (selector.includes('name=')) {
          const nameMatch = selector.match(/name="([^"]+)"/);
          if (nameMatch) element.setAttribute('name', nameMatch[1]);
        } else if (selector.includes('property=')) {
          const propMatch = selector.match(/property="([^"]+)"/);
          if (propMatch) element.setAttribute('property', propMatch[1]);
        }
        
        document.head.appendChild(element);
      }
      element.setAttribute(attribute, value);
      return element;
    };

    // Helper to manage link tags
    const setLinkTag = (rel: string, href: string) => {
      let element = document.head.querySelector(`link[rel="${rel}"]`);
      if (!element) {
        element = document.createElement('link');
        element.setAttribute('rel', rel);
        document.head.appendChild(element);
      }
      element.setAttribute('href', href);
      return element;
    };

    // Set standard meta tags
    setMetaTag('meta[name="description"]', 'content', finalDescription);
    setLinkTag('canonical', finalCanonicalUrl);

    // Open Graph
    setMetaTag('meta[property="og:title"]', 'content', finalTitle);
    setMetaTag('meta[property="og:description"]', 'content', finalDescription);
    setMetaTag('meta[property="og:url"]', 'content', finalCanonicalUrl);
    setMetaTag('meta[property="og:type"]', 'content', 'website');
    setMetaTag('meta[property="og:image"]', 'content', image);
    setMetaTag('meta[property="og:site_name"]', 'content', SITE_NAME);

    // Twitter
    setMetaTag('meta[name="twitter:card"]', 'content', 'summary_large_image');
    setMetaTag('meta[name="twitter:title"]', 'content', finalTitle);
    setMetaTag('meta[name="twitter:description"]', 'content', finalDescription);
    setMetaTag('meta[name="twitter:image"]', 'content', image);

    // Robots
    if (noIndex) {
      setMetaTag('meta[name="robots"]', 'content', 'noindex, follow');
    } else {
      const robotsTag = document.head.querySelector('meta[name="robots"]');
      if (robotsTag) robotsTag.remove();
    }

    // Cleanup on unmount
    return () => {
      document.title = prevTitle;
      // In a strict SPA you might want to remove tags on unmount, 
      // but usually the next page will overwrite them, which is cleaner.
    };
  }, [title, description, canonical, image, noIndex]);

  return null;
}
