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
const publicationsList = document.getElementById('publications-list');
const publicationForm = document.getElementById('publication-form');
const publicationNameInput = document.getElementById('publication-name');
const publicationCategoryInput = document.getElementById('publication-category');
const publicationLinkInput = document.getElementById('publication-link');
const gmailForm = document.getElementById('gmail-form');
const gmailInput = document.getElementById('gmail-input');

let currentUser = null;

// Initialize app
async function init() {
  // Check for existing session
  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    currentUser = session.user;
    userEmailSpan.textContent = currentUser.email;
    await loadPublications();
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

// Helper function to escape HTML
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ==================== PUBLICATIONS ====================

async function loadPublications() {
  try {
    const { data, error } = await supabase
      .from('publications')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: true });

    if (error) throw error;
    renderPublications(data || []);
  } catch (error) {
    console.error('Error loading publications:', error);
    renderPublications([]);
  }
}

function renderPublications(publications) {
  if (publications.length === 0) {
    publicationsList.innerHTML = `
      <tr>
        <td colspan="3" style="text-align: center; padding: 40px; color: #999;">
          No publications added yet
        </td>
      </tr>
    `;
    return;
  }

  publicationsList.innerHTML = publications.map(pub => `
    <tr>
      <td><a href="${escapeHtml(pub.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(pub.name)}</a></td>
      <td>${escapeHtml(pub.category)}</td>
      <td>
        <div class="actions">
          <button class="btn-icon" onclick="editPublication('${pub.id}')" title="Edit">✏️</button>
          <button class="btn-icon btn-delete" onclick="deletePublication('${pub.id}')" title="Delete">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

publicationForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = publicationNameInput.value.trim();
  const category = publicationCategoryInput.value.trim();
  const link = publicationLinkInput.value.trim();

  if (!name || !category || !link) return;

  try {
    const { error } = await supabase
      .from('publications')
      .insert([{
        user_id: currentUser.id,
        name: name,
        category: category,
        link: link
      }]);

    if (error) throw error;

    // Clear form
    publicationNameInput.value = '';
    publicationCategoryInput.value = '';
    publicationLinkInput.value = '';

    // Reload
    await loadPublications();
  } catch (error) {
    console.error('Error adding publication:', error);
    alert('Failed to add publication: ' + error.message);
  }
});

window.editPublication = async (id) => {
  const { data: publication, error } = await supabase
    .from('publications')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching publication:', error);
    return;
  }

  const newName = prompt('Enter publication name:', publication.name);
  if (newName === null) return;

  const newCategory = prompt('Enter category:', publication.category);
  if (newCategory === null) return;

  const newLink = prompt('Enter link (URL):', publication.link);
  if (newLink === null) return;

  try {
    const { error: updateError } = await supabase
      .from('publications')
      .update({
        name: newName,
        category: newCategory,
        link: newLink,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) throw updateError;
    await loadPublications();
  } catch (error) {
    console.error('Error updating publication:', error);
    alert('Failed to update publication: ' + error.message);
  }
};

window.deletePublication = async (id) => {
  console.log('Delete publication called with id:', id);

  if (!confirm('Are you sure you want to delete this publication?')) {
    console.log('User cancelled delete');
    return;
  }

  try {
    console.log('Attempting to delete publication:', id);
    const { error } = await supabase
      .from('publications')
      .delete()
      .eq('id', id);

    if (error) throw error;
    console.log('Publication deleted successfully');
    await loadPublications();
  } catch (error) {
    console.error('Error deleting publication:', error);
    alert('Failed to delete publication: ' + error.message);
  }
};

// ==================== GMAIL SHORTCUT ====================

gmailForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const email = gmailInput.value.trim();

  if (!email) return;

  // Validate email format
  if (!email.match(/^[a-zA-Z0-9._%+-]+@gmail\.com$/)) {
    alert('Please enter a valid Gmail address');
    return;
  }

  // Open Gmail inbox in new tab with security attributes
  // Format: https://mail.google.com/mail/u/email@gmail.com
  window.open(`https://mail.google.com/mail/u/${encodeURIComponent(email)}`, '_blank', 'noopener,noreferrer');
});

// Sign out
signOutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut();
});

// Initialize the app
init();
