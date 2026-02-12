import type { Channel } from "@/lib/types";

export const channels: Array<{ id: Channel; label: string; filename: string }> = [
  { id: "website", label: "Website", filename: "website" },
  { id: "indeed", label: "Indeed", filename: "indeed" },
  { id: "linkedin", label: "LinkedIn", filename: "linkedin" },
  { id: "instagram", label: "Instagram", filename: "instagram" },
  { id: "facebook", label: "Facebook", filename: "facebook" },
  { id: "tiktok", label: "TikTok", filename: "tiktok" },
];

export function makeSafeFilename(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 60);
}

