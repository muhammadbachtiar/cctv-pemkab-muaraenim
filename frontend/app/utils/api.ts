const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

interface RequestOptions extends RequestInit {
  bodyData?: any;
  /** Jika true, respons 401 tidak akan memicu logout global (digunakan untuk endpoint login) */
  skipAuthInterceptor?: boolean;
}

let onUnauthorizedCallback: (() => void) | null = null;

export const setOnUnauthorized = (callback: () => void) => {
  onUnauthorizedCallback = callback;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (options.bodyData) {
    headers.set("Content-Type", "application/json");
    options.body = JSON.stringify(options.bodyData);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Jika endpoint ini tidak memerlukan interceptor auth (misal: login)
    // biarkan error diproses normal agar pesan dari server diteruskan
    if (!options.skipAuthInterceptor) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("cctv_user");
        localStorage.removeItem("cctv_permissions");
        localStorage.removeItem("cctv_role");

        if (onUnauthorizedCallback) {
          onUnauthorizedCallback();
        } else {
          // Fallback if context callback is not registered yet
          const publicPaths = ["/login", "/public", "/publik", "/"];
          const isPublicPath = publicPaths.includes(window.location.pathname);
          if (!isPublicPath) {
            window.location.href = "/login";
          }
        }
      }
      throw new Error("Sesi login berakhir. Silakan masuk kembali.");
    }
    // Jika skipAuthInterceptor, biarkan blok !response.ok di bawah menangani error-nya
  }

  if (!response.ok) {
    let errorMessage = "Terjadi kesalahan pada server";
    try {
      const errData = await response.json();
      errorMessage = errData.message || errorMessage;
    } catch {
      // Abaikan jika bukan JSON
    }
    throw new Error(errorMessage);
  }

  // Jika response tidak memiliki content (misal 204 No Content)
  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "GET" }),

  post: <T>(path: string, bodyData?: any, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", bodyData }),

  put: <T>(path: string, bodyData?: any, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PUT", bodyData }),

  patch: <T>(path: string, bodyData?: any, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PATCH", bodyData }),

  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "DELETE" }),
};
