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
const interestsList = document.getElementById('interests-list');

let currentUser = null;

// Initialize app
async function init() {
  // Check for existing session
  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    currentUser = session.user;
    userEmailSpan.textContent = currentUser.email;
    await loadInterests();
  } else {
    // Redirect to login
    window.location.href = '/index.html';
  }

  // Listen for auth changes
  supabase.auth.onAuthStateChange((_event, session) => {
    if (!session) {
      window.location.href = '/index.html';
    }
  });
}

// Load interests from database
async function loadInterests() {
  try {
    const { data, error } = await supabase
      .from('interests')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    renderInterests(data || []);
  } catch (error) {
    console.error('Error loading interests:', error);
    renderInterests([]);
  }
}

// Render interests in the table
function renderInterests(interests) {
  if (interests.length === 0) {
    interestsList.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 40px; color: #999;">
          No interests added yet
        </td>
      </tr>
    `;
    return;
  }

  interestsList.innerHTML = interests.map(interest => {
    const interestTrimmed = interest.interest.trim().toLowerCase();
    let interestDisplay;

    if (interestTrimmed === 'cooking') {
      const interestName = escapeHtml(interest.interest);
      interestDisplay = `<a href="https://docs.google.com/document/d/1w0yDETTAUXFTatVWqygsC0J5ZHQjXRYx5mFKaQF66F4/edit?usp=sharing" target="_blank" rel="noopener noreferrer" style="color: #4a90e2; text-decoration: underline;">${interestName}</a>`;
    } else {
      interestDisplay = escapeHtml(interest.interest);
    }

    return `
      <tr>
        <td>${interestDisplay}</td>
        <td>${escapeHtml(interest.q_goal || '')}</td>
        <td>${escapeHtml(interest.yearlong_goal || '')}</td>
        <td>${escapeHtml(interest.notes || '')}</td>
        <td>
          <div class="interest-actions">
            <button class="btn-icon" onclick="editInterest('${interest.id}')" title="Edit">✏️</button>
            <button class="btn-icon btn-delete" onclick="deleteInterest('${interest.id}')" title="Delete">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Helper function to escape HTML
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Edit interest
window.editInterest = async (id) => {
  const { data: interest, error } = await supabase
    .from('interests')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching interest:', error);
    return;
  }

  const newInterest = prompt('Enter interest:', interest.interest);
  if (newInterest === null) return;

  const newQGoal = prompt('Enter Q goal:', interest.q_goal || '');
  if (newQGoal === null) return;

  const newYearlongGoal = prompt('Enter yearlong goal:', interest.yearlong_goal || '');
  if (newYearlongGoal === null) return;

  const newNotes = prompt('Enter notes:', interest.notes || '');
  if (newNotes === null) return;

  try {
    const { error: updateError } = await supabase
      .from('interests')
      .update({
        interest: newInterest,
        q_goal: newQGoal,
        yearlong_goal: newYearlongGoal,
        notes: newNotes,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) throw updateError;

    await loadInterests();
  } catch (error) {
    console.error('Error updating interest:', error);
    alert('Failed to update interest: ' + error.message);
  }
};

// Delete interest
window.deleteInterest = async (id) => {
  if (!confirm('Are you sure you want to delete this interest?')) return;

  try {
    const { error } = await supabase
      .from('interests')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await loadInterests();
  } catch (error) {
    console.error('Error deleting interest:', error);
    alert('Failed to delete interest: ' + error.message);
  }
};

// Sign out
signOutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut();
});

// Initialize the app
init();
