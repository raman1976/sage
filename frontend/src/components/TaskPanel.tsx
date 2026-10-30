"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Task } from '../types';
import { api } from '../services/api';

const STATUS_COLORS: Record<string, string> = {
  planning: '#b9a1dd',
  executing: '#ffd166',
  completed: '#4dffb8',
  failed: '#ff6b6b',
  paused: '#ffd78a',
};

const STEP_STATUS_COLORS: Record<string, string> = {
  pending: 'rgba(185,161,221,0.35)',
  in_progress: '#ffd166',
  completed: '#4dffb8',
  blocked: '#ff6b6b',
  skipped: 'rgba(185,161,221,0.25)',
};

function statusDot(status: string) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: STATUS_COLORS[status] || '#b9a1dd',
        boxShadow: `0 0 8px ${STATUS_COLORS[status] || '#b9a1dd'}`,
        marginRight: '6px',
      }}
    />
  );
}

export function TaskPanel() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [creating, setCreating] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  const loadTasks = useCallback(async () => {
    try {
      const data = await api.listTasks();
      setTasks(data.tasks || []);
      setError(null);
    } catch (e) {
      setError(`Unable to reach Sage: ${(e as Error).message}`);
    }
  }, []);

  useEffect(() => {
    loadTasks();
    pollRef.current = window.setInterval(loadTasks, 4000);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [loadTasks]);

  const handleCreate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const goal = goalInput.trim();
    if (!goal) return;
    setCreating(true);
    setError(null);
    try {
      await api.createTask(goal);
      setGoalInput('');
      await loadTasks();
    } catch (e) {
      setError(`Failed to create task: ${(e as Error).message}`);
    } finally {
      setCreating(false);
    }
  }, [goalInput, loadTasks]);

  const handleExecuteAll = useCallback(async (taskId: string) => {
    try {
      await api.executeTask(taskId, true);
      await loadTasks();
    } catch (e) {
      setError(`Execution failed: ${(e as Error).message}`);
    }
  }, [loadTasks]);

  const handleExecuteNext = useCallback(async (taskId: string) => {
    try {
      await api.executeTask(taskId, false);
      await loadTasks();
    } catch (e) {
      setError(`Execution failed: ${(e as Error).message}`);
    }
  }, [loadTasks]);

  const handlePause = useCallback(async (taskId: string) => {
    try {
      await api.pauseTask(taskId);
      await loadTasks();
    } catch (e) {
      setError(`Pause failed: ${(e as Error).message}`);
    }
  }, [loadTasks]);

  const handleResume = useCallback(async (taskId: string) => {
    try {
      await api.resumeTask(taskId);
      await loadTasks();
    } catch (e) {
      setError(`Resume failed: ${(e as Error).message}`);
    }
  }, [loadTasks]);

  const handleDelete = useCallback(async (taskId: string) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await api.deleteTask(taskId);
      await loadTasks();
    } catch (e) {
      setError(`Delete failed: ${(e as Error).message}`);
    }
  }, [loadTasks]);

  return (
    <div
      style={{
        position: 'fixed',
        top: 'clamp(16px, 4vh, 24px)',
        right: 'clamp(16px, 3vw, 24px)',
        width: 'clamp(280px, 26vw, 420px)',
        maxHeight: '85dvh',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        zIndex: 50,
        pointerEvents: 'auto',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(26,22,38,0.7)',
          backdropFilter: 'blur(12px)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '10px 12px',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-body)',
        }}
      >
        <span style={{ fontSize: '18px' }}>📋</span>
        <span style={{ fontWeight: 600, fontSize: 'clamp(13px, 3vw, 15px)', letterSpacing: '-0.5px' }}>Sage Tasks</span>
      </div>

      {error && (
        <div
          style={{
            background: 'rgba(255,107,107,0.15)',
            border: '1px solid rgba(255,107,107,0.4)',
            color: '#ff6b6b',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '12px',
            fontFamily: 'var(--font-body)',
          }}
        >
          {error}
        </div>
      )}

      {/* Create task form */}
      <form onSubmit={handleCreate} style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={goalInput}
          onChange={(e) => setGoalInput(e.target.value)}
          placeholder="e.g. Plan my week, draft an email, break down a project"
          style={{
            flex: 1,
            background: 'rgba(26,22,38,0.6)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            color: 'var(--text-primary)',
            padding: '8px 12px',
            fontSize: '13px',
            fontFamily: 'var(--font-body)',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={creating || !goalInput.trim()}
          style={{
            background: creating ? '#888' : 'var(--sage-sprout)',
            color: '#0b1a10',
            border: 'none',
            borderRadius: '8px',
            padding: '0 14px',
            fontSize: '13px',
            fontWeight: 600,
            fontFamily: 'var(--font-body)',
            cursor: creating || !goalInput.trim() ? 'not-allowed' : 'pointer',
            opacity: creating || !goalInput.trim() ? 0.5 : 1,
          }}
        >
          {creating ? 'Planning…' : 'Plan'}
        </button>
      </form>

      {/* Task list */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          paddingRight: '4px',
        }}
      >
        {tasks.length === 0 && (
          <div
            style={{
              padding: '16px 12px',
              color: 'var(--text-secondary)',
              fontSize: '13px',
              fontFamily: 'var(--font-body)',
              textAlign: 'center',
            }}
          >
            No tasks yet. Create one above — Sage plans it with Nemotron 3 Ultra, then executes step-by-step.
          </div>
        )}
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onExecuteAll={handleExecuteAll}
            onExecuteNext={handleExecuteNext}
            onPause={handlePause}
            onResume={handleResume}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
}

function TaskCard({
  task,
  onExecuteAll,
  onExecuteNext,
  onPause,
  onResume,
  onDelete,
}: {
  task: Task;
  onExecuteAll: (id: string) => void;
  onExecuteNext: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const { progress } = task;
  const canExecute = task.status === 'executing' || task.status === 'paused';
  const isComplete = task.status === 'completed';

  return (
    <div
      style={{
        background: 'rgba(26,22,38,0.6)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        fontFamily: 'var(--font-body)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        {statusDot(task.status)}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={task.goal}
          >
            {task.goal}
          </div>
          <div
            style={{
              fontSize: '11px',
              color: 'var(--text-secondary)',
              marginTop: '2px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            {task.status}
          </div>
        </div>
        <button
          onClick={() => onDelete(task.id)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '2px',
            lineHeight: 1,
          }}
          title="Delete"
        >
          ×
        </button>
      </div>

      {/* Progress bar */}
      <div
        style={{
          width: '100%',
          height: '6px',
          background: 'rgba(185,161,221,0.2)',
          borderRadius: '3px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${progress.percent}%`,
            height: '100%',
            background: STATUS_COLORS[task.status] || '#b9a1dd',
            borderRadius: '3px',
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: 'var(--text-secondary)',
        }}
      >
        <span>{progress.completed}/{progress.total} steps</span>
        <span>{progress.percent}%</span>
      </div>

      {/* Steps */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          maxHeight: '140px',
          overflowY: 'auto',
        }}
      >
        {task.steps.map((step: Task['steps'][number], i: number) => (
          <div
            key={step.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11.5px',
              padding: '4px 6px',
              borderRadius: '6px',
              background: step.status === 'in_progress' ? 'rgba(255,209,102,0.15)' : 'transparent',
              border: step.status === 'in_progress' ? `1px solid ${STEP_STATUS_COLORS[step.status]}` : 'none',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                background: STEP_STATUS_COLORS[step.status] || 'rgba(185,161,221,0.35)',
                color: '#0b1a10',
                fontSize: '10px',
                fontWeight: 700,
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {i + 1}
            </span>
            <span
              title={step.description}
              style={{
                color: step.status === 'completed' ? '#4dffb8' : step.status === 'blocked' ? '#ff6b6b' : 'var(--text-secondary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                flex: 1,
                minWidth: 0,
              }}
            >
              {step.title}
            </span>
            {step.status === 'completed' && (
              <span style={{ fontSize: '10px', color: '#4dffb8' }}>✓</span>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
        {canExecute && !isComplete && (
          <button
            onClick={() => onExecuteNext(task.id)}
            disabled={task.status === 'paused'}
            style={{
              flex: 1,
              background: 'rgba(255,209,102,0.15)',
              border: `1px solid ${STEP_STATUS_COLORS.in_progress}`,
              color: '#ffd166',
              borderRadius: '6px',
              padding: '6px 8px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: task.status === 'paused' ? 'not-allowed' : 'pointer',
              opacity: task.status === 'paused' ? 0.5 : 1,
            }}
          >
            {task.status === 'paused' ? 'Paused' : 'Next Step'}
          </button>
        )}
        {canExecute && !isComplete && (
          <button
            onClick={() => onExecuteAll(task.id)}
            style={{
              flex: 1,
              background: 'rgba(77,255,184,0.15)',
              border: '1px solid rgba(77,255,184,0.4)',
              color: '#4dffb8',
              borderRadius: '6px',
              padding: '6px 8px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Run All
          </button>
        )}
        {task.status === 'paused' && (
          <button
            onClick={() => onResume(task.id)}
            style={{
              background: 'rgba(255,215,138,0.15)',
              border: '1px solid rgba(255,215,138,0.4)',
              color: '#ffd78a',
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Resume
          </button>
        )}
        {task.status === 'executing' && (
          <button
            onClick={() => onPause(task.id)}
            style={{
              background: 'rgba(185,161,221,0.15)',
              border: '1px solid rgba(185,161,221,0.4)',
              color: '#b9a1dd',
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Pause
          </button>
        )}
      </div>

      {task.error && (
        <div
          style={{
            fontSize: '11px',
            color: '#ff6b6b',
            marginTop: '4px',
          }}
        >
          Error: {task.error}
        </div>
      )}
    </div>
  );
}
