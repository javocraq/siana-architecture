import { lazy, Suspense, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";


// The admin is behind a login and pulls in the whole rich-text editor
// (~560 kB of TipTap). Loading it lazily keeps that weight off every
// public page view; a brief fallback inside the admin is a fair trade.
// Every route except the landing page loads on demand. The detail pages
// pull in Mapbox through their embedded maps, which would otherwise sit on
// the critical path of a visitor who only ever sees the home page.
const About = lazy(() => import("./pages/About.tsx"));
const Cities = lazy(() => import("./pages/Cities.tsx"));
const CityDetail = lazy(() => import("./pages/CityDetail.tsx"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail.tsx"));
const JournalArticle = lazy(() => import("./pages/JournalArticle.tsx"));
const Resources = lazy(() => import("./pages/Resources.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

// Atlas carries Mapbox (~1.7 MB). It is its own destination, so it loads
// on demand instead of weighing down every landing on the home page.
const Atlas = lazy(() => import("./pages/Atlas.tsx"));
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin.tsx"));
const AdminProjects = lazy(() => import("./pages/admin/AdminProjects.tsx"));
const AdminPlaceholder = lazy(() => import("./pages/admin/AdminPlaceholder.tsx"));
const AdminProjectEdit = lazy(() => import("./pages/admin/AdminProjectEdit.tsx"));
const AdminJournal = lazy(() => import("./pages/admin/AdminJournal.tsx"));
const AdminJournalEdit = lazy(() => import("./pages/admin/AdminJournalEdit.tsx"));
const AdminCities = lazy(() => import("./pages/admin/AdminCities.tsx"));
const AdminCityEdit = lazy(() => import("./pages/admin/AdminCityEdit.tsx"));
const AdminSEO = lazy(() => import("./pages/admin/AdminSEO.tsx"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings.tsx"));
const AdminIntegrations = lazy(() => import("./pages/admin/AdminIntegrations.tsx"));
const AdminAbout = lazy(() => import("./pages/admin/AdminAbout.tsx"));
const AdminHome = lazy(() => import("./pages/admin/AdminHome.tsx"));
const AdminTaxonomies = lazy(() => import("./pages/admin/AdminTaxonomies.tsx"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard.tsx"));

const queryClient = new QueryClient();

// Reset scroll to the top on every route change — otherwise navigating
// from a scrolled page leaves the next page scrolled to the same offset
// (e.g. landing on /cities already scrolled to the bottom).
// Forwarders that preserve :slug / :id while sending the user to the new path.
function PracticeRedirect() {
  const { slug } = useParams();
  return <Navigate to={`/practice${slug ? `/${slug}` : ""}`} replace />;
}
function AdminPracticeRedirect() {
  const { id } = useParams();
  return <Navigate to={`/admin/practice${id ? `/${id}` : ""}`} replace />;
}

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    // A hash (e.g. "/#map") manages its own scroll target — don't yank to top.
    if (hash) return;
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          {/* Only the lazily-loaded admin routes ever suspend; the public
              pages are in the main chunk and render straight away. */}
          <Suspense fallback={<div style={{ minHeight: "100vh" }} />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/atlas" element={<Atlas />} />
            <Route path="/about" element={<About />} />
            <Route path="/cities" element={<Cities />} />
            <Route path="/cities/:slug" element={<CityDetail />} />
            <Route path="/projects/:slug" element={<ProjectDetail />} />
            <Route path="/practice" element={<Resources />} />
            <Route path="/practice/:slug" element={<JournalArticle />} />
            {/* Legacy paths — redirect to /practice */}
            <Route path="/journal" element={<PracticeRedirect />} />
            <Route path="/journal/:slug" element={<PracticeRedirect />} />
            <Route path="/resources" element={<PracticeRedirect />} />
            <Route path="/resources/:slug" element={<PracticeRedirect />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/projects" element={<AdminProjects />} />
            <Route path="/admin/projects/new" element={<AdminProjectEdit />} />
            <Route path="/admin/projects/:id" element={<AdminProjectEdit />} />
            <Route path="/admin/cities" element={<AdminCities />} />
            <Route path="/admin/cities/new" element={<AdminCityEdit />} />
            <Route path="/admin/cities/:id" element={<AdminCityEdit />} />
            <Route path="/admin/practice" element={<AdminJournal />} />
            <Route path="/admin/practice/new" element={<AdminJournalEdit />} />
            <Route path="/admin/practice/:id" element={<AdminJournalEdit />} />
            {/* Legacy admin paths — redirect to /admin/practice */}
            <Route path="/admin/journal" element={<AdminPracticeRedirect />} />
            <Route path="/admin/journal/new" element={<AdminPracticeRedirect />} />
            <Route path="/admin/journal/:id" element={<AdminPracticeRedirect />} />
            <Route path="/admin/resources" element={<AdminPracticeRedirect />} />
            <Route path="/admin/resources/new" element={<AdminPracticeRedirect />} />
            <Route path="/admin/resources/:id" element={<AdminPracticeRedirect />} />
            <Route path="/admin/seo" element={<AdminSEO />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/admin/settings/integrations" element={<AdminIntegrations />} />
            <Route path="/admin/about" element={<AdminAbout />} />
            <Route path="/admin/home" element={<AdminHome />} />
            <Route path="/admin/taxonomies" element={<AdminTaxonomies />} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
