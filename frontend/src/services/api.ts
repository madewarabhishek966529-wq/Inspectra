import {
  AuthResponse,
  DiscoveredPage,
  Finding,
  Project,
  QualityMetrics,
  SystemHealth,
  TestResult,
  TestRun,
  User,
  AiSettings,
  ProjectTrends
} from '../types';


const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('inspectra_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    // If unauthenticated, notify or clear stale token if present
    if (endpoint !== '/auth/login' && endpoint !== '/auth/register') {
      localStorage.removeItem('inspectra_token');
    }
  }

  if (!res.ok) {
    let errorMsg = `HTTP Error ${res.status}: ${res.statusText}`;
    try {
      const errorJson = await res.json();
      if (errorJson.error) errorMsg = errorJson.error;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  if (res.status === 204) {
    return {} as T;
  }

  return res.json();
}

// Auth API
export const apiAuth = {
  login: (email: string, password: string): Promise<AuthResponse> =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (email: string, password: string): Promise<AuthResponse> =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: (): Promise<User> => request('/auth/me'),

  logout: async () => {
    try {
      await request('/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    localStorage.removeItem('inspectra_token');
  },
};

// Projects API
export const apiProjects = {
  list: (): Promise<Project[]> => request('/projects'),

  get: (id: string): Promise<Project> => request(`/projects/${id}`),

  create: (data: {
    name: string;
    description?: string;
    targetUrl: string;
    configurationJson?: string;
  }): Promise<Project> =>
    request('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (
    id: string,
    data: {
      name?: string;
      description?: string;
      targetUrl?: string;
      configurationJson?: string;
    }
  ): Promise<Project> =>
    request(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string): Promise<void> =>
    request(`/projects/${id}`, {
      method: 'DELETE',
    }),

  startRun: (
    projectId: string,
    data: {
      targetUrl?: string;
      categories?: string[];
      viewports?: { name: string; width: number; height: number }[];
      maxPages?: number;
      allowPrivateIps?: boolean;
    }
  ): Promise<TestRun> =>
    request(`/projects/${projectId}/runs`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  configureSchedule: (
    id: string,
    data: {
      enabled: boolean;
      frequency: string;
      cron?: string;
      configurationJson?: string;
    }
  ): Promise<Project> =>
    request(`/projects/${id}/schedule`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getTrends: (id: string): Promise<ProjectTrends> =>
    request(`/projects/${id}/trends`),
};


// Test Runs API
export const apiRuns = {
  list: (): Promise<TestRun[]> => request('/runs'),

  get: (id: string): Promise<TestRun> => request(`/runs/${id}`),

  cancel: (id: string): Promise<{ message: string }> =>
    request(`/runs/${id}/cancel`, {
      method: 'POST',
    }),

  retry: (id: string): Promise<TestRun> =>
    request(`/runs/${id}/retry`, {
      method: 'POST',
    }),

  getReport: (id: string): Promise<{
    runId: string;
    projectId: string;
    targetUrl: string;
    status: string;
    overallScore: number;
    startedAt: string;
    completedAt: string;
    durationMs: number;
    metrics: QualityMetrics;
    results: TestResult[];
    findings: Finding[];
  }> => request(`/runs/${id}/report`),

  getPdfUrl: (id: string): string => `${API_BASE}/runs/${id}/report.pdf`,
  getJsonUrl: (id: string): string => `${API_BASE}/runs/${id}/report.json`,
  getMarkdownUrl: (id: string): string => `${API_BASE}/runs/${id}/report.md`,
};

// Findings API
export const apiFindings = {
  list: (params?: { runId?: string; severity?: string; category?: string }): Promise<Finding[]> => {
    const query = new URLSearchParams();
    if (params?.runId) query.append('runId', params.runId);
    if (params?.severity) query.append('severity', params.severity);
    if (params?.category) query.append('category', params.category);
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return request(`/findings${queryString}`);
  },

  get: (id: string): Promise<Finding> => request(`/findings/${id}`),

  update: (
    id: string,
    updates: {
      verificationStatus?: string;
      remediationStatus?: string;
      suggestedFix?: string;
      technicalExplanation?: string;
      verificationProcedure?: string;
    }
  ): Promise<Finding> =>
    request(`/findings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),
};

// Health & System API
export const apiSystem = {
  getHealth: (): Promise<SystemHealth> => request('/health'),
  getAiSettings: (): Promise<AiSettings> => request('/settings/ai'),
};

// SSE Helper for live run events
export function subscribeToRunEvents(
  runId: string,
  onEvent: (event: any) => void,
  onError?: (err: any) => void
): () => void {
  // Directly subscribe to the run's SSE stream
  const url = `${API_BASE}/runs/${runId}/events`;
  const eventSource = new EventSource(url);

  eventSource.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      onEvent(data);
    } catch {
      onEvent({ message: e.data, eventType: 'LOG' });
    }
  };

  eventSource.onerror = (err) => {
    if (onError) onError(err);
  };

  return () => {
    eventSource.close();
  };
}
