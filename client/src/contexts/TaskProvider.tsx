import React, { useEffect, useState } from 'react';
import socket from '../utils/socket.js';
import { TaskContext, type Task } from './TaskContext.js';

export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    // Initial tasks on connection
    socket.on('active_tasks', (initialTasks: Task[]) => {
      setTasks(initialTasks);
    });

    socket.on('task_started', (task: Task) => {
      setTasks((prev) => [...prev.filter((t) => t.id !== task.id), task]);
    });

    socket.on('task_progress', (updatedTask: Task) => {
      setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
    });

    socket.on('task_failed', (task: Task) => {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...task, status: 'failed' } : t)));
      setTimeout(() => {
        setTasks((prev) => prev.filter((t) => t.id !== task.id));
      }, 10000);
    });

    socket.on('task_completed', (task: Task) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...task, status: 'completed' } : t))
      );
      setTimeout(() => {
        setTasks((prev) => prev.filter((t) => t.id !== task.id));
      }, 3000);
    });

    socket.on('task_deleted', ({ id }: { id: string }) => {
      setTasks((prev) => prev.filter((t) => t.id !== id));
    });

    return () => {
      socket.off('active_tasks');
      socket.off('task_started');
      socket.off('task_progress');
      socket.off('task_completed');
      socket.off('task_failed');
      socket.off('task_deleted');
    };
  }, []);

  const addTask = (task: Task) => {
    setTasks((prev) => [...prev.filter((t) => t.id !== task.id), task]);
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  };

  const removeTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <TaskContext.Provider value={{ tasks, addTask, updateTask, removeTask }}>
      {children}
    </TaskContext.Provider>
  );
};
