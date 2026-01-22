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
const authScreen = document.getElementById('auth-screen');
const appScreen = document.getElementById('app-screen');
const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const authSubtitle = document.getElementById('auth-subtitle');
const authButton = document.getElementById('auth-button');
const toggleText = document.getElementById('toggle-text');
const toggleLink = document.getElementById('toggle-link');
const errorMessage = document.getElementById('error-message');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const userEmailSpan = document.getElementById('user-email');
const signOutBtn = document.getElementById('sign-out-btn');
const taskForm = document.getElementById('task-form');
const tasksList = document.getElementById('tasks-list');

let isSignUp = false;
let currentUser = null;
let currentTasks = [];
let currentSort = { column: null, direction: null };

// Initialize app
async function init() {
  // Check for existing session
  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    currentUser = session.user;
    showApp();
  } else {
    showAuth();
  }

  // Listen for auth changes
  supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
      currentUser = session.user;
      // Redirect to landing page on new sign in
      if (event === 'SIGNED_IN') {
        window.location.href = 'landing.html';
      } else {
        showApp();
      }
    } else {
      currentUser = null;
      showAuth();
    }
  });
}

// Show auth screen
function showAuth() {
  authScreen.style.display = 'flex';
  appScreen.classList.remove('show');
}

// Show app screen
function showApp() {
  authScreen.style.display = 'none';
  appScreen.classList.add('show');
  userEmailSpan.textContent = currentUser.email;
  loadTasks();
  initializeSorting();
  initializeModalListeners();
}

// Toggle between sign in and sign up
toggleLink.addEventListener('click', () => {
  isSignUp = !isSignUp;

  if (isSignUp) {
    authTitle.textContent = 'Sign Up';
    authSubtitle.textContent = 'Create your account';
    authButton.textContent = 'Sign Up';
    toggleText.textContent = 'Already have an account?';
    toggleLink.textContent = 'Sign In';
  } else {
    authTitle.textContent = 'Sign In';
    authSubtitle.textContent = 'Access your task manager';
    authButton.textContent = 'Sign In';
    toggleText.textContent = "Don't have an account?";
    toggleLink.textContent = 'Sign Up';
  }

  hideError();
});

// Handle auth form submission
authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError();

  const email = emailInput.value;
  const password = passwordInput.value;

  authButton.disabled = true;
  authButton.textContent = isSignUp ? 'Signing Up...' : 'Signing In...';

  try {
    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      if (data.user && data.user.identities && data.user.identities.length === 0) {
        showError('This email is already registered. Please sign in instead.');
        isSignUp = false;
        toggleLink.click();
      } else {
        showError('Check your email for the confirmation link!', false);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
    }
  } catch (error) {
    showError(error.message);
  } finally {
    authButton.disabled = false;
    authButton.textContent = isSignUp ? 'Sign Up' : 'Sign In';
  }
});

// Sign out
signOutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut();
});

// Show error message
function showError(message, isError = true) {
  errorMessage.textContent = message;
  errorMessage.style.background = isError ? '#fee' : '#d1e7dd';
  errorMessage.style.color = isError ? '#c33' : '#0f5132';
  errorMessage.classList.add('show');
}

// Hide error message
function hideError() {
  errorMessage.classList.remove('show');
}

