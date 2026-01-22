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
const leftColumn = document.getElementById('left-column');
const habitsList = document.getElementById('habits-list');

let currentUser = null;
let currentContent = null;

// Initialize
async function init() {
  // Check for existing session
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    // Redirect to index.html if not authenticated
    window.location.href = '/index.html';
    return;
  }

  currentUser = session.user;
  userEmailSpan.textContent = currentUser.email;
  await loadLandingPage();

  // Listen for auth changes
  supabase.auth.onAuthStateChange((_event, session) => {
    if (!session) {
      window.location.href = '/index.html';
    }
  });
}

// Load landing page content
async function loadLandingPage() {
  try {
    const { data, error } = await supabase
      .from('landing_page')
      .select('content')
      .eq('user_id', currentUser.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        await createDefaultLandingPage();
        return;
      }
      throw error;
    }

    if (data && data.content) {
      renderLandingPage(data.content);
    }
  } catch (error) {
    console.error('Error loading landing page:', error);
  }
}

// Create default landing page
async function createDefaultLandingPage() {
  try {
    const { data, error } = await supabase
      .from('landing_page')
      .insert([{
        user_id: currentUser.id
      }])
      .select()
      .single();

    if (error) throw error;

    if (data && data.content) {
      renderLandingPage(data.content);
    }
  } catch (error) {
    console.error('Error creating default landing page:', error);
  }
}

// Render landing page content
function renderLandingPage(content) {
  currentContent = content;

  // Render left column sections
  if (content.sections) {
    const leftSections = content.sections.filter(s => s.title !== 'Habits');
    leftColumn.innerHTML = leftSections
      .map((section, index) => `
        <div class="section">
          <button class="edit-btn" onclick="editSection(${index})" title="Edit section">✏️</button>
          <h2>${escapeHtml(section.title)}</h2>
          <div class="section-items">
            ${section.items.map(item => `
              <div class="section-item">${escapeHtml(item)}</div>
            `).join('')}
          </div>
        </div>
      `)
      .join('');

    // Render habits
    const habitsSection = content.sections.find(s => s.title === 'Habits');
    if (habitsSection) {
      habitsList.innerHTML = habitsSection.items
        .map((habit, index) => `
          <div class="habit-item">
            ${escapeHtml(habit)}
            <button class="edit-btn inline-edit-btn" onclick="editHabit(${index})" title="Edit habit">✏️</button>
          </div>
        `)
        .join('');
    }
  }
}

// Edit section
window.editSection = async (index) => {
  const leftSections = currentContent.sections.filter(s => s.title !== 'Habits');
  const section = leftSections[index];

  const newTitle = prompt('Enter section title:', section.title);
  if (newTitle === null) return;

  const newItems = prompt('Enter items (comma separated):', section.items.join(', '));
  if (newItems === null) return;

  const realIndex = currentContent.sections.findIndex(s => s.title === section.title);
  currentContent.sections[realIndex] = {
    title: newTitle,
    items: newItems.split(',').map(item => item.trim())
  };

  await saveContent();
};

// Edit habit
window.editHabit = async (index) => {
  const habitsSection = currentContent.sections.find(s => s.title === 'Habits');
  const newHabit = prompt('Enter habit:', habitsSection.items[index]);
  if (newHabit === null) return;

  habitsSection.items[index] = newHabit;
  await saveContent();
};

// Save content
async function saveContent() {
  try {
    const { error } = await supabase
      .from('landing_page')
      .update({
        content: currentContent,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', currentUser.id);

    if (error) throw error;

    await loadLandingPage();
  } catch (error) {
    console.error('Error saving content:', error);
    alert('Failed to save changes: ' + error.message);
  }
}

// Helper function to escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Sign out
signOutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut();
  window.location.href = '/index.html';
});

// Initialize the app
init();
