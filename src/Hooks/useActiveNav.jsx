import { useLocation } from "react-router-dom";

const routes = {
  home: "/",
  about: "/about",
  project: "/project",
  contact: "/contact",
};

export function useActiveNav() {
  const location = useLocation();

  const isActive = (name) => location.pathname === routes[name];

  return { isActive };
}
