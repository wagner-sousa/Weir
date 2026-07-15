import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Trash2, LoaderCircle, Wrench, Filter } from 'lucide-react';
import { fetchProjections, saveProjection, removeProjection, getMCPTools } from '../services/api';
import type { ProjectionSelection } from '../services/api';
import parse from 'jsonpath-rfc9535/parser';

interface FieldProjectionModalProps {
  open: boolean;
  mcpName: string;
  onClose: () => void;
}

interface ToolProjection {
  toolName: string;
  toolDescription?: string;
  projection: ProjectionSelection | null;
}

export function FieldProjectionModal({ open, mcpName, onClose }: FieldProjectionModalProps) {
  const [tools, setTools] = useState<ToolProjection[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [editingTool, setEditingTool] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<'include' | 'exclude'>('include');
  const [editFieldsList, setEditFieldsList] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<(string | null)[]>([]);

  function validateFieldPath(p: string): string | null {
    if (!p) return null;
    try {
      const fullPath = p.startsWith('$') ? p : `$.${p}`;
      parse(fullPath);
    } catch {
      return 'Invalid field path syntax';
    }
    if (p === '$' || p === '$[*]') {
      return 'Invalid bare path';
    }
    return null;
  }

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [toolsRes, projRes] = await Promise.all([
        getMCPTools(mcpName),
        fetchProjections(mcpName),
      ]);

      const toolList: ToolProjection[] = toolsRes.tools.map((t) => ({
        toolName: t.name,
        toolDescription: t.description,
        projection: projRes.projections[t.name] || null,
      }));

      setTools(toolList);
    } catch {
      toast.error('Failed to load projections.');
    } finally {
      setLoading(false);
    }
  }, [mcpName]);

  useEffect(() => {
    if (open) {
      loadData();
    } else {
      setTools([]);
      setEditingTool(null);
    }
  }, [open, loadData]);

  function startEdit(tool: ToolProjection) {
    setEditingTool(tool.toolName);
    setEditMode(tool.projection?.mode || 'include');
    setEditFieldsList(tool.projection?.fields || ['']);
    setFieldErrors([]);
  }

  function cancelEdit() {
    setEditingTool(null);
    setEditFieldsList([]);
    setFieldErrors([]);
  }

  function addField() {
    setEditFieldsList((prev) => [...prev, '']);
    setFieldErrors((prev) => [...prev, null]);
  }

  function removeField(index: number) {
    setEditFieldsList((prev) => prev.filter((_, i) => i !== index));
    setFieldErrors((prev) => prev.filter((_, i) => i !== index));
  }

  function updateField(index: number, value: string) {
    setEditFieldsList((prev) => prev.map((f, i) => i === index ? value : f));
    setFieldErrors((prev) => {
      const next = [...prev];
      next[index] = validateFieldPath(value);
      return next;
    });
  }

  async function handleSave(toolName: string) {
    const errors = fieldErrors.filter(Boolean);
    if (errors.length > 0) {
      toast.error('Fix field errors before saving.');
      return;
    }

    const fields = editFieldsList
      .map((f) => f.trim())
      .filter((f) => f.length > 0);

    if (fields.length === 0) {
      toast.error('At least one field is required.');
      return;
    }

    setSaving(toolName);
    try {
      const result = await saveProjection(mcpName, toolName, {
        mode: editMode,
        fields,
      });

      if (result.success) {
        toast.success(`Projection saved for "${toolName}".`);
        setEditingTool(null);
        await loadData();
      } else {
        toast.error(result.error || 'Failed to save projection.');
      }
    } catch {
      toast.error('Failed to save projection.');
    } finally {
      setSaving(null);
    }
  }

  async function handleRemove(toolName: string) {
    setSaving(toolName);
    try {
      const result = await removeProjection(mcpName, toolName);
      if (result.success) {
        toast.success(`Projection removed for "${toolName}".`);
        await loadData();
      } else {
        toast.error(result.error || 'Failed to remove projection.');
      }
    } catch {
      toast.error('Failed to remove projection.');
    } finally {
      setSaving(null);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <Dialog.Content className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-start justify-center py-8">
            <div className="w-full max-w-2xl rounded-lg bg-theme-panel p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <Dialog.Title className="flex items-center gap-2 text-lg font-bold text-theme-text">
                  <Wrench className="h-5 w-5 text-theme-accent" />
                  Field Projection — {mcpName}
                </Dialog.Title>
                <Dialog.Close className="rounded p-3 text-theme-muted hover:bg-theme-border hover:text-theme-text">
                  <X className="h-4 w-4" />
                </Dialog.Close>
              </div>

              <p className="mb-4 text-sm text-theme-muted">
                Configure which fields to include or exclude from tool responses to reduce token consumption.
              </p>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <LoaderCircle className="h-6 w-6 animate-spin text-theme-accent" />
                </div>
              ) : tools.length === 0 ? (
                <div className="rounded border border-theme-border bg-theme-bg p-6 text-center">
                  <p className="text-theme-muted">No tools available for this MCP.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {tools.map((tool) => (
                    <div
                      key={tool.toolName}
                      className="rounded border border-theme-border bg-theme-bg p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-theme-text">{tool.toolName}</span>
                            {tool.projection && (
                              <span
                                className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                                  tool.projection.mode === 'include'
                                    ? 'bg-green-900/30 text-green-400'
                                    : 'bg-red-900/30 text-red-400'
                                }`}
                              >
                                {tool.projection.mode}
                              </span>
                            )}
                          </div>
                          {tool.toolDescription && (
                            <p className="mt-0.5 text-xs text-theme-muted">
                              {tool.toolDescription}
                            </p>
                          )}
                          {tool.projection && (
                            <p className="mt-1 text-xs text-theme-muted">
                              Fields: {tool.projection.fields.join(', ')}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEdit(tool)}
                            className="rounded p-1.5 text-gray-400 hover:bg-blue-600/20 hover:text-blue-400"
                            title={tool.projection ? 'Edit projection' : 'Add projection'}
                          >
                            <Filter className="h-4 w-4" />
                          </button>
                          {tool.projection && (
                            <button
                              onClick={() => handleRemove(tool.toolName)}
                              disabled={saving === tool.toolName}
                              className="rounded p-1.5 text-gray-400 hover:bg-red-600/20 hover:text-red-400 disabled:opacity-50"
                              title="Remove projection"
                            >
                              {saving === tool.toolName ? (
                                <LoaderCircle className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {editingTool === tool.toolName && (
                        <div className="mt-3 space-y-2 border-t border-theme-border pt-3">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setEditMode('include')}
                              className={`flex-1 rounded px-3 py-2 text-left transition-colors ${
                                editMode === 'include'
                                  ? 'bg-green-900/30 text-green-400 border border-green-700'
                                  : 'bg-theme-bg text-theme-muted border border-theme-border hover:text-theme-text'
                              }`}
                            >
                              <div className="text-sm font-medium">Include</div>
                              <div className="text-xs opacity-75">Only the specified fields will be kept in the response.</div>
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditMode('exclude')}
                              className={`flex-1 rounded px-3 py-2 text-left transition-colors ${
                                editMode === 'exclude'
                                  ? 'bg-red-900/30 text-red-400 border border-red-700'
                                  : 'bg-theme-bg text-theme-muted border border-theme-border hover:text-theme-text'
                              }`}
                            >
                              <div className="text-sm font-medium">Exclude</div>
                              <div className="text-xs opacity-75">The specified fields will be removed from the response.</div>
                            </button>
                          </div>
                          <div>
                            <div className="mb-1 flex items-center justify-between">
                              <label className="text-xs text-theme-muted">
                                Fields (supports dot notation and JSONPath syntax)
                              </label>
                              <button
                                type="button"
                                onClick={addField}
                                className="text-xs text-theme-accent hover:text-theme-accent-dark"
                              >
                                + Add field
                              </button>
                            </div>
                            {editFieldsList.map((field, i) => {
                              const err = fieldErrors[i];
                              return (
                                <div key={i} className="mb-1">
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      value={field}
                                      onChange={(e) => updateField(i, e.target.value)}
                                      className={`flex-1 rounded border px-3 py-1.5 text-sm placeholder:text-theme-muted/50 ${
                                        err
                                          ? 'border-red-500 bg-theme-panel text-red-400'
                                          : 'border-theme-border bg-theme-panel text-theme-text'
                                      }`}
                                      placeholder="e.g.: id, name, data.status"
                                    />
                                    {editFieldsList.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => removeField(i)}
                                        className="px-2 text-red-500 hover:text-red-700"
                                        aria-label="Remove field"
                                      >
                                        &times;
                                      </button>
                                    )}
                                  </div>
                                  {err && (
                                    <p className="mt-0.5 text-xs text-red-500">{err}</p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          <div className="mt-3 flex justify-end gap-2 border-t border-theme-border pt-3">
                            <button
                              onClick={cancelEdit}
                              disabled={saving === tool.toolName}
                              className="rounded px-3 py-1.5 text-sm text-theme-muted hover:bg-theme-border"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSave(tool.toolName)}
                              disabled={saving === tool.toolName}
                              className="rounded bg-theme-accent px-3 py-1.5 text-sm font-medium text-gray-900 hover:bg-theme-accent-dark disabled:opacity-50"
                            >
                              {saving === tool.toolName ? (
                                <LoaderCircle className="h-4 w-4 animate-spin" />
                              ) : (
                                'Save'
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
