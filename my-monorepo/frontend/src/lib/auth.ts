export type StoredUser = {
  email: string;
  name: string;
  id: string;
};

export type LoginApiResponse = {
  success: boolean;
  message: string;
  client_uuid: string;
  name: string;
};

const LOGIN_URL =
  "https://personal-pnwxkauk.outsystemscloud.com/ClientService/rest/Clients/login";

export function getToken() {
  return localStorage.getItem("token");
}

export function getUser(): StoredUser | null {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
}

export function getCurrentUserId(): string {
  return getUser()?.id ?? "";
}

export function isAuthenticated() {
  return !!getToken();
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export async function login(
  email: string,
  password: string
): Promise<LoginApiResponse> {
  const response = await fetch(LOGIN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  if (!response.ok) {
    throw new Error(`Login request failed: ${response.status}`);
  }

  const data: LoginApiResponse = await response.json();

  if (data.success) {
    localStorage.setItem("token", data.client_uuid);
    localStorage.setItem(
      "user",
      JSON.stringify({
        email,
        name: data.name,
        id: data.client_uuid,
      })
    );
  }

  return data;
}