export type TestCategory =
  | 'functional'
  | 'navigation'
  | 'forms'
  | 'responsive'
  | 'visual'
  | 'accessibility'
  | 'seo'
  | 'performance'
  | 'security'
  | 'console'
  | 'network';

export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type TestStatus = 'passed' | 'failed' | 'skipped' | 'blocked';
export type RunStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface User {
  id: string;
  email: string;
  role: string;
  createdAt?: string;
}

export interface AuthResponse {
  token: string;
  userId: string;
  email: string;
  role: string;
}

export interface Project {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  targetUrl: string;
  configurationJson?: string;
  scheduleEnabled?: boolean;
  scheduleFrequency?: string;
  scheduleCron?: string;
  lastScheduledRunAt?: string | null;
  nextRunAt?: string | null;
  alertOnCritical?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectTrendPoint {
  runId: string;
  timestamp: string;
  triggerSource?: string;
  overallScore?: number | null;
  functionalScore?: number | null;
  responsiveScore?: number | null;
  accessibilityScore?: number | null;
  seoScore?: number | null;
  visualScore?: number | null;
  performanceScore?: number | null;
  securityScore?: number | null;
  criticalFindings: number;
  highFindings: number;
  mediumFindings: number;
  lowFindings: number;
  durationMs?: number | null;
}

export interface ProjectTrends {
  projectId: string;
  projectName: string;
  targetUrl: string;
  totalRuns: number;
  completedRuns: number;
  averageScore?: number | null;
  latestScore?: number | null;
  previousScore?: number | null;
  scoreDelta?: number | null;
  trendStatus: 'IMPROVING' | 'DEGRADING' | 'STABLE';
  healthGrade: string;
  scheduleEnabled?: boolean;
  scheduleFrequency?: string;
  scheduleCron?: string;
  nextRunAt?: string | null;
  lastScheduledRunAt?: string | null;
  history: ProjectTrendPoint[];
}

export interface TestRun {
  id: string;
  projectId: string;
  requestedBy: string;
  status: RunStatus;
  targetUrl: string;
  triggerSource?: 'MANUAL' | 'SCHEDULED' | 'CI_CD' | string;
  scoringVersion?: string;
  overallScore?: number | null;
  metricsJson?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  durationMs?: number | null;
  createdAt: string;
}


export interface QualityMetrics {
  overallScore: number;
  functionalScore: number;
  responsiveScore: number;
  accessibilityScore: number;
  seoScore: number;
  visualScore: number;
  performanceScore?: number;
  securityScore?: number;
  totalTests: number;
  passedCount: number;
  failedCount: number;
  skippedCount: number;
  blockedCount: number;
  criticalFindings: number;
  highFindings: number;
  mediumFindings: number;
  lowFindings: number;
  scoringVersion?: string;
  performanceData?: {
    ttfbMs?: number;
    fcpMs?: number;
    lcpMs?: number;
    cls?: number;
    domContentLoadedMs?: number;
    loadTimeMs?: number;
    totalResources?: number;
    totalBytesTransferred?: number;
    renderBlockingCount?: number;
  };
  securityData?: {
    isHttps?: boolean;
    missingHeaders?: string[];
    presentHeaders?: string[];
    insecureCookies?: number;
    mixedContentCount?: number;
    exposedSecretsFound?: number;
  };
}

export interface DiscoveredPage {
  id: string;
  testRunId: string;
  url: string;
  title?: string;
  discoveryStatus?: string;
  createdAt?: string;
}

export interface TestResult {
  id: string;
  testRunId: string;
  name: string;
  category: string;
  url?: string;
  status: string;
  durationMs?: number;
  expectedOutcome?: string;
  actualOutcome?: string;
  errorSummary?: string;
  createdAt?: string;
}

export interface Finding {
  id: string;
  testRunId: string;
  title: string;
  category: string;
  severity: FindingSeverity;
  affectedUrl: string;
  description?: string;
  reproductionStepsJson?: string;
  expectedResult?: string;
  actualResult?: string;
  suggestedFix?: string;
  confidence?: number;
  verificationStatus?: 'verified' | 'suspected' | 'in_progress' | 'resolved' | 'ignored';
  remediationStatus?: 'OPEN' | 'IN_PROGRESS' | 'FIXED' | 'ACCEPTED' | 'FALSE_POSITIVE' | string;
  detectionMethod?: string;
  technicalExplanation?: string;
  verificationProcedure?: string;
  evidenceJson?: string;
  aiEnhanced?: boolean;
  createdAt?: string;
}

export interface ExecutionEvent {
  id?: string;
  runId?: string;
  sequenceNumber?: number;
  eventType: 'STATE_CHANGE' | 'STEP_START' | 'STEP_SUCCESS' | 'STEP_FAILURE' | 'LOG' | 'SCREENSHOT' | 'COMPLETE';
  step?: string;
  message: string;
  payloadJson?: string;
  timestamp?: string;
  createdAt?: string;
}

export interface SystemHealth {
  backend: string;
  version: string;
  service: string;
  worker: string;
  ai: string;
}

export interface AiSettings {
  available: boolean;
  configuredModel: string;
  availableModels: string[];
}
