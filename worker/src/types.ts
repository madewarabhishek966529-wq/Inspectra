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


export type TestStatus = 'passed' | 'failed' | 'skipped' | 'blocked';
export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface ViewportPreset {
  name: string;
  width: number;
  height: number;
}

export interface RunConfig {
  runId: string;
  projectId: string;
  targetUrl: string;
  categories: TestCategory[];
  viewports: ViewportPreset[];
  maxPages: number;
  maxExecutionTimeMs: number;
  allowPrivateIps?: boolean; // Only for local test fixture testing
  baselineScreenshotDir?: string;
  artifactsDir?: string;
}

export interface DiscoveredPage {
  url: string;
  title: string;
  links: string[];
  formsCount: number;
  buttonsCount: number;
  headings: { level: number; text: string }[];
  discoveryStatus: 'discovered' | 'crawled' | 'failed';
}

export interface TestResultItem {
  id: string;
  name: string;
  category: TestCategory;
  url: string;
  status: TestStatus;
  durationMs: number;
  precondition?: string;
  expectedOutcome: string;
  actualOutcome: string;
  errorSummary?: string;
  screenshotPath?: string;
}

export interface Finding {
  id: string;
  title: string;
  category: TestCategory;
  severity: FindingSeverity;
  affectedUrl: string;
  description: string;
  reproductionSteps: string[];
  expectedResult: string;
  actualResult: string;
  suggestedFix?: string;
  confidence: number; // 0.0 - 1.0
  verificationStatus: 'verified' | 'suspected';
  detectionMethod?: string;
  technicalExplanation?: string;
  verificationProcedure?: string;
  evidence?: {
    screenshot?: string;
    selector?: string;
    logs?: string[];
    networkCode?: number;
    ruleId?: string;
    details?: Record<string, any>;
  };
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


export interface WorkerRunReport {
  runId: string;
  targetUrl: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  status: 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'PARTIAL';
  pagesDiscovered: DiscoveredPage[];
  results: TestResultItem[];
  findings: Finding[];
  metrics: QualityMetrics;
  artifacts: {
    type: 'screenshot' | 'diff' | 'trace' | 'log';
    name: string;
    path: string;
  }[];
}

export interface ExecutionEventPayload {
  runId: string;
  type: 'STATE_CHANGE' | 'STEP_START' | 'STEP_SUCCESS' | 'STEP_FAILURE' | 'LOG' | 'SCREENSHOT' | 'COMPLETE';
  step: string;
  message: string;
  timestamp: string;
  details?: Record<string, any>;
}
