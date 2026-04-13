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

export async function GET() {
  const list = await readDeliveries();
  list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return NextResponse.json(list);
}

export async function POST(request: Request) {
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
  const customerName =
    typeof b.customerName === "string" ? b.customerName.trim() : "";
  const pickupAddress =
    typeof b.pickupAddress === "string" ? b.pickupAddress.trim() : "";
  const dropoffAddress =
    typeof b.dropoffAddress === "string" ? b.dropoffAddress.trim() : "";
  const notes = typeof b.notes === "string" ? b.notes.trim() : "";
  const scheduledAt =
    typeof b.scheduledAt === "string" && b.scheduledAt
      ? b.scheduledAt
      : null;
  const status = isStatus(b.status) ? b.status : "pending";

  if (!customerName || !pickupAddress || !dropoffAddress) {
    return NextResponse.json(
      {
        error: "customerName, pickupAddress, and dropoffAddress are required",
      },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const item: Delivery = {
    id: crypto.randomUUID(),
    customerName,
    pickupAddress,
    dropoffAddress,
    status,
    scheduledAt,
    notes,
    createdAt: now,
    updatedAt: now,
  };

  const all = await readDeliveries();
  all.push(item);
  await writeDeliveries(all);

  return NextResponse.json(item, { status: 201 });
}
