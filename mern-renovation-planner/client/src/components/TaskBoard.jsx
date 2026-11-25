export default function TaskBoard({ tasks, onStatusChange, onDelete, onQuote }) {
  const cols = [
    { key: 'todo', label: 'To do' },
    { key: 'doing', label: 'Doing' },
    { key: 'done', label: 'Done' },
  ];
  const next = { todo: 'doing', doing: 'done', done: null };

  return (
    <div className="kanban">
      {cols.map((col) => (
        <div key={col.key} className="kanban-col" aria-label={`${col.label} tasks`}>
          <h3>{col.label} ({tasks.filter(t => t.status === col.key).length})</h3>
          {tasks.filter(t => t.status === col.key).length === 0 && (
            <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>Nothing here yet.</p>
          )}
          {tasks.filter(t => t.status === col.key).map((task) => {
            const blocked = task.dependsOn && task.dependsOn.status !== 'done';
            return (
              <article key={task._id} className={`task-card ${blocked ? 'blocked' : ''}`}>
                <strong>{task.title}</strong>
                <p style={{ fontSize: '0.85rem', margin: '6px 0' }}>
                  <span className="tag">{task.phase}</span>{' '}
                  {task.assignedContractor && <span>· {task.assignedContractor.name}</span>}
                </p>
                <p style={{ fontSize: '0.85rem', margin: '4px 0' }}>
                  Est. ₹{(task.estimatedCost || 0).toLocaleString('en-IN')}
                  {task.actualCost ? ` · Actual ₹${task.actualCost.toLocaleString('en-IN')}` : ''}
                  {task.dueDate ? ` · Due ${new Date(task.dueDate).toLocaleDateString('en-IN')}` : ''}
                </p>
                {task.dependsOn && (
                  <p style={{ fontSize: '0.85rem', margin: '4px 0', fontWeight: 600 }}>
                    {blocked ? `⛔ Waiting on: ${task.dependsOn.title}` : `✓ After: ${task.dependsOn.title}`}
                  </p>
                )}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                  {next[col.key] && (
                    <button className="btn btn-sm" onClick={() => onStatusChange(task, next[col.key])} disabled={blocked && next[col.key] !== 'todo'}>
                      Move to {next[col.key]}
                    </button>
                  )}
                  <button className="btn btn-ghost btn-sm" onClick={() => onQuote(task)}>Quote</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => onDelete(task)} aria-label={`Delete ${task.title}`}>Delete</button>
                </div>
              </article>
            );
          })}
        </div>
      ))}
    </div>
  );
}
