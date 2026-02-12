export type Company = {
  id: string;
  name: string;
  slug: string;
  website?: string;
  brandPrimaryColor?: string;
  brandTone?: string;
  brandPitch?: string;
  createdAt: string;
};

export type JobStatus = "draft" | "published" | "archived";

export type Job = {
  id: string;
  companyId: string;
  status: JobStatus;
  rawIntent: string;
  title?: string;
  location?: string;
  seniority?: string;
  employmentType?: string;
  extractedData?: Record<string, unknown>;
  jobSlug: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type Channel =
  | "website"
  | "indeed"
  | "instagram"
  | "facebook"
  | "tiktok"
  | "linkedin";

export type JobContentState = "draft" | "approved" | "published";

export type JobContent = {
  id: string;
  jobId: string;
  channel: Channel;
  version: number;
  state: JobContentState;
  content: Record<string, unknown>;
  createdAt: string;
};

export type GenerationStep = "extract" | "copy" | "assets";
export type GenerationRunStatus = "queued" | "running" | "succeeded" | "failed";

export type GenerationRun = {
  id: string;
  jobId: string;
  step: GenerationStep;
  status: GenerationRunStatus;
  model?: string;
  prompt?: string;
  error?: string;
  costUsd?: number;
  createdAt: string;
  updatedAt: string;
};

export type DemoDb = {
  company?: Company;
  jobs: Job[];
  contents: JobContent[];
  runs: GenerationRun[];
};

