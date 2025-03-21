import React, { createContext, useState, useContext, ReactNode } from 'react';

// 定义 Context 的类型
interface TaskSplittingContextType {
  splittingTodoId: string | null;
  setSplittingTodoId: (id: string | null) => void;
  lastSplitResult: any;
  setLastSplitResult: (result: any) => void;
  splitCompleted: boolean;
  setSplitCompleted: (completed: boolean) => void;
  lastSplitTodoId: string | null;
  setLastSplitTodoId: (id: string | null) => void;
}

// 创建 Context
const TaskSplittingContext = createContext<TaskSplittingContextType | undefined>(undefined);

// Context Provider 组件
interface TaskSplittingProviderProps {
  children: ReactNode;
}

export const TaskSplittingProvider: React.FC<TaskSplittingProviderProps> = ({ children }) => {
  const [splittingTodoId, setSplittingTodoId] = useState<string | null>(null);
  const [lastSplitResult, setLastSplitResult] = useState<any>(null);
  const [splitCompleted, setSplitCompleted] = useState<boolean>(false);
  const [lastSplitTodoId, setLastSplitTodoId] = useState<string | null>(null);

  const value = {
    splittingTodoId,
    setSplittingTodoId,
    lastSplitResult,
    setLastSplitResult,
    splitCompleted,
    setSplitCompleted,
    lastSplitTodoId,
    setLastSplitTodoId
  };

  return (
    <TaskSplittingContext.Provider value={value}>
      {children}
    </TaskSplittingContext.Provider>
  );
};

// 自定义 Hook 用于访问 Context
export const useTaskSplitting = (): TaskSplittingContextType => {
  const context = useContext(TaskSplittingContext);
  if (context === undefined) {
    throw new Error('useTaskSplitting must be used within a TaskSplittingProvider');
  }
  return context;
};
