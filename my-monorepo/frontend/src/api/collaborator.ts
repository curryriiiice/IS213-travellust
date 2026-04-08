/**
 * API client for fetching collaborators from external ClientService.
 */

export interface ExternalClient {
  Id: number;
  client_uuid: string;
  name: string;
  email: string;
  phone: number;
}

const CLIENTS_API_URL =
  'https://personal-pnwxkauk.outsystemscloud.com/ClientService/rest/Clients/GetAllClients';

/**
 * Fetch all clients from the external ClientService API.
 * These can be added as collaborators to a trip.
 */
export async function fetchAllClients(): Promise<ExternalClient[]> {
  const response = await fetch(CLIENTS_API_URL);

  if (!response.ok) {
    throw new Error(`Failed to fetch clients: ${response.status}`);
  }

  return response.json();
}
