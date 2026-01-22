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
const ideasList = document.getElementById('ideas-list');
const ideaForm = document.getElementById('idea-form');
const ideaTextInput = document.getElementById('idea-text');
const ideaNotesInput = document.getElementById('idea-notes');

// Edit modal elements
const editModal = document.getElementById('edit-modal');
const editForm = document.getElementById('edit-form');
const editIdeaInput = document.getElementById('edit-idea');
const editNotesInput = document.getElementById('edit-notes');
const editCancel = document.getElementById('edit-cancel');

let currentUser = null;
let currentEditId = null;

// Initialize app
async function init() {
  // Check for existing session
  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    currentUser = session.user;
    userEmailSpan.textContent = currentUser.email;
    await loadIdeas();
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

// Load ideas from database
async function loadIdeas() {
  try {
    const { data, error } = await supabase
      .from('idea_store')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    renderIdeas(data || []);
  } catch (error) {
    console.error('Error loading ideas:', error);
    renderIdeas([]);
  }
}

// Render ideas in the table
function renderIdeas(ideas) {
  if (ideas.length === 0) {
    ideasList.innerHTML = `
      <tr>
        <td colspan="3" style="text-align: center; padding: 40px; color: #999;">
          No ideas added yet
        </td>
      </tr>
    `;
    return;
  }

  ideasList.innerHTML = ideas.map(idea => `
    <tr>
      <td>${escapeHtml(idea.idea)}</td>
      <td>${escapeHtml(idea.notes || '')}</td>
      <td>
        <div class="idea-actions">
          <button class="btn-icon" onclick="editIdea('${idea.id}')" title="Edit">✏️</button>
          <button class="btn-icon btn-delete" onclick="deleteIdea('${idea.id}')" title="Delete">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// Helper function to escape HTML
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Edit idea - open modal
window.editIdea = async (id) => {
  const { data: idea, error } = await supabase
    .from('idea_store')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching idea:', error);
    return;
  }

  // Store current edit ID
  currentEditId = id;

  // Populate modal fields
  editIdeaInput.value = idea.idea;
  editNotesInput.value = idea.notes || '';

  // Show modal
  editModal.classList.add('show');
};

// Close modal
editCancel.addEventListener('click', () => {
  editModal.classList.remove('show');
  currentEditId = null;
});

// Close modal on overlay click
editModal.addEventListener('click', (e) => {
  if (e.target === editModal) {
    editModal.classList.remove('show');
    currentEditId = null;
  }
});

// Handle edit form submission
editForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!currentEditId) return;

  const newIdea = editIdeaInput.value.trim();
  const newNotes = editNotesInput.value.trim();

  try {
    const { error: updateError } = await supabase
      .from('idea_store')
      .update({
        idea: newIdea,
        notes: newNotes,
        updated_at: new Date().toISOString()
      })
      .eq('id', currentEditId);

    if (updateError) throw updateError;

    // Close modal
    editModal.classList.remove('show');
    currentEditId = null;

    await loadIdeas();
  } catch (error) {
    console.error('Error updating idea:', error);
    alert('Failed to update idea: ' + error.message);
  }
});

// Delete idea
window.deleteIdea = async (id) => {
  if (!confirm('Are you sure you want to delete this idea?')) return;

  try {
    const { error } = await supabase
      .from('idea_store')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await loadIdeas();
  } catch (error) {
    console.error('Error deleting idea:', error);
    alert('Failed to delete idea: ' + error.message);
  }
};

// Add new idea
ideaForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const idea = ideaTextInput.value.trim();
  const notes = ideaNotesInput.value.trim();

  if (!idea) return;

  try {
    const { error } = await supabase
      .from('idea_store')
      .insert([{
        user_id: currentUser.id,
        idea: idea,
        notes: notes
      }]);

    if (error) throw error;

    // Clear form
    ideaTextInput.value = '';
    ideaNotesInput.value = '';

    // Reload ideas
    await loadIdeas();
  } catch (error) {
    console.error('Error adding idea:', error);
    alert('Failed to add idea: ' + error.message);
  }
});

// Sign out
signOutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut();
});

// Initialize the app
init();
