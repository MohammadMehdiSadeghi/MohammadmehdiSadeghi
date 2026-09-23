import { Route, Routes, useLocation } from "react-router-dom";
import { useEffect, useState, useCallback, useRef } from "react";
import "./App.css";
import Header from "./Components/Header";
import Project from "./Page/Project";
import About from "./Page/About";
import Home from "./Page/Home";
import Contact from "./Page/Contact";
import Blog from "./Page/Blog";
import BlogPost from "./Page/Blog/Post";
import NotFound from "./Page/NotFound";
import Footer from "./Components/Footer";
import VisitTracker from "./Components/VisitTracker";
import AdminApp from "./Page/Admin/AdminApp";
import ErrorBoundary from "./Components/ErrorBoundary";
import BootLoader from "./Components/BootLoader";
import PageTransition from "./Components/PageTransition";
import Cursor from "./Components/Cursor";
import { SiteInfoProvider } from "./Hooks/useSiteInfo";

const NAVIGATE_AFTER = 480;

function PublicSite() {
  const location = useLocation();

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
      /* private mode / storage blocked — keep session-local boot flag */
    }
    setBooted(true);
  }, []);

  const [transitioning, setTransitioning] = useState(false);
  const prevPath = useRef(location.pathname);

  useEffect(() => {
    if (prevPath.current !== location.pathname) {
      prevPath.current = location.pathname;
      setTransitioning(true);
      const timer = setTimeout(() => setTransitioning(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  return (
    <SiteInfoProvider>
      <VisitTracker />
      {!booted && <BootLoader onDone={handleBooted} />}
      <Header />
      <PageTransition active={transitioning} path={location.pathname} />
      <ErrorBoundary key={location.pathname}>
        <div className="page-reveal" key={location.pathname} style={{ minHeight: "calc(100vh - 116px)" }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/project" element={<Project />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </ErrorBoundary>
      <Footer />
    </SiteInfoProvider>
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
