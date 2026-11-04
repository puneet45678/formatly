import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-xl font-semibold">Not a format we know</h1>
      <p className="text-sm text-muted">The page you opened doesn&apos;t exist.</p>
      <Link href="/json" className="rounded-md border border-line px-3 py-1.5 text-sm hover:bg-[#1c1c1c]">
        Go to the JSON formatter
      </Link>
    </main>
  );
}
