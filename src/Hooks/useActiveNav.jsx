import { useLocation } from "react-router-dom";

const routes = {
  home: "/",
  about: "/about",
  project: "/project",
  blog: "/blog",
  contact: "/contact",
};

export function useActiveNav() {
  const location = useLocation();

  /* /blog/<slug> must keep the _Blog tab lit, so match by prefix for nested
     routes instead of an exact pathname comparison. */
  const isActive = (name) => {
    const target = routes[name];
    if (!target) return false;
    if (target === "/") return location.pathname === "/";
    return location.pathname === target || location.pathname.startsWith(`${target}/`);
  };

  return { isActive };
}
