import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  ACCESS_TOKEN_KEY,
  ApiError,
  authenticatedRequest,
  fetchCurrentUser,
  registerAccount,
} from "../src/api/auth.js";

const originalFetch = globalThis.fetch;
const originalSessionStorage = globalThis.sessionStorage;
const originalWindow = globalThis.window;

function installBrowserStorage(token = "test-access-token") {
  const values = new Map([[ACCESS_TOKEN_KEY, token]]);
  const events = [];
  globalThis.sessionStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  globalThis.window = {
    dispatchEvent: (event) => events.push(event.type),
  };
  return { events, values };
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalSessionStorage === undefined) {
    delete globalThis.sessionStorage;
  } else {
    globalThis.sessionStorage = originalSessionStorage;
  }
  if (originalWindow === undefined) {
    delete globalThis.window;
  } else {
    globalThis.window = originalWindow;
  }
});

test("registration sends the FastAPI request fields and endpoint", async () => {
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return jsonResponse({ id: "user-id", name: "Taylor", email: "taylor@example.com" }, 201);
  };

  await registerAccount({
    name: "Taylor",
    email: "taylor@example.com",
    password: "a-secure-test-password",
  });

  assert.equal(request.url, "http://127.0.0.1:8000/api/auth/register");
  assert.equal(request.options.method, "POST");
  assert.deepEqual(JSON.parse(request.options.body), {
    name: "Taylor",
    email: "taylor@example.com",
    password: "a-secure-test-password",
  });
});

test("duplicate session checks share one authenticated fetch", async () => {
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });
    await new Promise((resolve) => setTimeout(resolve, 10));
    return jsonResponse({ id: "user-id", name: "Taylor", email: "taylor@example.com" });
  };

  const [first, second] = await Promise.all([
    fetchCurrentUser("test-access-token"),
    fetchCurrentUser("test-access-token"),
  ]);

  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, "http://127.0.0.1:8000/api/auth/me");
  assert.equal(requests[0].options.headers.get("Authorization"), "Bearer test-access-token");
  assert.deepEqual(first, second);
});

test("FastAPI salary-range validation maps to both salary fields", async () => {
  installBrowserStorage();
  globalThis.fetch = async () =>
    jsonResponse(
      {
        error: {
          code: "validation_error",
          message: "Request validation failed",
          details: [
            {
              location: ["body"],
              message: "Value error, salary_min must not exceed salary_max",
              type: "value_error",
            },
          ],
        },
      },
      422,
    );

  let error;
  try {
    await authenticatedRequest("/api/applications", { method: "POST" });
  } catch (requestError) {
    error = requestError;
  }

  assert.ok(error instanceof ApiError);
  assert.equal(error.status, 422);
  assert.deepEqual(error.fieldErrors, {
    salary_min: "Minimum salary cannot exceed maximum salary.",
    salary_max: "Maximum salary must be at least the minimum.",
  });
});

test("FastAPI HTTP errors preserve safe messages and 401 expires the session", async () => {
  const { events } = installBrowserStorage();
  globalThis.fetch = async () =>
    jsonResponse(
      { error: { code: "http_error", message: "Application not found" } },
      404,
    );

  await assert.rejects(
    authenticatedRequest("/api/applications/missing"),
    { name: "ApiError", status: 404, message: "Application not found" },
  );

  globalThis.fetch = async () =>
    jsonResponse(
      { error: { code: "http_error", message: "Invalid or expired access token" } },
      401,
    );
  await assert.rejects(
    authenticatedRequest("/api/applications"),
    { name: "ApiError", status: 401 },
  );
  assert.deepEqual(events, ["jobtrack:auth-expired"]);
});

test("FastAPI 400, 403, 404, and 500 error messages are surfaced", async (t) => {
  for (const status of [400, 403, 404, 500]) {
    await t.test(`HTTP ${status}`, async () => {
      installBrowserStorage();
      globalThis.fetch = async () =>
        jsonResponse(
          {
            error: {
              code: "http_error",
              message: `Safe server message for ${status}`,
            },
          },
          status,
        );

      await assert.rejects(
        authenticatedRequest(`/api/test-error/${status}`),
        {
          name: "ApiError",
          status,
          message: `Safe server message for ${status}`,
        },
      );
    });
  }
});
