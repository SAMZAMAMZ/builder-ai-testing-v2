// Builder-AI Type Definitions for Railway Deployment

export interface ExecutableTask {
  id: string;
  name: string;
  description: string;
  type: 'deploy' | 'test' | 'analyze' | 'build' | 'verify';
  parameters: Record<string, any>;
  dependencies: string[];
  priority: number;
  estimatedTime?: number;
}

export interface TaskBatch {
  id: string;
  name: string;
  tasks: ExecutableTask[];
  totalTasks: number;
  estimatedTime: number;
  priority?: number;
}

export interface TaskResult {
  taskId: string;
  success: boolean;
  result?: any;
  error?: string;
  startedAt: Date;
  completedAt: Date;
  duration: number;
  logs?: string[];
  metadata?: {
    firstAttemptFailed?: boolean;
    originalError?: string;
    autoFixApplied?: boolean;
  };
}

export interface BatchStatus {
  batchId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  startedAt: Date;
  completedAt?: Date;
  tasks: (ExecutableTask & { status: string })[];
}

export interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
}

export interface ProjectAnalysis {
  contracts: string[];
  tests: string[];
  issues: string[];
  recommendations: string[];
  structure: Record<string, any>;
}

export interface DeploymentResult {
  network: string;
  contracts: Array<{
    name: string;
    address: string;
    transactionHash: string;
  }>;
  gasUsed: string;
  totalCost: string;
}

export interface HQAINotification {
  type: 'batch_received' | 'batch_started' | 'batch_completed' | 'batch_failed' | 'task_progress';
  batchId: string;
  message: string;
  data?: any;
  timestamp: string;
}
