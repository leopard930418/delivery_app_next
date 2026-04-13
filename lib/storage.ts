import { promises as fs } from "fs";
import path from "path";
import type { Delivery } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "deliveries.json");

async function ensureDataFile(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(FILE);
  } catch {
    await fs.writeFile(FILE, "[]", "utf-8");
  }
}

export async function readDeliveries(): Promise<Delivery[]> {
  await ensureDataFile();
  const raw = await fs.readFile(FILE, "utf-8");
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) return [];
  return parsed as Delivery[];
}

export async function writeDeliveries(items: Delivery[]): Promise<void> {
  await ensureDataFile();
  await fs.writeFile(FILE, JSON.stringify(items, null, 2), "utf-8");
}
