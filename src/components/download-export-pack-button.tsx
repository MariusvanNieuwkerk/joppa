"use client";

import { useState } from "react";

import { getCompany, getJob, getLatestContent } from "@/lib/demo-db";
import { channels, makeSafeFilename } from "@/lib/export-pack";

async function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function DownloadExportPackButton({
  jobId,
  className,
}: {
  jobId: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);

  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const JSZip = (await import("jszip")).default;
          const zip = new JSZip();

          const job = getJob(jobId);
          const company = getCompany();
          const title = job?.title ?? "vacature";
          const base = makeSafeFilename(`${company?.name ?? "bedrijf"}-${title}`);

          zip.file(
            "LEESMIJ.txt",
            [
              "Joppa export pakket",
              "",
              "Inhoud:",
              "- /teksten: kant-en-klare teksten per kanaal",
              "- /beelden: visuals in 1:1, 4:5 en 9:16",
              "",
              "Tip: begin met LinkedIn of Instagram. Kopieer de tekst en upload het bijpassende beeld.",
            ].join("\n")
          );

          // Texts
          const texts = zip.folder("teksten");
          for (const c of channels) {
            const content = getLatestContent(jobId, c.id);
            const body = (content?.content?.body as string) ?? "";
            const headline = (content?.content?.headline as string) ?? title;
            const text = [headline, "", body].filter(Boolean).join("\n");
            texts?.file(`${c.filename}.txt`, text || `${title}\n`);
          }

          // Images (SVGs from our endpoint, no extra deps)
          const images = zip.folder("beelden");
          const ratios: Array<{ q: string; name: string }> = [
            { q: "1x1", name: "1x1" },
            { q: "4x5", name: "4x5" },
            { q: "9x16", name: "9x16" },
          ];

          for (const r of ratios) {
            const url = `/api/assets/job/${jobId}.svg?ratio=${r.q}&template=bold`;
            const res = await fetch(url);
            const svg = await res.text();
            images?.file(`${base}-${r.name}.svg`, svg);
          }

          zip.file(
            "links.txt",
            [
              "Links",
              "",
              `Indeed: /api/indeed/feed.xml`,
              `Export info: /api/export/${jobId}`,
              "",
              "Public pagina: (via cockpit → ‘Preview public page’)",
            ].join("\n")
          );

          const blob = await zip.generateAsync({ type: "blob" });
          await downloadBlob(`${base}-pakket.zip`, blob);
        } finally {
          setBusy(false);
        }
      }}
      className={className}
    >
      {busy ? "Pakket maken…" : "Download pakket"}
    </button>
  );
}

