import { IngestRequest, IngestResponse, AnalyzeRequest, SolidityAnalysisResult, PlanMigrationRequest, MigrationPlanResult, TransformRequest, TransformReport } from '@/types/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8012';

export async function ingestRepository(request: IngestRequest): Promise<IngestResponse> {
  try {
    const response = await fetch(`${API_URL}/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    const data: IngestResponse = await response.json();
    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to ingest repository';
    throw new Error(message);
  }
}

export async function analyzeSolidity(request: AnalyzeRequest): Promise<SolidityAnalysisResult> {
  try {
    const response = await fetch(`${API_URL}/analyze/solidity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    const data: SolidityAnalysisResult = await response.json();
    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to analyze Solidity contracts';
    throw new Error(message);
  }
}
export async function planMigration(request: PlanMigrationRequest): Promise<MigrationPlanResult> {
  try {
    const response = await fetch(`${API_URL}/plan/migration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    const data: MigrationPlanResult = await response.json();
    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate migration plan';
    throw new Error(message);
  }
}

export async function runTransformation(request: TransformRequest): Promise<TransformReport> {
  try {
    const response = await fetch(`${API_URL}/transform`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    const data: TransformReport = await response.json();
    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to run transformation';
    throw new Error(message);
  }
}