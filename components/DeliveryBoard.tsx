"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DELIVERY_STATUS_LABELS,
  type Delivery,
  type DeliveryStatus,
} from "@/lib/types";

const STATUSES = Object.keys(DELIVERY_STATUS_LABELS) as DeliveryStatus[];

function statusPillClass(status: DeliveryStatus): string {
  const base =
    "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset";
  switch (status) {
    case "delivered":
      return `${base} bg-emerald-500/15 text-emerald-300 ring-emerald-500/30`;
    case "cancelled":
      return `${base} bg-zinc-500/20 text-zinc-400 ring-zinc-500/40`;
    case "in_transit":
      return `${base} bg-sky-500/15 text-sky-300 ring-sky-500/35`;
    case "picked_up":
      return `${base} bg-violet-500/15 text-violet-300 ring-violet-500/35`;
    case "scheduled":
      return `${base} bg-amber-500/15 text-amber-200 ring-amber-500/35`;
    default:
      return `${base} bg-zinc-600/30 text-zinc-300 ring-zinc-500/40`;
  }
}

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type FormState = {
  customerName: string;
  pickupAddress: string;
  dropoffAddress: string;
  status: DeliveryStatus;
  scheduledAt: string;
  notes: string;
};

const emptyForm = (): FormState => ({
  customerName: "",
  pickupAddress: "",
  dropoffAddress: "",
  status: "pending",
  scheduledAt: "",
  notes: "",
});

export default function DeliveryBoard() {
  const [items, setItems] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<DeliveryStatus | "all">("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/deliveries", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load deliveries");
      const data = (await res.json()) as Delivery[];
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((d) => d.status === filter);
  }, [items, filter]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setFormOpen(true);
  }

  function openEdit(d: Delivery) {
    setEditingId(d.id);
    setForm({
      customerName: d.customerName,
      pickupAddress: d.pickupAddress,
      dropoffAddress: d.dropoffAddress,
      status: d.status,
      scheduledAt: d.scheduledAt ? toDatetimeLocalValue(d.scheduledAt) : "",
      notes: d.notes,
    });
    setFormOpen(true);
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        customerName: form.customerName,
        pickupAddress: form.pickupAddress,
        dropoffAddress: form.dropoffAddress,
        status: form.status,
        notes: form.notes,
        scheduledAt: form.scheduledAt
          ? new Date(form.scheduledAt).toISOString()
          : null,
      };

      if (editingId) {
        const res = await fetch(`/api/deliveries/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const j = (await res.json()) as { error?: string };
          throw new Error(j.error ?? "Update failed");
        }
      } else {
        const res = await fetch("/api/deliveries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const j = (await res.json()) as { error?: string };
          throw new Error(j.error ?? "Create failed");
        }
      }

      setFormOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this delivery?")) return;
    setError(null);
    try {
      const res = await fetch(`/api/deliveries/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  async function quickStatus(id: string, status: DeliveryStatus) {
    setError(null);
    try {
      const res = await fetch(`/api/deliveries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Update failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Delivery management
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Create deliveries, track status from pending through delivered.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
        >
          New delivery
        </button>
      </header>

      {error && (
        <div
          className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Filter
        </span>
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`rounded-md px-3 py-1.5 text-sm ${
            filter === "all"
              ? "bg-zinc-700 text-white"
              : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
          }`}
        >
          All ({items.length})
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`rounded-md px-3 py-1.5 text-sm ${
              filter === s
                ? "bg-zinc-700 text-white"
                : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
            }`}
          >
            {DELIVERY_STATUS_LABELS[s]} (
            {items.filter((i) => i.status === s).length})
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-zinc-500">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
          <p className="text-zinc-400">
            {items.length === 0
              ? "No deliveries yet. Create one to get started."
              : "No deliveries match this filter."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40 shadow-xl shadow-black/20">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/80 text-xs uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Route</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Scheduled</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {filtered.map((d) => (
                <tr key={d.id} className="hover:bg-zinc-800/30">
                  <td className="px-4 py-3 font-medium text-zinc-100">
                    {d.customerName}
                  </td>
                  <td className="max-w-xs px-4 py-3 text-zinc-400">
                    <div className="truncate" title={d.pickupAddress}>
                      <span className="text-zinc-500">From:</span>{" "}
                      {d.pickupAddress}
                    </div>
                    <div className="truncate" title={d.dropoffAddress}>
                      <span className="text-zinc-500">To:</span>{" "}
                      {d.dropoffAddress}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={statusPillClass(d.status)}>
                      {DELIVERY_STATUS_LABELS[d.status]}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-400">
                    {formatWhen(d.scheduledAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <select
                        aria-label={`Status for ${d.customerName}`}
                        value={d.status}
                        onChange={(e) =>
                          quickStatus(d.id, e.target.value as DeliveryStatus)
                        }
                        className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {DELIVERY_STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => openEdit(d)}
                        className="rounded-md border border-zinc-600 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-800"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(d.id)}
                        className="rounded-md border border-red-900/50 px-2 py-1 text-xs text-red-300 hover:bg-red-950/50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delivery-form-title"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
            <h2
              id="delivery-form-title"
              className="text-lg font-semibold text-white"
            >
              {editingId ? "Edit delivery" : "New delivery"}
            </h2>
            <form onSubmit={submitForm} className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="customerName"
                  className="block text-xs font-medium text-zinc-400"
                >
                  Customer name
                </label>
                <input
                  id="customerName"
                  required
                  value={form.customerName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, customerName: e.target.value }))
                  }
                  className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g. Acme Corp"
                />
              </div>
              <div>
                <label
                  htmlFor="pickupAddress"
                  className="block text-xs font-medium text-zinc-400"
                >
                  Pickup address
                </label>
                <textarea
                  id="pickupAddress"
                  required
                  rows={2}
                  value={form.pickupAddress}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, pickupAddress: e.target.value }))
                  }
                  className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label
                  htmlFor="dropoffAddress"
                  className="block text-xs font-medium text-zinc-400"
                >
                  Dropoff address
                </label>
                <textarea
                  id="dropoffAddress"
                  required
                  rows={2}
                  value={form.dropoffAddress}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, dropoffAddress: e.target.value }))
                  }
                  className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="status"
                    className="block text-xs font-medium text-zinc-400"
                  >
                    Status
                  </label>
                  <select
                    id="status"
                    value={form.status}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        status: e.target.value as DeliveryStatus,
                      }))
                    }
                    className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {DELIVERY_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="scheduledAt"
                    className="block text-xs font-medium text-zinc-400"
                  >
                    Scheduled (optional)
                  </label>
                  <input
                    id="scheduledAt"
                    type="datetime-local"
                    value={form.scheduledAt}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, scheduledAt: e.target.value }))
                    }
                    className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="notes"
                  className="block text-xs font-medium text-zinc-400"
                >
                  Notes
                </label>
                <textarea
                  id="notes"
                  rows={2}
                  value={form.notes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Internal notes"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  {saving ? "Saving…" : editingId ? "Save changes" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
