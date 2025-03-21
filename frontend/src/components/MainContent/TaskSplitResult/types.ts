export interface TaskReference {
  task: string;
  depends_on: string[];
}

export interface SubTask {
  id: number;
  title: string;
  description: string | null;
  references: string[];
  steps: string[];
  acceptance_criteria: string[];
  priority: string | null;
  estimate: string | null;
  status?: string;  // pending/executing/completed/failed
  event_file_id?: string;  // 关联的执行事件ID
  next_task_ready?: boolean;  // 标记下一个任务是否已准备好执行
}

export interface TaskSplitResult {
  id?: string;
  analysis: string;
  tasks: SubTask[];
  tasks_count: number;
  dependencies?: TaskReference[];
}

export interface TaskSplitResultViewProps {
  visible: boolean;
  result?: TaskSplitResult | null;
  todoId?: string; // 添加 todoId 属性，用于更新操作
}
