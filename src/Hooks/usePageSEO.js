import { useEffect } from "react";

const SITE_ORIGIN = "https://mohammad-mehdi-sadeghi.vercel.app";

/**
 * usePageSEO - Dynamic Page-level SEO / AEO / GEO Metadata Manager
 * Updates document title, meta descriptions, OpenGraph, Twitter tags, and JSON-LD structured data per route.
 */
export default function usePageSEO({
  title = "Mohammad Mehdi Sadeghi | Frontend Developer",
  description = "Portfolio of Mohammad Mehdi Sadeghi, Frontend Developer specializing in React, TypeScript, Tailwind CSS, and JavaScript. Explore modern web projects, technical articles, and interactive showcases.",
  canonical,
  image = "/og-preview.png",
  type = "website",
  schema = null,
} = {}) {
  useEffect(() => {
    // 1. Resolve canonical and absolute image URLs
    const currentOrigin = typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : SITE_ORIGIN;
    const finalCanonical = canonical || (typeof window !== "undefined" ? window.location.href : SITE_ORIGIN);
    const finalImage = image.startsWith("http")
      ? image
      : `${SITE_ORIGIN}${image.startsWith("/") ? "" : "/"}${image}`;

    // 2. Update Title
    document.title = title;

    // Helper to create or update meta tags
    const setMetaTag = (attributeName, attributeValue, content) => {
      if (!content) return;
      let element = document.querySelector(`meta[${attributeName}="${attributeValue}"]`);
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attributeName, attributeValue);
        document.head.appendChild(element);
      }
      element.setAttribute("content", content);
    };

    // 3. Standard Meta Tags
    setMetaTag("name", "title", title);
    setMetaTag("name", "description", description);

    // 4. Open Graph Tags (Facebook, Telegram, WhatsApp, LinkedIn)
    setMetaTag("property", "og:title", title);
    setMetaTag("property", "og:description", description);
    setMetaTag("property", "og:url", finalCanonical);
    setMetaTag("property", "og:type", type);
    setMetaTag("property", "og:site_name", "Mohammad Mehdi Sadeghi Portfolio");
    setMetaTag("property", "og:image", finalImage);
    setMetaTag("property", "og:image:secure_url", finalImage);
    setMetaTag("property", "og:image:width", "1200");
    setMetaTag("property", "og:image:height", "630");
    setMetaTag("property", "og:image:alt", title);

    // 5. Twitter Card Tags
    setMetaTag("name", "twitter:card", "summary_large_image");
    setMetaTag("name", "twitter:title", title);
    setMetaTag("name", "twitter:description", description);
    setMetaTag("name", "twitter:url", finalCanonical);
    setMetaTag("name", "twitter:image", finalImage);
    setMetaTag("name", "twitter:image:alt", title);

    // 6. Canonical Link
    let linkCanonical = document.querySelector('link[rel="canonical"]');
    if (!linkCanonical) {
      linkCanonical = document.createElement("link");
      linkCanonical.setAttribute("rel", "canonical");
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.setAttribute("href", finalCanonical);

    // 7. Dynamic JSON-LD Schema (if provided)
    let schemaScript = document.getElementById("dynamic-page-schema");
    if (schema) {
      if (!schemaScript) {
        schemaScript = document.createElement("script");
        schemaScript.id = "dynamic-page-schema";
        schemaScript.type = "application/ld+json";
        document.head.appendChild(schemaScript);
      }
      schemaScript.textContent = JSON.stringify(schema);
    } else if (schemaScript) {
      schemaScript.remove();
    }
  }, [title, description, canonical, image, type, schema]);
}
