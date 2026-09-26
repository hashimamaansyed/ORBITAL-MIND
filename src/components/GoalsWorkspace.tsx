import React, { useState, useMemo } from 'react';
import { ThoughtNode, GoalStatus, GoalPriority } from '../types';
import confetti from 'canvas-confetti';
import {
  Target,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  Flame,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Save,
  Trash2,
  Compass,
  AlertCircle
} from 'lucide-react';

interface GoalsWorkspaceProps {
  thoughts: ThoughtNode[];
  onSaveThought: (thoughtData: Partial<ThoughtNode>) => Promise<ThoughtNode | null>;
  onDeleteThought: (filePath: string) => Promise<boolean>;
  onNavigateToUniverse: (thoughtId: string) => void;
}

export const GoalsWorkspace: React.FC<GoalsWorkspaceProps> = ({
  thoughts,
  onSaveThought,
  onDeleteThought,
  onNavigateToUniverse
}) => {
  const goals = useMemo(() => {
    return thoughts.filter(t => t.type === 'goal');
  }, [thoughts]);

  // Form modal state
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<ThoughtNode | null>(null);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalContent, setGoalContent] = useState('');
  const [goalStatus, setGoalStatus] = useState<GoalStatus>('in-progress');
  const [goalPriority, setGoalPriority] = useState<GoalPriority>('high');
  const [targetDate, setTargetDate] = useState('2026-12-31');
  const [progress, setProgress] = useState(50);
  const [isSaving, setIsSaving] = useState(false);

  const openNewGoalModal = () => {
    setEditingGoal(null);
    setGoalTitle('');
    setGoalContent('# Objective\n\n### Milestones\n- [ ] Key result 1\n- [ ] Key result 2\n\nConnected to [[Notes]].');
    setGoalStatus('in-progress');
    setGoalPriority('high');
    setTargetDate('2026-12-31');
    setProgress(30);
    setShowGoalModal(true);
  };

  const openEditGoalModal = (goal: ThoughtNode) => {
    setEditingGoal(goal);
    setGoalTitle(goal.title);
    setGoalContent(goal.content);
    setGoalStatus(goal.goalStatus || 'in-progress');
    setGoalPriority(goal.goalPriority || 'medium');
    setTargetDate(goal.targetDate || '2026-12-31');
    setProgress(goal.progress !== undefined ? goal.progress : 50);
    setShowGoalModal(true);
  };

  const handleSaveGoal = async () => {
    if (!goalTitle.trim()) return;
    setIsSaving(true);

    const isNewlyCompleted = goalStatus === 'completed' || progress === 100;
    if (isNewlyCompleted && (!editingGoal || editingGoal.goalStatus !== 'completed')) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    }

    await onSaveThought({
      id: editingGoal?.id,
      title: goalTitle,
      type: 'goal',
      content: goalContent,
      folder: 'Goals',
      tags: ['goals', goalPriority, goalStatus],
      targetDate,
      goalStatus: progress === 100 ? 'completed' : goalStatus,
      goalPriority,
      progress,
      filePath: editingGoal?.filePath,
    });

    setIsSaving(false);
    setShowGoalModal(false);
  };

  // Quick status update from Kanban cards
  const updateGoalStatus = async (goal: ThoughtNode, newStatus: GoalStatus) => {
    const newProgress = newStatus === 'completed' ? 100 : (goal.progress === 100 ? 50 : goal.progress);
    if (newStatus === 'completed') {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 }
      });
    }

    await onSaveThought({
      ...goal,
      goalStatus: newStatus,
      progress: newProgress,
    });
  };

  // Filter into Kanban columns
  const pendingGoals = goals.filter(g => (g.goalStatus || 'in-progress') === 'pending');
  const inProgressGoals = goals.filter(g => (g.goalStatus || 'in-progress') === 'in-progress');
  const completedGoals = goals.filter(g => g.goalStatus === 'completed' || (g.progress || 0) >= 100);

  // Stats
  const totalGoals = goals.length;
  const avgProgress = totalGoals > 0
    ? Math.round(goals.reduce((sum, g) => sum + (g.progress || 0), 0) / totalGoals)
    : 0;

  return (
    <div id="goals-workspace" className="h-[calc(100vh-68px)] flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Header Banner */}
      <div className="p-4 sm:px-6 border-b border-zinc-800 bg-zinc-950 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <Target className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span>Aspiration & Goals Board</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-zinc-900 text-zinc-300 border border-zinc-800 font-mono">
                {avgProgress}% Velocity
              </span>
            </h1>
            <p className="text-xs text-zinc-400 font-mono">
              Represented as Node Spheres in the 3D Mind Map
            </p>
          </div>
        </div>

        <button
          id="add-goal-btn"
          onClick={openNewGoalModal}
          className="px-4 py-2 rounded-lg bg-white hover:bg-zinc-200 text-black font-bold text-xs flex items-center gap-2 transition-all shadow-sm active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>New Goal</span>
        </button>
      </div>

      {/* Kanban Board Columns */}
      <div className="flex-1 p-4 sm:p-6 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-5 h-full min-w-[840px]">
          {/* Column 1: Planning / Pending */}
          <div className="flex-1 flex flex-col bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="p-3.5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-zinc-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                  Planning & Queued
                </span>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-zinc-900 text-zinc-400 border border-zinc-800">
                {pendingGoals.length}
              </span>
            </div>

            <div className="flex-1 p-3 overflow-y-auto space-y-3">
              {pendingGoals.map(goal => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onEdit={() => openEditGoalModal(goal)}
                  onStatusChange={s => updateGoalStatus(goal, s)}
                  onNavigate={() => onNavigateToUniverse(goal.id)}
                  onDelete={() => onDeleteThought(goal.filePath)}
                />
              ))}
              {pendingGoals.length === 0 && (
                <div className="py-8 text-center text-xs text-zinc-500 italic">
                  No queued goals.
                </div>
              )}
            </div>
          </div>

          {/* Column 2: In Progress */}
          <div className="flex-1 flex flex-col bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="p-3.5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-white" />
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                  Active Execution
                </span>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-200 border border-zinc-700">
                {inProgressGoals.length}
              </span>
            </div>

            <div className="flex-1 p-3 overflow-y-auto space-y-3">
              {inProgressGoals.map(goal => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onEdit={() => openEditGoalModal(goal)}
                  onStatusChange={s => updateGoalStatus(goal, s)}
                  onNavigate={() => onNavigateToUniverse(goal.id)}
                  onDelete={() => onDeleteThought(goal.filePath)}
                />
              ))}
              {inProgressGoals.length === 0 && (
                <div className="py-8 text-center text-xs text-zinc-500 italic">
                  No active goals. Add one!
                </div>
              )}
            </div>
          </div>

          {/* Column 3: Completed / Achieved */}
          <div className="flex-1 flex flex-col bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="p-3.5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-zinc-300" />
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                  Achieved Milestones
                </span>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-200 border border-zinc-700">
                {completedGoals.length}
              </span>
            </div>

            <div className="flex-1 p-3 overflow-y-auto space-y-3">
              {completedGoals.map(goal => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onEdit={() => openEditGoalModal(goal)}
                  onStatusChange={s => updateGoalStatus(goal, s)}
                  onNavigate={() => onNavigateToUniverse(goal.id)}
                  onDelete={() => onDeleteThought(goal.filePath)}
                />
              ))}
              {completedGoals.length === 0 && (
                <div className="py-8 text-center text-xs text-zinc-500 italic">
                  Complete goals to see them recorded here.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Goal Edit / Creation Modal */}
      {showGoalModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl p-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-white" />
                <span>{editingGoal ? 'Edit Goal' : 'Define New Goal'}</span>
              </h3>
              <button
                onClick={() => setShowGoalModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-400 font-medium mb-1">Goal Title</label>
                <input
                  type="text"
                  value={goalTitle}
                  onChange={e => setGoalTitle(e.target.value)}
                  placeholder="e.g. Master Spatial Computing & Shaders"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 text-sm focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Target Date</label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={e => setTargetDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 font-mono focus:outline-none focus:border-zinc-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Priority</label>
                  <select
                    value={goalPriority}
                    onChange={e => setGoalPriority(e.target.value as GoalPriority)}
                    className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 focus:outline-none focus:border-zinc-500"
                  >
                    <option value="high">High Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="low">Low Priority</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-zinc-400 font-medium mb-1">
                  <span>Current Progress</span>
                  <span className="font-mono text-white font-bold">{progress}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={progress}
                  onChange={e => setProgress(Number(e.target.value))}
                  className="w-full accent-white"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-medium mb-1">Status Column</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['pending', 'in-progress', 'completed'] as GoalStatus[]).map(status => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setGoalStatus(status)}
                      className={`py-1.5 rounded-lg font-medium transition-all capitalize ${
                        goalStatus === status
                          ? 'bg-white text-black font-bold'
                          : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white'
                      }`}
                    >
                      {status === 'pending' ? 'Queued' : status}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 font-medium mb-1">Objective & Milestones (Markdown)</label>
                <textarea
                  rows={4}
                  value={goalContent}
                  onChange={e => setGoalContent(e.target.value)}
                  placeholder="Record milestones, action items, and link to [[Notes]]..."
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 font-mono text-xs focus:outline-none focus:border-zinc-500 leading-relaxed"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5 pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setShowGoalModal(false)}
                className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveGoal}
                disabled={isSaving}
                className="px-4 py-1.5 text-xs font-bold rounded-lg bg-white hover:bg-zinc-200 text-black flex items-center gap-1.5 shadow-md active:scale-95"
              >
                <Save className="w-3.5 h-3.5 text-black" />
                <span>{isSaving ? 'Saving...' : 'Save Goal'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Sub-component for individual Kanban Goal Card
interface GoalCardProps {
  goal: ThoughtNode;
  onEdit: () => void;
  onStatusChange: (status: GoalStatus) => void;
  onNavigate: () => void;
  onDelete: () => void;
}

const GoalCard: React.FC<GoalCardProps> = ({
  goal,
  onEdit,
  onStatusChange,
  onNavigate,
  onDelete
}) => {
  const progress = goal.progress !== undefined ? goal.progress : 0;
  const isCompleted = goal.goalStatus === 'completed' || progress >= 100;

  return (
    <div
      onClick={onEdit}
      className="p-3.5 bg-zinc-950 border border-zinc-800 hover:border-zinc-600 rounded-xl cursor-pointer transition-all shadow-sm group hover:shadow-md text-xs"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-semibold text-zinc-200 text-sm group-hover:text-white transition-colors leading-snug">
          {goal.title}
        </h4>
        <span
          className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-mono font-medium shrink-0 ${
            goal.goalPriority === 'high'
              ? 'bg-zinc-800 text-white border border-zinc-700'
              : goal.goalPriority === 'medium'
              ? 'bg-zinc-900 text-zinc-300 border border-zinc-800'
              : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
          }`}
        >
          {goal.goalPriority || 'med'}
        </span>
      </div>

      <p className="text-zinc-400 line-clamp-2 text-xs mb-3 font-mono">
        {goal.content.replace(/^#+ /gm, '').replace(/^- \[[ xX]\] /gm, '• ')}
      </p>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-[10px] text-zinc-400 font-mono mb-1">
          <span>Progress</span>
          <span className="text-white font-bold">{progress}%</span>
        </div>
        <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-white transition-all duration-500 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Footer Details */}
      <div className="flex items-center justify-between pt-2 border-t border-zinc-900 text-[11px] text-zinc-500 font-mono">
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3 text-zinc-400" />
          <span>{goal.targetDate || '2026'}</span>
        </span>

        <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
          <button
            onClick={onNavigate}
            title="Spotlight in 3D Mind Map"
            className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded"
          >
            <Compass className="w-3.5 h-3.5" />
          </button>

          {!isCompleted ? (
            <button
              onClick={() => onStatusChange('completed')}
              title="Mark as Achieved"
              className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 text-[10px] font-medium"
            >
              Complete
            </button>
          ) : (
            <button
              onClick={() => onStatusChange('in-progress')}
              title="Reopen Goal"
              className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-[10px]"
            >
              Reopen
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
