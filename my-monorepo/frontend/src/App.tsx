import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { BookingsProvider } from "@/contexts/BookingsContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import Landing from "./pages/Landing.tsx";
import Index from "./pages/Index.tsx";
import SearchResults from "./pages/SearchResults.tsx";
import ItemDetail from "./pages/ItemDetail.tsx";
import Profile from "./pages/Profile.tsx";
import NotFound from "./pages/NotFound.tsx";
import Booking from "./pages/Booking.tsx";
import BookedTickets from "./pages/BookedTickets.tsx";
import AddAttractionToTrip from "./pages/AddAttractionToTrip.tsx";
import Login from "./pages/Login";
import Logout from "./pages/Logout";
import ProtectedRoute from "./components/ProtectedRoute";
import Signup from "./pages/SignUp";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <BookingsProvider>
        <NotificationProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/login" element={<Login />} />
                <Route path="/landing" element={<Landing />} />

                <Route
                  path="/trips"
                  element={
                    <ProtectedRoute>
                      <Index />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/search"
                  element={
                    <ProtectedRoute>
                      <SearchResults />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/details"
                  element={
                    <ProtectedRoute>
                      <ItemDetail />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/booking"
                  element={
                    <ProtectedRoute>
                      <Booking />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/bookings"
                  element={
                    <ProtectedRoute>
                      <BookedTickets />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/attractions/add-to-trip"
                  element={
                    <ProtectedRoute>
                      <AddAttractionToTrip />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/logout"
                  element={
                    <ProtectedRoute>
                      <Logout />
                    </ProtectedRoute>
                  }
                  />
                  
                <Route path="*" element={<NotFound />} />
                
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </NotificationProvider>
      </BookingsProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

