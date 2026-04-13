import { NextResponse } from "next/server";
import { readDeliveries, writeDeliveries } from "@/lib/storage";
import type { Delivery, DeliveryStatus } from "@/lib/types";

function isStatus(v: unknown): v is DeliveryStatus {
  return (
    v === "pending" ||
    v === "scheduled" ||
    v === "picked_up" ||
    v === "in_transit" ||
    v === "delivered" ||
    v === "cancelled"
  );
}

type Ctx = { params: { id: string } };

export async function GET(_request: Request, context: Ctx) {
  const { id } = context.params;
  const all = await readDeliveries();
  const item = all.find((d) => d.id === id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function PATCH(request: Request, context: Ctx) {
  const { id } = context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const all = await readDeliveries();
  const idx = all.findIndex((d) => d.id === id);
  if (idx === -1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const cur = all[idx];
  const next: Delivery = {
    ...cur,
    updatedAt: new Date().toISOString(),
  };

  if (typeof b.customerName === "string") {
    const v = b.customerName.trim();
    if (v) next.customerName = v;
  }
  if (typeof b.pickupAddress === "string") {
    const v = b.pickupAddress.trim();
    if (v) next.pickupAddress = v;
  }
  if (typeof b.dropoffAddress === "string") {
    const v = b.dropoffAddress.trim();
    if (v) next.dropoffAddress = v;
  }
  if (typeof b.notes === "string") next.notes = b.notes.trim();
  if ("scheduledAt" in b) {
    next.scheduledAt =
      typeof b.scheduledAt === "string" && b.scheduledAt
        ? b.scheduledAt
        : null;
  }
  if ("status" in b && isStatus(b.status)) next.status = b.status;

  if (!next.customerName || !next.pickupAddress || !next.dropoffAddress) {
    return NextResponse.json(
      { error: "customerName, pickupAddress, and dropoffAddress are required" },
      { status: 400 }
    );
  }

  all[idx] = next;
  await writeDeliveries(all);
  return NextResponse.json(next);
}

export async function DELETE(_request: Request, context: Ctx) {
  const { id } = context.params;
  const all = await readDeliveries();
  const filtered = all.filter((d) => d.id !== id);
  if (filtered.length === all.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await writeDeliveries(filtered);
  return new NextResponse(null, { status: 204 });
}
