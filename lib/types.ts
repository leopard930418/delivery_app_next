export type DeliveryStatus =
  | "pending"
  | "scheduled"
  | "picked_up"
  | "in_transit"
  | "delivered"
  | "cancelled";

export interface Delivery {
  id: string;
  customerName: string;
  pickupAddress: string;
  dropoffAddress: string;
  status: DeliveryStatus;
  scheduledAt: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  pending: "Pending",
  scheduled: "Scheduled",
  picked_up: "Picked up",
  in_transit: "In transit",
  delivered: "Delivered",
  cancelled: "Cancelled",
};
