export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

interface ApiOptions extends RequestInit {
  accessToken?: string | null;
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { accessToken, headers, body, ...rest } = options;
  const isFormData = body instanceof FormData;

  const res = await fetch(`/api${path}`, {
    ...rest,
    body,
    credentials: "include",
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const responseBody = isJson ? await res.json() : undefined;

  if (!res.ok) {
    const message = Array.isArray(responseBody?.message)
      ? responseBody.message.join("، ")
      : (responseBody?.message ?? "خطایی رخ داد.");
    throw new ApiError(message, res.status);
  }

  return responseBody as T;
}
