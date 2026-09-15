import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback, useRef } from "react";
import "./App.css";
import Header from "./Components/Header";
import Project from "./Page/Project";
import About from "./Page/About";
import Home from "./Page/Home";
import Contact from "./Page/Contact";
import NotFound from "./Page/NotFound";
import Footer from "./Components/Footer";
import VisitTracker from "./Components/VisitTracker";
import AdminApp from "./Page/Admin/AdminApp";
import ErrorBoundary from "./Components/ErrorBoundary";
import BootLoader from "./Components/BootLoader";
import PageTransition from "./Components/PageTransition";
import Cursor from "./Components/Cursor";

/* Timing (ms) — must match PageTransition CSS:
   bars sweep in:  350ms + 7*40ms stagger ≈ 630ms full cover
   we navigate at 500ms (mostly covered)
   release at pathname change → sweep-out 400ms + stagger ≈ 680ms        */
const NAVIGATE_AFTER = 900;

function PublicSite() {
  const location = useLocation();
  const navigate = useNavigate();

  // ---- Boot loader: run once per session (sessionStorage keeps it from
  // re-appearing on every in-app navigation back to the site) ----
  const [booted, setBooted] = useState(() => {
    try {
      return sessionStorage.getItem("booted") === "1";
    } catch {
      return false;
    }
  });
  const handleBooted = useCallback(() => {
    try {
      sessionStorage.setItem("booted", "1");
    } catch {
      /* private mode */
    }
    setBooted(true);
  }, []);

  // ---- Page transition (overlay-only): bars sweep down covering the screen,
  // at ~500ms the router swaps the page underneath, then bars sweep out. ----
  const [covering, setCovering] = useState(false);
  const [coverPath, setCoverPath] = useState("/");
  const [revealKey, setRevealKey] = useState(0);
  const firstPath = useRef(true);
  const coverPathRef = useRef("/");

  // intercept internal link clicks → cover first, then navigate
  useEffect(() => {
    const onClick = (e) => {
      if (e.defaultPrevented || e.button !== 0) return;
      const a = e.target.closest?.("a[href^='/']");
      if (!a || a.target === "_blank" || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const href = a.getAttribute("href");
      if (!href) return;
      // external-ish or same-page: let router handle normally
      if (href === location.pathname) return;
      e.preventDefault();
      e.stopPropagation();
      setCoverPath(href);
      coverPathRef.current = href;
      setCovering(true);
      document.body.style.overflow = "hidden";
      setTimeout(() => {
        navigate(href);
        document.body.style.overflow = "";
      }, NAVIGATE_AFTER);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [location.pathname, navigate]);

  // release the cover when the route actually changed under it
  useEffect(() => {
    if (firstPath.current) {
      firstPath.current = false;
      setRevealKey((k) => k + 1);
      return;
    }
    if (coverPathRef.current === location.pathname) {
      // this path change was initiated by our overlay → play sweep-out
      setCovering(false);
    }
    setRevealKey((k) => k + 1);
  }, [location.pathname]);

  // browser back/forward: cover before popstate swap isn't possible reliably;
  // just play the sweep-out reveal for the incoming page
  useEffect(() => {
    const onPop = () => {
      setCoverPath(location.pathname);
      setCovering(true);
      setTimeout(() => setCovering(false), 700);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [location.pathname]);

  return (
    <>
      <VisitTracker />
      {!booted && <BootLoader onDone={handleBooted} />}
      <Header />
      <ErrorBoundary key={location.pathname}>
        <div className="page-reveal" key={revealKey} style={{ minHeight: "calc(100vh - 116px)" }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/project" element={<Project />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </ErrorBoundary>
      <Footer />
      <PageTransition
        path={covering ? coverPath : location.pathname}
        leaving={covering}
      />
    </>
  );
}

function App() {
  return (
    <>
      <Cursor />
      <Routes>
        <Route path="/admin/*" element={<AdminApp />} />
        <Route path="/*" element={<PublicSite />} />
      </Routes>
    </>
  );
}

export default App;
