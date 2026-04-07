// Bills manager — add/edit/delete recurring bills
export default function BillsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Bills</h1>
        <button className="rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-medium hover:bg-sky-500">
          + Add Bill
        </button>
      </div>

      {/* TODO: Replace with real bill list from /api/bills */}
      <p className="text-slate-500 text-sm">No bills added yet.</p>
    </div>
  );
}
