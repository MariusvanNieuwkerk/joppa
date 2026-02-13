import type { Company, DemoDb, Job, JobContent, GenerationRun } from "@/lib/types";
import { newId } from "@/lib/ids";
import { slugify } from "@/lib/slug";

const STORAGE_KEY = "joppa.demoDb.v1";

function nowIso() {
  return new Date().toISOString();
}

export function loadDemoDb(): DemoDb {
  if (typeof window === "undefined") {
    return { jobs: [], contents: [], runs: [] };
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return { jobs: [], contents: [], runs: [] };
  try {
    const parsed = JSON.parse(raw) as DemoDb;
    return {
      company: parsed.company,
      jobs: parsed.jobs ?? [],
      contents: parsed.contents ?? [],
      runs: parsed.runs ?? [],
    };
  } catch {
    return { jobs: [], contents: [], runs: [] };
  }
}

export function saveDemoDb(db: DemoDb) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

export function upsertCompany(input: Omit<Company, "id" | "slug" | "createdAt">) {
  const db = loadDemoDb();
  const existing = db.company;
  const company: Company = {
    id: existing?.id ?? newId("comp"),
    slug: slugify(input.name || "company"),
    createdAt: existing?.createdAt ?? nowIso(),
    ...existing,
    ...input,
  };
  db.company = company;
  saveDemoDb(db);
  return company;
}

export function createJob(input: { rawIntent: string }) {
  const db = loadDemoDb();
  const companyId = db.company?.id ?? newId("comp");
  if (!db.company) {
    db.company = {
      id: companyId,
      name: "My Company",
      slug: "my-company",
      createdAt: nowIso(),
    };
  }

  const id = newId("job");
  const createdAt = nowIso();
  const job: Job = {
    id,
    companyId,
    status: "draft",
    rawIntent: input.rawIntent,
    createdAt,
    updatedAt: createdAt,
    jobSlug: slugify(`job-${id.slice(-6)}`),
  };
  db.jobs.unshift(job);
  saveDemoDb(db);
  return job;
}

export function updateJob(jobId: string, patch: Partial<Job>) {
  const db = loadDemoDb();
  const idx = db.jobs.findIndex((j) => j.id === jobId);
  if (idx === -1) return null;
  db.jobs[idx] = { ...db.jobs[idx], ...patch, updatedAt: nowIso() };
  saveDemoDb(db);
  return db.jobs[idx];
}

export function getJob(jobId: string) {
  const db = loadDemoDb();
  return db.jobs.find((j) => j.id === jobId) ?? null;
}

export function getCompany() {
  const db = loadDemoDb();
  return db.company ?? null;
}

export function listJobs() {
  const db = loadDemoDb();
  return db.jobs;
}

export function deleteJob(jobId: string) {
  const db = loadDemoDb();
  const before = db.jobs.length;
  db.jobs = db.jobs.filter((j) => j.id !== jobId);
  db.contents = (db.contents ?? []).filter((c) => c.jobId !== jobId);
  db.runs = (db.runs ?? []).filter((r) => r.jobId !== jobId);
  saveDemoDb(db);
  return db.jobs.length !== before;
}

export function createRun(input: Omit<GenerationRun, "id" | "createdAt" | "updatedAt">) {
  const db = loadDemoDb();
  const run: GenerationRun = {
    id: newId("run"),
    createdAt: nowIso(),
    updatedAt: nowIso(),
    ...input,
  };
  db.runs.unshift(run);
  saveDemoDb(db);
  return run;
}

export function updateRun(runId: string, patch: Partial<GenerationRun>) {
  const db = loadDemoDb();
  const idx = db.runs.findIndex((r) => r.id === runId);
  if (idx === -1) return null;
  db.runs[idx] = { ...db.runs[idx], ...patch, updatedAt: nowIso() };
  saveDemoDb(db);
  return db.runs[idx];
}

export function listRuns(jobId: string) {
  const db = loadDemoDb();
  return db.runs.filter((r) => r.jobId === jobId);
}

export function upsertContent(input: Omit<JobContent, "id" | "createdAt"> & { id?: string }) {
  const db = loadDemoDb();
  const createdAt = nowIso();
  const item: JobContent = {
    id: input.id ?? newId("content"),
    createdAt,
    ...input,
  };
  const idx = db.contents.findIndex(
    (c) =>
      c.jobId === item.jobId &&
      c.channel === item.channel &&
      c.version === item.version
  );
  if (idx === -1) db.contents.push(item);
  else db.contents[idx] = { ...db.contents[idx], ...item };
  saveDemoDb(db);
  return item;
}

export function getLatestContent(jobId: string, channel: JobContent["channel"]) {
  const db = loadDemoDb();
  const list = db.contents
    .filter((c) => c.jobId === jobId && c.channel === channel)
    .sort((a, b) => b.version - a.version);
  return list[0] ?? null;
}

export function listContents(jobId: string) {
  const db = loadDemoDb();
  return db.contents.filter((c) => c.jobId === jobId).sort((a, b) => {
    if (a.channel === b.channel) return b.version - a.version;
    return a.channel.localeCompare(b.channel);
  });
}

