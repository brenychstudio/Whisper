import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";

import Shell from "./components/Shell/Shell.jsx";
import PageTransition from "./components/PageTransition/PageTransition.jsx";

import Home from "./pages/Home.jsx";
import SeriesIndex from "./pages/SeriesIndex.jsx";
import SeriesPage from "./pages/SeriesPage.jsx";
import Prints from "./pages/Prints.jsx";
import Credits from "./pages/Credits.jsx";
import Contact from "./pages/Contact.jsx";
import NotFound from "./pages/NotFound.jsx";
import ExperiencePage from "./pages/ExperiencePage.jsx";
import XRPage from "./pages/XRPage.jsx";
import SharePage from "./pages/SharePage.jsx";

export default function App() {
  const location = useLocation();

  return (
    <Shell>
      <AnimatePresence mode="wait" initial={false}>
        <Routes location={location} key={location.pathname}>
          <Route path="/p/:id/*" element={<PageTransition><SharePage /></PageTransition>} />
          <Route path="/experience" element={<PageTransition><ExperiencePage /></PageTransition>} />
          <Route path="/xr" element={<PageTransition><XRPage /></PageTransition>} />
          <Route path="/" element={<PageTransition><Home /></PageTransition>} />
          <Route path="/series" element={<PageTransition><SeriesIndex /></PageTransition>} />
          <Route path="/series/:key" element={<PageTransition><SeriesPage /></PageTransition>} />
          <Route path="/prints" element={<PageTransition><Prints /></PageTransition>} />
          <Route path="/credits" element={<PageTransition><Credits /></PageTransition>} />
          <Route path="/contact" element={<PageTransition><Contact /></PageTransition>} />
          <Route path="/s" element={<Navigate to="/series" replace />} />
          <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
        </Routes>
      </AnimatePresence>
    </Shell>
  );
}