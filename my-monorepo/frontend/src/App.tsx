import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { BookingsProvider } from "@/contexts/BookingsContext";
import Landing from "./pages/Landing.tsx";
import Index from "./pages/Index.tsx";
import SearchResults from "./pages/SearchResults.tsx";
import ItemDetail from "./pages/ItemDetail.tsx";
import Profile from "./pages/Profile.tsx";
import NotFound from "./pages/NotFound.tsx";
import Booking from "./pages/Booking.tsx";
import BookedTickets from "./pages/BookedTickets.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <BookingsProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/trips" element={<Index />} />
              <Route path="/search" element={<SearchResults />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/details" element={<ItemDetail />} />
              <Route path="/booking" element={<Booking />} />
              <Route path="/bookings" element={<BookedTickets />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </BookingsProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
