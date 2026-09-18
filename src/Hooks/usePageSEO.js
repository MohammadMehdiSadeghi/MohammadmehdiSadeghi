import { useEffect } from "react";

/**
 * usePageSEO - Dynamic Page-level SEO Metadata Manager
 * Updates document title, meta descriptions, OpenGraph, and Twitter tags dynamically per route.
 */
export default function usePageSEO({
  title = "Mohammad Mehdi Sadeghi | Frontend Engineer & UI Specialist",
  description = "Portfolio of Mohammad Mehdi Sadeghi, a Senior Frontend Engineer and UI Specialist specializing in modern React, JavaScript, responsive interfaces, and interactive web apps.",
  canonical = window.location.href,
  image = "/vite.svg",
  type = "website",
} = {}) {
  useEffect(() => {
    // 1. Update Title
    document.title = title;

    // Helper to create or update meta tags
    const setMetaTag = (attributeName, attributeValue, content) => {
      let element = document.querySelector(`meta[${attributeName}="${attributeValue}"]`);
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attributeName, attributeValue);
        document.head.appendChild(element);
      }
      element.setAttribute("content", content);
    };

    // 2. Standard Meta Tags
    setMetaTag("name", "title", title);
    setMetaTag("name", "description", description);

    // 3. Open Graph Tags
    setMetaTag("property", "og:title", title);
    setMetaTag("property", "og:description", description);
    setMetaTag("property", "og:url", canonical);
    setMetaTag("property", "og:type", type);
    if (image) setMetaTag("property", "og:image", image);

    // 4. Twitter Card Tags
    setMetaTag("name", "twitter:title", title);
    setMetaTag("name", "twitter:description", description);
    setMetaTag("name", "twitter:url", canonical);
    if (image) setMetaTag("name", "twitter:image", image);

    // 5. Canonical Link
    let linkCanonical = document.querySelector('link[rel="canonical"]');
    if (!linkCanonical) {
      linkCanonical = document.createElement("link");
      linkCanonical.setAttribute("rel", "canonical");
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.setAttribute("href", canonical);
  }, [title, description, canonical, image, type]);
}
