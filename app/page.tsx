import UrlForm from "@/components/UrlForm";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="flex w-full max-w-xl flex-col items-center gap-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">
            llm.txt Generator
          </h1>
          <p className="mt-3 text-lg text-gray-500">
            Enter a website URL to generate an{" "}
            <code className="rounded bg-gray-100 px-1 py-0.5 text-sm font-mono text-gray-700">
              llm.txt
            </code>{" "}
            file for LLM consumption.
          </p>
        </div>

        <UrlForm />
      </div>
    </main>
  );
}