// Load tasks from database
async function loadTasks() {
  try {
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    currentTasks = tasks;

    // Sort by priority (Days first) by default
    const priorityOrder = { 'Days': 1, 'Weeks': 2, 'Months': 3 };
    const sortedTasks = [...currentTasks].sort((a, b) => {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    currentSort.column = 'priority';
    currentSort.direction = 'asc';
    renderTasks(sortedTasks);
    updateSortIndicators();
  } catch (error) {
    console.error('Error loading tasks:', error);
    showError('Failed to load tasks');
  }
}

// Render tasks in the table
function renderTasks(tasks) {
  if (tasks.length === 0) {
    tasksList.innerHTML = `
      <tr>
        <td colspan="5">
          <div class="empty-state">
            <h3>No tasks yet</h3>
            <p>Add your first task above to get started</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tasksList.innerHTML = tasks.map(task => {
    const statusClass = {
      'To Do': 'status-todo',
      'In Progress': 'status-progress',
      'Block': 'status-block',
      'Completed': 'status-completed'
    }[task.status];

    const priorityClass = {
      'Days': 'priority-days',
      'Weeks': 'priority-weeks',
      'Months': 'priority-months'
    }[task.priority];

    const effortClass = {
      'Low': 'effort-low',
      'Medium': 'effort-medium',
      'High': 'effort-high'
    }[task.effort];

    const blockReason = task.block_reason ? `<div class="block-reason">(${escapeHtml(task.block_reason)})</div>` : '';

    return `
      <tr>
        <td>
          <strong>${escapeHtml(task.item)}</strong>
        </td>
        <td class="${priorityClass}">${task.priority}</td>
        <td class="${effortClass}">${task.effort}</td>
        <td>
          <span class="status-badge ${statusClass}">${task.status}</span>
          ${blockReason}
        </td>
        <td>
          <div class="task-actions">
            <button class="btn-icon" onclick="editTask('${task.id}')" title="Edit">✏️</button>
            <button class="btn-icon btn-delete" onclick="deleteTask('${task.id}')" title="Delete">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Add new task
taskForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const item = document.getElementById('task-item').value;
  const priority = document.getElementById('task-priority').value;
  const effort = document.getElementById('task-effort').value;
  const status = document.getElementById('task-status').value;
  const blockReason = document.getElementById('task-block-reason').value;

  try {
    const { error } = await supabase
      .from('tasks')
      .insert([{
        user_id: currentUser.id,
        item,
        priority,
        effort,
        status,
        block_reason: blockReason || null
      }]);

    if (error) throw error;

    // Clear form
    taskForm.reset();

    // Reload tasks
    loadTasks();
  } catch (error) {
    console.error('Error adding task:', error);
    alert('Failed to add task: ' + error.message);
  }
});

// Delete task
window.deleteTask = async (taskId) => {
  if (!confirm('Are you sure you want to delete this task?')) return;

  try {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) throw error;

    loadTasks();
  } catch (error) {
    console.error('Error deleting task:', error);
    alert('Failed to delete task: ' + error.message);
  }
};

// Edit task with modal
let currentEditTaskId = null;

window.editTask = async (taskId) => {
  console.log('editTask called with ID:', taskId);
  currentEditTaskId = taskId;

  // Fetch task data
  try {
    const { data: task, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (error) throw error;

    console.log('Task data fetched:', task);

    // Populate modal
    document.getElementById('edit-item').value = task.item;
    document.getElementById('edit-priority').value = task.priority;
    document.getElementById('edit-effort').value = task.effort;
    document.getElementById('edit-status').value = task.status;
    document.getElementById('edit-block-reason').value = task.block_reason || '';

    // Show/hide block reason based on status
    toggleBlockReasonField(task.status);

    // Show modal
    const modal = document.getElementById('edit-modal');
    console.log('Modal element:', modal);
    modal.classList.add('show');
    console.log('Modal should now be visible');
  } catch (error) {
    console.error('Error fetching task:', error);
    alert('Failed to load task: ' + error.message);
  }
};

// Toggle block reason field visibility
function toggleBlockReasonField(status) {
  const blockReasonContainer = document.getElementById('edit-block-reason-container');
  if (status === 'Block') {
    blockReasonContainer.style.display = 'block';
  } else {
    blockReasonContainer.style.display = 'none';
  }
}

// Initialize modal event listeners (wait for DOM to be ready)
function initializeModalListeners() {
  console.log('Initializing modal listeners...');
  const editCancel = document.getElementById('edit-cancel');
  const editModal = document.getElementById('edit-modal');
  const editStatus = document.getElementById('edit-status');
  const editForm = document.getElementById('edit-form');

  console.log('Modal elements found:', { editCancel, editModal, editStatus, editForm });

  if (!editCancel || !editModal || !editStatus || !editForm) {
    console.error('Modal elements not found!');
    return;
  }

  console.log('All modal elements found successfully');

  // Close modal
  editCancel.addEventListener('click', () => {
    editModal.classList.remove('show');
    currentEditTaskId = null;
  });

  // Close modal on overlay click
  editModal.addEventListener('click', (e) => {
    if (e.target.id === 'edit-modal') {
      editModal.classList.remove('show');
      currentEditTaskId = null;
    }
  });

  // Watch status changes in edit form
  editStatus.addEventListener('change', (e) => {
    toggleBlockReasonField(e.target.value);
  });

  // Handle edit form submission
  editForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!currentEditTaskId) return;

    const item = document.getElementById('edit-item').value.trim();
    const priority = document.getElementById('edit-priority').value;
    const effort = document.getElementById('edit-effort').value;
    const status = document.getElementById('edit-status').value;
    const blockReason = document.getElementById('edit-block-reason').value.trim();

    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          item,
          priority,
          effort,
          status,
          block_reason: status === 'Block' ? blockReason : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentEditTaskId);

      if (error) throw error;

      // Close modal
      document.getElementById('edit-modal').classList.remove('show');
      currentEditTaskId = null;

      // Reload tasks
      loadTasks();
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Failed to update task: ' + error.message);
    }
  });
}

// Helper function to escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Sort tasks
function sortTasks(column) {
  // Define sort orders
  const priorityOrder = { 'Days': 1, 'Weeks': 2, 'Months': 3 };
  const effortOrder = { 'High': 1, 'Medium': 2, 'Low': 3 };
  const statusOrder = { 'Block': 1, 'In Progress': 2, 'To Do': 3, 'Completed': 4 };

  // Determine sort direction
  if (currentSort.column === column) {
    // Toggle direction
    if (currentSort.direction === 'asc') {
      currentSort.direction = 'desc';
    } else if (currentSort.direction === 'desc') {
      // Reset to no sort
      currentSort.column = null;
      currentSort.direction = null;
      renderTasks(currentTasks);
      updateSortIndicators();
      return;
    }
  } else {
    currentSort.column = column;
    currentSort.direction = 'asc';
  }

  // Sort the tasks
  const sortedTasks = [...currentTasks].sort((a, b) => {
    let aVal, bVal;

    if (column === 'priority') {
      aVal = priorityOrder[a.priority];
      bVal = priorityOrder[b.priority];
    } else if (column === 'effort') {
      aVal = effortOrder[a.effort];
      bVal = effortOrder[b.effort];
    } else if (column === 'status') {
      aVal = statusOrder[a.status];
      bVal = statusOrder[b.status];
    }

    if (currentSort.direction === 'asc') {
      return aVal - bVal;
    } else {
      return bVal - aVal;
    }
  });

  renderTasks(sortedTasks);
  updateSortIndicators();
}

// Update sort indicator arrows
function updateSortIndicators() {
  document.querySelectorAll('.tasks-table th.sortable').forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc');
    const column = th.dataset.sort;
    if (currentSort.column === column) {
      th.classList.add(currentSort.direction === 'asc' ? 'sort-asc' : 'sort-desc');
    }
  });
}

// Add click handlers to sortable columns
function initializeSorting() {
  const sortableHeaders = document.querySelectorAll('.tasks-table th.sortable');

  sortableHeaders.forEach(th => {
    th.addEventListener('click', () => {
      const column = th.dataset.sort;
      sortTasks(column);
    });
  });
}

// Initialize the app
init();
