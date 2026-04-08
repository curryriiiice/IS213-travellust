import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { TripCard } from '@/components/TripCard';
import { TripCommandCenter } from '@/components/TripCommandCenter';
import { Header } from '@/components/Header';
import { getUserTrips, createTrip, updateTripMembers } from '@/api/trip';
import { fetchAllClients, type ExternalClient } from '@/api/collaborator';
import { getInitials, getColorFromUuid } from '@/lib/collaborator-utils';
import type { Trip, Collaborator } from '@/types/trip';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Plus,
  UserPlus,
  UserMinus,
  CalendarIcon,
  DollarSign,
  MapPinIcon,
  RefreshCw,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getCurrentUserId } from '@/lib/auth';

const Index = () => {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [collabOpen, setCollabOpen] = useState(false);
  const [collabTripId, setCollabTripId] = useState<string | null>(null);
  const [newTripOpen, setNewTripOpen] = useState(false);

  const CURRENT_USER_ID = getCurrentUserId();

  const fetchTrips = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const fetched = await getUserTrips(CURRENT_USER_ID);
      setTrips(fetched);
    } catch (err) {
      console.error('Failed to load trips:', err);
      setFetchError('Could not load your trips. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, [CURRENT_USER_ID]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  // New trip form state
  const [tripName, setTripName] = useState('');
  const [tripDestination, setTripDestination] = useState('');
  const [tripStartDate, setTripStartDate] = useState<Date | undefined>();
  const [tripEndDate, setTripEndDate] = useState<Date | undefined>();
  const [tripBudget, setTripBudget] = useState('');

  // Collaborator state
  const [availableClients, setAvailableClients] = useState<ExternalClient[]>(
    [],
  );
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [clientsError, setClientsError] = useState<string | null>(null);
  const [selectedCollaboratorIds, setSelectedCollaboratorIds] = useState<
    Set<string>
  >(new Set([getCurrentUserId()]));

  // Fetch collaborators when the create trip dialog or collab manager opens
  useEffect(() => {
    const shouldFetch =
      (newTripOpen || collabOpen) &&
      availableClients.length === 0 &&
      !isLoadingClients;
    if (shouldFetch) {
      setIsLoadingClients(true);
      setClientsError(null);
      fetchAllClients()
        .then((clients) => {
          setAvailableClients(clients);
        })
        .catch((err) => {
          console.error('Failed to fetch collaborators:', err);
          setClientsError('Could not load collaborators');
        })
        .finally(() => setIsLoadingClients(false));
    }
  }, [newTripOpen, collabOpen, availableClients.length, isLoadingClients]);

  // Convert ExternalClient to display-friendly Collaborator
  const mapClientToCollaborator = (client: ExternalClient): Collaborator => ({
    id: client.client_uuid,
    name: client.name,
    initials: getInitials(client.name),
    color: getColorFromUuid(client.client_uuid),
    isOnline: false, // We don't have online status from API
  });

  // Resolve member_ids to Collaborator objects for a trip
  const getResolvedCollaborators = (trip: Trip | undefined): Collaborator[] => {
    if (!trip?.member_ids || availableClients.length === 0) return [];
    return trip.member_ids
      .map((id) => {
        const client = availableClients.find((c) => c.client_uuid === id);
        return client ? mapClientToCollaborator(client) : null;
      })
      .filter((c): c is Collaborator => c !== null);
  };

  const resetNewTripForm = () => {
    setTripName('');
    setTripDestination('');
    setTripStartDate(undefined);
    setTripEndDate(undefined);
    setTripBudget('');
    setSelectedCollaboratorIds(new Set([getCurrentUserId()]));
  };

  const [isCreatingTrip, setIsCreatingTrip] = useState(false);

  const handleCreateTrip = async () => {
    if (!tripName || !tripDestination || !tripStartDate || !tripEndDate) return;
    setIsCreatingTrip(true);
    try {
      const created = await createTrip(CURRENT_USER_ID, {
        name: tripName,
        destination: tripDestination,
        startDate: format(tripStartDate, 'yyyy-MM-dd'),
        endDate: format(tripEndDate, 'yyyy-MM-dd'),
        budget: Number(tripBudget) || 0,
        currency: 'SGD',
        memberIds: Array.from(selectedCollaboratorIds),
      });
      setTrips((prev) => [...prev, created]);
      toast({
        title: 'Trip created',
        description: `${tripName} — ${tripDestination}`,
      });
      setNewTripOpen(false);
      resetNewTripForm();
    } catch (err) {
      toast({
        title: 'Failed to create trip',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingTrip(false);
    }
  };

  const toggleTripCollab = (clientUuid: string) => {
    if (clientUuid === CURRENT_USER_ID) return; // can't remove self
    setSelectedCollaboratorIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(clientUuid)) {
        newSet.delete(clientUuid);
      } else {
        newSet.add(clientUuid);
      }
      return newSet;
    });
  };

  const openCollabManager = (tripId: string) => {
    setCollabTripId(tripId);
    setCollabOpen(true);
  };

  const collabTrip = trips.find((t) => t.id === collabTripId);
  // Resolve current trip's collaborators from member_ids
  const currentTripCollaborators = getResolvedCollaborators(collabTrip);
  // Get available collaborators (those not already in the trip)
  const availableCollabs = availableClients
    .filter((client) => !collabTrip?.member_ids?.includes(client.client_uuid))
    .map(mapClientToCollaborator);

  const addCollaborator = async (collab: Collaborator) => {
    if (!collabTripId || !collabTrip) return;

    const prevMemberIds = collabTrip.member_ids || [];
    const newMemberIds = [...prevMemberIds, collab.id];

    // Optimistic update
    setTrips((prev) =>
      prev.map((t) =>
        t.id === collabTripId ? { ...t, member_ids: newMemberIds } : t,
      ),
    );

    try {
      await updateTripMembers(collabTripId, newMemberIds);
      fetch(`/api/collab/trip/${collabTripId}/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'MEMBER_ADDED',
          user_id: CURRENT_USER_ID,
          data: { name: collab.name, member_id: collab.id },
        }),
      }).catch(() => {});
      toast({
        title: 'Collaborator added',
        description: `${collab.name} joined the trip`,
      });
    } catch (err) {
      // Revert on error
      setTrips((prev) =>
        prev.map((t) =>
          t.id === collabTripId ? { ...t, member_ids: prevMemberIds } : t,
        ),
      );
      toast({
        title: 'Failed to add collaborator',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const removeCollaborator = async (collabId: string) => {
    if (!collabTripId || !collabTrip) return;
    // Block self-removal
    if (collabId === CURRENT_USER_ID) {
      toast({
        title: 'Cannot remove yourself',
        description: 'You cannot remove yourself from the trip',
        variant: 'destructive',
      });
      return;
    }

    const prevMemberIds = collabTrip.member_ids || [];
    const newMemberIds = prevMemberIds.filter((id) => id !== collabId);

    // Optimistic update
    setTrips((prev) =>
      prev.map((t) =>
        t.id === collabTripId ? { ...t, member_ids: newMemberIds } : t,
      ),
    );

    try {
      await updateTripMembers(collabTripId, newMemberIds);
      const removedClient = availableClients.find((c) => c.client_uuid === collabId);
      fetch(`/api/collab/trip/${collabTripId}/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'MEMBER_REMOVED',
          user_id: CURRENT_USER_ID,
          data: { name: removedClient?.name ?? collabId, member_id: collabId },
        }),
      }).catch(() => {});
      toast({ title: 'Collaborator removed' });
    } catch (err) {
      // Revert on error
      setTrips((prev) =>
        prev.map((t) =>
          t.id === collabTripId ? { ...t, member_ids: prevMemberIds } : t,
        ),
      );
      toast({
        title: 'Failed to remove collaborator',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  if (selectedTrip) {
    const liveTrip =
      trips.find((t) => t.id === selectedTrip.id) || selectedTrip;
    return (
      <TripCommandCenter
        trip={liveTrip}
        onBack={() => {
          setSelectedTrip(null);
          fetchTrips(); // Refresh trips when returning to main page
        }}
        onUpdateTrip={(updated) =>
          setTrips((prev) =>
            prev.map((t) => (t.id === updated.id ? updated : t)),
          )
        }
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => fetchTrips()}
          disabled={isLoading}
          title="Refresh trips"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
        <Button
          variant="accent"
          size="sm"
          onClick={() => navigate('/search?type=flights')}
        >
          <Plus className="w-3.5 h-3.5" />
          Search
        </Button>
      </Header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="mb-6">
            <h1 className="text-xl font-medium tracking-tight">Your Trips</h1>
            <p className="text-xs text-muted-foreground mt-1 font-mono">
              {isLoading ? 'Loading trips…' : `${trips.length} itineraries`}
            </p>
          </div>

          {/* Error state */}
          {fetchError && (
            <div className="border border-destructive/30 bg-destructive/5 rounded-sm px-4 py-3 mb-4">
              <p className="text-xs text-destructive font-mono">{fetchError}</p>
            </div>
          )}

          {/* Loading skeleton */}
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="border border-border rounded-sm p-4 space-y-3 animate-pulse min-h-[160px]"
                >
                  <div className="h-3 bg-secondary rounded-sm w-2/3" />
                  <div className="h-2 bg-secondary rounded-sm w-1/2" />
                  <div className="h-2 bg-secondary rounded-sm w-3/4" />
                </div>
              ))}
            </div>
          )}

          {!isLoading && trips.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16 space-y-3"
            >
              <Compass className="w-12 h-12 text-muted-foreground/40 mx-auto" />
              <p className="text-sm text-muted-foreground">
                You have no trips at the moment. The world is your oyster, go wild!
              </p>
              <Button variant="outline" size="sm" onClick={() => setNewTripOpen(true)}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Create Trip
              </Button>
            </motion.div>
          )}

          {!isLoading && trips.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {trips.map((trip) => (
                <div key={trip.id} className="relative group">
                  <TripCard trip={trip} onClick={setSelectedTrip} />
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-6 w-6 bg-card/90 backdrop-blur-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/search?type=flights');
                      }}
                      title="Search flights"
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-6 w-6 bg-card/90 backdrop-blur-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openCollabManager(trip.id);
                      }}
                      title="Manage collaborators"
                    >
                      <UserPlus className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}

              <motion.div
                whileHover={{ y: -2 }}
                className="border border-dashed border-border rounded-sm p-4 flex flex-col items-center justify-center gap-2 cursor-pointer node-interactive min-h-[160px]"
                onClick={() => setNewTripOpen(true)}
              >
                <Plus className="w-5 h-5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  Create Trip
                </span>
              </motion.div>
            </div>
          )}
        </motion.div>
      </main>

      {/* New Trip Dialog */}
      <Dialog
        open={newTripOpen}
        onOpenChange={(open) => {
          setNewTripOpen(open);
          if (!open) resetNewTripForm();
        }}
      >
        <DialogContent className="sm:max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-sm font-medium">
              Create New Trip
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* Trip name */}
            <div>
              <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block mb-1">
                Trip Name
              </label>
              <input
                value={tripName}
                onChange={(e) => setTripName(e.target.value)}
                placeholder="Tokyo Sprint"
                className="form-select-style"
              />
            </div>

            {/* Destination */}
            <div>
              <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block mb-1">
                <MapPinIcon className="w-3 h-3 inline mr-1" />
                Destination
              </label>
              <input
                value={tripDestination}
                onChange={(e) => setTripDestination(e.target.value)}
                placeholder="Tokyo, Japan"
                className="form-select-style"
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block mb-1">
                  <CalendarIcon className="w-3 h-3 inline mr-1" />
                  Start Date
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal h-8 text-xs bg-secondary border-border',
                        !tripStartDate && 'text-muted-foreground',
                      )}
                    >
                      {tripStartDate
                        ? format(tripStartDate, 'MMM d, yyyy')
                        : 'Pick date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={tripStartDate}
                      onSelect={setTripStartDate}
                      initialFocus
                      className={cn('p-3 pointer-events-auto')}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block mb-1">
                  <CalendarIcon className="w-3 h-3 inline mr-1" />
                  End Date
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal h-8 text-xs bg-secondary border-border',
                        !tripEndDate && 'text-muted-foreground',
                      )}
                    >
                      {tripEndDate
                        ? format(tripEndDate, 'MMM d, yyyy')
                        : 'Pick date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={tripEndDate}
                      onSelect={setTripEndDate}
                      disabled={(date) =>
                        tripStartDate ? date < tripStartDate : false
                      }
                      initialFocus
                      className={cn('p-3 pointer-events-auto')}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Budget */}
            <div>
              <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block mb-1">
                <DollarSign className="w-3 h-3 inline mr-1" />
                Budget
              </label>
              <input
                type="number"
                value={tripBudget}
                onChange={(e) => setTripBudget(e.target.value)}
                placeholder="5000"
                className="form-select-style"
              />
            </div>

            {/* Collaborators */}
            <div>
              <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block mb-2">
                <UserPlus className="w-3 h-3 inline mr-1" />
                Collaborators
              </label>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {isLoadingClients && (
                  <div className="text-xs text-muted-foreground py-2">
                    Loading collaborators...
                  </div>
                )}
                {clientsError && (
                  <div className="text-xs text-destructive py-2">
                    {clientsError}
                  </div>
                )}
                {!isLoadingClients &&
                  !clientsError &&
                  availableClients.length === 0 && (
                    <div className="text-xs text-muted-foreground py-2">
                      No collaborators available
                    </div>
                  )}
                {availableClients.map((client) => {
                  const collab = mapClientToCollaborator(client);
                  const isSelected = selectedCollaboratorIds.has(
                    client.client_uuid,
                  );
                  const isSelf = client.client_uuid === CURRENT_USER_ID;
                  return (
                    <button
                      key={client.client_uuid}
                      onClick={() => toggleTripCollab(client.client_uuid)}
                      disabled={isSelf}
                      className={cn(
                        'w-full flex items-center gap-2 py-1.5 px-2 rounded-sm transition-colors',
                        isSelected
                          ? 'bg-accent/10 border border-accent/30'
                          : 'hover:bg-secondary/50 border border-transparent',
                        isSelf && 'opacity-70 cursor-default',
                      )}
                    >
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium border-2 border-background shrink-0 text-white"
                        style={{ backgroundColor: collab.color }}
                      >
                        {collab.initials}
                      </div>
                      <div className="flex-1 text-left">
                        <span className="text-xs block">{client.name}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {client.email}
                        </span>
                      </div>
                      {isSelf && (
                        <span className="text-[10px] text-muted-foreground font-mono">
                          you
                        </span>
                      )}
                      {isSelected && !isSelf && (
                        <span className="w-4 h-4 rounded-full bg-accent flex items-center justify-center">
                          <Plus className="w-2.5 h-2.5 text-accent-foreground rotate-45" />
                        </span>
                      )}
                      {!isSelected && !isSelf && (
                        <UserPlus className="w-3 h-3 text-muted-foreground" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <Button
              variant="accent"
              size="sm"
              className="w-full"
              onClick={handleCreateTrip}
              disabled={
                !tripName ||
                !tripDestination ||
                !tripStartDate ||
                !tripEndDate ||
                isCreatingTrip
              }
            >
              <Plus className="w-3.5 h-3.5" />{' '}
              {isCreatingTrip ? 'Creating…' : 'Create Trip'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Collaborator Manager Dialog */}
      <Dialog open={collabOpen} onOpenChange={setCollabOpen}>
        <DialogContent className="sm:max-w-sm bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-sm font-medium">
              Manage Collaborators
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {/* Loading state */}
            {isLoadingClients && (
              <div className="text-xs text-muted-foreground py-2">
                Loading collaborators...
              </div>
            )}
            {clientsError && (
              <div className="text-xs text-destructive py-2">
                {clientsError}
              </div>
            )}

            {/* Current collaborators */}
            {!isLoadingClients && (
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  Current ({currentTripCollaborators.length})
                </span>
                <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                  {currentTripCollaborators.length === 0 ? (
                    <div className="text-xs text-muted-foreground py-2">
                      No collaborators yet
                    </div>
                  ) : (
                    currentTripCollaborators.map((c) => {
                      const isSelf = c.id === CURRENT_USER_ID;
                      const client = availableClients.find(
                        (cl) => cl.client_uuid === c.id,
                      );
                      return (
                        <div
                          key={c.id}
                          className="flex items-center justify-between py-1.5 px-2 rounded-sm bg-secondary/30"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium border-2 border-background shrink-0 text-white"
                              style={{ backgroundColor: c.color }}
                            >
                              {c.initials}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-xs block truncate">
                                {c.name}
                                {isSelf && (
                                  <span className="text-muted-foreground ml-1">
                                    (you)
                                  </span>
                                )}
                              </span>
                              {client && (
                                <span className="text-[10px] text-muted-foreground block truncate">
                                  {client.email}
                                </span>
                              )}
                            </div>
                          </div>
                          {!isSelf && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 text-muted-foreground hover:text-destructive shrink-0"
                              onClick={() => removeCollaborator(c.id)}
                            >
                              <UserMinus className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Available collaborators to add */}
            {!isLoadingClients && availableCollabs.length > 0 && (
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  Add ({availableCollabs.length})
                </span>
                <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                  {availableCollabs.map((c) => {
                    const client = availableClients.find(
                      (cl) => cl.client_uuid === c.id,
                    );
                    return (
                      <button
                        key={c.id}
                        onClick={() => addCollaborator(c)}
                        className="w-full flex items-center gap-2 py-1.5 px-2 rounded-sm hover:bg-secondary/50 transition-colors"
                      >
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium border-2 border-background shrink-0 text-white"
                          style={{ backgroundColor: c.color }}
                        >
                          {c.initials}
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <span className="text-xs block truncate">
                            {c.name}
                          </span>
                          {client && (
                            <span className="text-[10px] text-muted-foreground block truncate">
                              {client.email}
                            </span>
                          )}
                        </div>
                        <UserPlus className="w-3 h-3 text-muted-foreground shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {!isLoadingClients &&
              availableCollabs.length === 0 &&
              currentTripCollaborators.length > 0 && (
                <div className="text-xs text-muted-foreground py-2">
                  All available users have been added
                </div>
              )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
