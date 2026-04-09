export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center space-y-2">
        <p className="text-4xl font-bold text-slate-50">404</p>
        <p className="text-slate-400">Page not found.</p>
      </div>
    </main>
  );
}
