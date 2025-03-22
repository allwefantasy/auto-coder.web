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

// 添加子组件的Props类型定义
export interface TaskAnalysisPanelProps {
  analysis: string;
  updateAnalysis: (value: string) => void;
  onBlur?: () => void; // 添加失去焦点回调
}

export interface SubTasksPanelProps {
  tasks: SubTask[];
  tasksCount: number;
  updateTaskData: (taskIndex: number, field: string | number | symbol, value: any) => void;
  updateArrayField: (taskIndex: number, field: string | number | symbol, itemIndex: number, value: string) => void;
  saveData: (updatedResult: TaskSplitResult) => void;
  parsedResult: TaskSplitResult;
  setParsedResult: React.Dispatch<React.SetStateAction<TaskSplitResult | null>>;
  addSubTask: () => void;
  deleteSubTask: (taskIndex: number) => void;
  onTaskDataBlur?: () => void; // 添加失去焦点回调
  onArrayFieldBlur?: () => void; // 添加失去焦点回调
}

export interface TaskDependenciesPanelProps {
  dependencies: TaskReference[];
  updateDependency: (depIndex: number, field: 'task' | 'depends_on', value: any) => void;
  updateDependencyItem: (depIndex: number, itemIndex: number, value: string) => void;
  onDependencyBlur?: () => void; // 添加失去焦点回调
  onDependencyItemBlur?: () => void; // 添加失去焦点回调
}
