"use client";

import { useState } from "react";
import { validateUrl } from "@/lib/url-validator";

export default function UrlForm() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [apiError, setApiError] = useState<string | null>(null);

  function handleBlur() {
    if (!url) {
      setError(null);
      return;
    }

    const result = validateUrl(url);
    setError(result.success ? null : result.error);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const result = validateUrl(url);

    if (!result.success) {
      setError(result.error);

      return;
    }

    setError(null);
    setApiError(null);
    setStatus("loading");

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));

        setApiError(
          (data as { error?: string }).error ?? "Something went wrong",
        );
        setStatus("error");

        return;
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = "llm.txt";
      anchor.click();
      URL.revokeObjectURL(objectUrl);
      setStatus("success");
    } catch {
      setApiError("Network error — could not connect to server");
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl space-y-4">
      <div className="flex flex-col gap-1">
        <label
          htmlFor="url-input"
          className="text-sm font-medium text-gray-700"
        >
          Website URL
        </label>
        <input
          id="url-input"
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onBlur={handleBlur}
          placeholder="https://example.com"
          className={`w-full rounded-lg border px-4 py-3 text-base text-gray-900 outline-none transition focus:ring-2 ${
            error
              ? "border-red-400 focus:ring-red-300"
              : "border-gray-300 focus:ring-indigo-400"
          }`}
          disabled={status === "loading"}
          aria-describedby={error ? "url-error" : undefined}
        />
        {error && (
          <p id="url-error" className="text-sm text-red-600">
            {error}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full rounded-lg bg-indigo-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
      >
        {status === "loading" ? "Generating…" : "Generate llm.txt"}
      </button>

      {status === "success" && (
        <p className="text-center text-sm text-green-600">
          llm.txt downloaded successfully!
        </p>
      )}

      {status === "error" && apiError && (
        <p className="text-center text-sm text-red-600">{apiError}</p>
      )}
    </form>
  );
}
