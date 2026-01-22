import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/+esm';

// Supabase configuration
const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';

// Check if running in development with Vite, otherwise use window globals
const supabaseUrl = SUPABASE_URL || window.SUPABASE_URL;
const supabaseKey = SUPABASE_ANON_KEY || window.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase credentials not found. Please set SUPABASE_URL and SUPABASE_ANON_KEY in config.js');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// DOM elements
const userEmailSpan = document.getElementById('user-email');
const signOutBtn = document.getElementById('sign-out-btn');
const tasksList = document.getElementById('tasks-list');
const taskForm = document.getElementById('task-form');

let currentUser = null;
let currentTasks = [];

// Initialize app
async function init() {
  // Check for existing session
  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    currentUser = session.user;
    userEmailSpan.textContent = currentUser.email;
    await loadLongTermTasks();
  } else {
    // Redirect to login
    window.location.href = 'index.html';
  }

  // Listen for auth changes
  supabase.auth.onAuthStateChange((_event, session) => {
    if (!session) {
      window.location.href = 'index.html';
    }
  });
}

// Load long term tasks from database
async function loadLongTermTasks() {
  try {
    const { data, error } = await supabase
      .from('long_term_tasks')
      .select('content')
      .eq('user_id', currentUser.id)
      .single();

    if (error) {
      // If no tasks exist, create one with default content
      if (error.code === 'PGRST116') {
        await createDefaultLongTermTasks();
        return;
      }
      throw error;
    }

    if (data && data.content) {
      renderLongTermTasks(data.content);
    }
  } catch (error) {
    console.error('Error loading long term tasks:', error);
  }
}

// Create default long term tasks
async function createDefaultLongTermTasks() {
  try {
    const { data, error } = await supabase
      .from('long_term_tasks')
      .insert([{
        user_id: currentUser.id
      }])
      .select()
      .single();

    if (error) throw error;

    if (data && data.content) {
      renderLongTermTasks(data.content);
    }
  } catch (error) {
    console.error('Error creating default long term tasks:', error);
  }
}

// Render long term tasks content
function renderLongTermTasks(content) {
  currentTasks = content.tasks || [];

  if (currentTasks.length > 0) {
    tasksList.innerHTML = currentTasks
      .map((task, index) => {
        const priorityClass = {
          'Low': 'priority-low',
          'Medium': 'priority-medium',
          'High': 'priority-high'
        }[task.priority] || '';

        const effortClass = {
          'Low': 'effort-low',
          'Medium': 'effort-medium',
          'High': 'effort-high'
        }[task.effort] || '';

        const statusClass = {
          'TBD': 'status-tbd',
          'To Do': 'status-todo'
        }[task.status] || 'status-tbd';

        return `
          <tr>
            <td><strong>${escapeHtml(task.item)}</strong></td>
            <td class="${priorityClass}">${escapeHtml(task.priority)}</td>
            <td class="${effortClass}">${escapeHtml(task.effort)}</td>
            <td><span class="${statusClass}">${escapeHtml(task.status)}</span></td>
            <td>
              <div class="task-actions">
                <button class="btn-icon" onclick="editTask(${index})" title="Edit">✏️</button>
                <button class="btn-icon btn-delete" onclick="deleteTask(${index})" title="Delete">🗑️</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join('');
  } else {
    tasksList.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 40px; color: #999;">
          No long term tasks yet
        </td>
      </tr>
    `;
  }
}

// Sign out
signOutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut();
});

// Add new task
taskForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const item = document.getElementById('task-item').value;
  const priority = document.getElementById('task-priority').value;
  const effort = document.getElementById('task-effort').value;
  const status = document.getElementById('task-status').value;

  const newTask = { item, priority, effort, status };
  currentTasks.push(newTask);

  try {
    const { error } = await supabase
      .from('long_term_tasks')
      .update({
        content: { tasks: currentTasks },
        updated_at: new Date().toISOString()
      })
      .eq('user_id', currentUser.id);

    if (error) throw error;

    // Clear form
    taskForm.reset();

    // Reload tasks
    await loadLongTermTasks();
  } catch (error) {
    console.error('Error adding task:', error);
    alert('Failed to add task: ' + error.message);
  }
});

// Edit task
window.editTask = async (index) => {
  const task = currentTasks[index];
  const newItem = prompt('Enter new task name:', task.item);
  if (newItem === null) return;

  const newPriority = prompt('Enter priority (Low, Medium, High):', task.priority);
  if (newPriority === null) return;

  const newEffort = prompt('Enter effort (Low, Medium, High):', task.effort);
  if (newEffort === null) return;

  const newStatus = prompt('Enter status (TBD, To Do):', task.status);
  if (newStatus === null) return;

  currentTasks[index] = {
    item: newItem,
    priority: newPriority,
    effort: newEffort,
    status: newStatus
  };

  try {
    const { error } = await supabase
      .from('long_term_tasks')
      .update({
        content: { tasks: currentTasks },
        updated_at: new Date().toISOString()
      })
      .eq('user_id', currentUser.id);

    if (error) throw error;

    await loadLongTermTasks();
  } catch (error) {
    console.error('Error updating task:', error);
    alert('Failed to update task: ' + error.message);
  }
};

// Delete task
window.deleteTask = async (index) => {
  if (!confirm('Are you sure you want to delete this task?')) return;

  currentTasks.splice(index, 1);

  try {
    const { error } = await supabase
      .from('long_term_tasks')
      .update({
        content: { tasks: currentTasks },
        updated_at: new Date().toISOString()
      })
      .eq('user_id', currentUser.id);

    if (error) throw error;

    await loadLongTermTasks();
  } catch (error) {
    console.error('Error deleting task:', error);
    alert('Failed to delete task: ' + error.message);
  }
};

// Helper function to escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize the app
init();
