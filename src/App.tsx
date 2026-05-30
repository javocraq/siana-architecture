import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import About from "./pages/About.tsx";
import NotFound from "./pages/NotFound.tsx";
import Cities from "./pages/Cities.tsx";
import CityDetail from "./pages/CityDetail.tsx";
import ProjectDetail from "./pages/ProjectDetail.tsx";
import Journal from "./pages/Journal.tsx";
import JournalArticle from "./pages/JournalArticle.tsx";
import Resources from "./pages/Resources.tsx";

import AdminLogin from "./pages/admin/AdminLogin.tsx";
import AdminProjects from "./pages/admin/AdminProjects.tsx";
import AdminPlaceholder from "./pages/admin/AdminPlaceholder.tsx";
import AdminProjectEdit from "./pages/admin/AdminProjectEdit.tsx";
import AdminJournal from "./pages/admin/AdminJournal.tsx";
import AdminJournalEdit from "./pages/admin/AdminJournalEdit.tsx";
import AdminCities from "./pages/admin/AdminCities.tsx";
import AdminCityEdit from "./pages/admin/AdminCityEdit.tsx";
import AdminSEO from "./pages/admin/AdminSEO.tsx";
import AdminSettings from "./pages/admin/AdminSettings.tsx";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/about" element={<About />} />
            <Route path="/cities" element={<Cities />} />
            <Route path="/cities/:slug" element={<CityDetail />} />
            <Route path="/projects/:slug" element={<ProjectDetail />} />
            <Route path="/journal" element={<Journal />} />
            <Route path="/journal/:slug" element={<JournalArticle />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/resources/:slug" element={<JournalArticle />} />
            <Route path="/admin" element={<AdminProjects />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/projects" element={<AdminProjects />} />
            <Route path="/admin/projects/new" element={<AdminProjectEdit />} />
            <Route path="/admin/projects/:id" element={<AdminProjectEdit />} />
            <Route path="/admin/cities" element={<AdminCities />} />
            <Route path="/admin/cities/new" element={<AdminCityEdit />} />
            <Route path="/admin/cities/:id" element={<AdminCityEdit />} />
            <Route path="/admin/journal" element={<AdminJournal />} />
            <Route path="/admin/journal/new" element={<AdminJournalEdit />} />
            <Route path="/admin/journal/:id" element={<AdminJournalEdit />} />
            <Route path="/admin/resources" element={<AdminJournal />} />
            <Route path="/admin/resources/new" element={<AdminJournalEdit />} />
            <Route path="/admin/resources/:id" element={<AdminJournalEdit />} />
            <Route path="/admin/seo" element={<AdminSEO />} />
            <Route path="/admin/settings" element={<AdminSettings />} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
