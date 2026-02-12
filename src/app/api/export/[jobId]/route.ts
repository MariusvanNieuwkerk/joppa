import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  context: { params: Promise<{}> }
) {
  // v1 stub: later zip (images + captions + tracking links).
  const url = new URL(req.url);
  const { jobId } = (await context.params) as { jobId: string };
  const payload = {
    jobId,
    message:
      "Export pack stub. Later: zip met assets (1:1/4:5/9:16) + captions per kanaal + tracking links.",
    assets: [
      `${url.origin}/api/assets/job/${jobId}.svg?ratio=1x1&template=bold`,
      `${url.origin}/api/assets/job/${jobId}.svg?ratio=4x5&template=bold`,
      `${url.origin}/api/assets/job/${jobId}.svg?ratio=9x16&template=bold`,
    ],
    indeedFeed: `${url.origin}/api/indeed/feed.xml`,
  };

  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
}

