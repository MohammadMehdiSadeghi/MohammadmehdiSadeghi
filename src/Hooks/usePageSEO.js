import { useEffect } from "react";

export default function usePageSEO({
  title = "Mohammad Mehdi Sadeghi | Frontend Engineer & UI Specialist",
  description = "Portfolio of Mohammad Mehdi Sadeghi, a Senior Frontend Engineer and UI Specialist specializing in modern React, JavaScript, responsive interfaces, and interactive web apps.",
  canonical = window.location.href,
  image = "/vite.svg",
  type = "website",
} = {}) {
  useEffect(() => {
    document.title = title;

    const setMetaTag = (attributeName, attributeValue, content) => {
      let element = document.querySelector(`meta[${attributeName}="${attributeValue}"]`);
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attributeName, attributeValue);
        document.head.appendChild(element);
      }
      element.setAttribute("content", content);
    };

    setMetaTag("name", "title", title);
    setMetaTag("name", "description", description);

    setMetaTag("property", "og:title", title);
    setMetaTag("property", "og:description", description);
    setMetaTag("property", "og:url", canonical);
    setMetaTag("property", "og:type", type);
    if (image) setMetaTag("property", "og:image", image);

    setMetaTag("name", "twitter:title", title);
    setMetaTag("name", "twitter:description", description);
    setMetaTag("name", "twitter:url", canonical);
    if (image) setMetaTag("name", "twitter:image", image);

    let linkCanonical = document.querySelector('link[rel="canonical"]');
    if (!linkCanonical) {
      linkCanonical = document.createElement("link");
      linkCanonical.setAttribute("rel", "canonical");
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.setAttribute("href", canonical);
  }, [title, description, canonical, image, type]);
}
