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
const currentTimeSpan = document.getElementById('current-time');
const workDayTitle = document.getElementById('work-day-title');
const workDaySchedule = document.getElementById('work-day-schedule');
const wfhDayTitle = document.getElementById('wfh-day-title');
const wfhDaySchedule = document.getElementById('wfh-day-schedule');
const workoutSchedule = document.getElementById('workout-schedule');

let currentUser = null;
let currentRoutine = null;

// Update current time
function updateCurrentTime() {
  const now = new Date();
  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';

  // Convert to 12-hour format
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 should be 12

  // Get day and date
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayName = days[now.getDay()];
  const monthName = months[now.getMonth()];
  const date = now.getDate();

  currentTimeSpan.textContent = `${dayName}, ${monthName} ${date} - ${hours}:${minutes} ${ampm}`;
}

// Update time immediately and then every second
updateCurrentTime();
setInterval(updateCurrentTime, 1000);

// Initialize app
async function init() {
  // Check for existing session
  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    currentUser = session.user;
    userEmailSpan.textContent = currentUser.email;
    await loadMorningRoutine();
  } else {
    // Redirect to login
    window.location.href = '/index.html';
  }

  // Listen for auth changes
  supabase.auth.onAuthStateChange((event, session) => {
    if (!session) {
      window.location.href = '/index.html';
    }
  });
}

// Load morning routine from database
async function loadMorningRoutine() {
  try {
    const { data, error } = await supabase
      .from('morning_routine')
      .select('content')
      .eq('user_id', currentUser.id)
      .single();

    if (error) {
      // If no routine exists, create one with default content
      if (error.code === 'PGRST116') {
        await createDefaultMorningRoutine();
        return;
      }
      throw error;
    }

    if (data && data.content) {
      renderMorningRoutine(data.content);
    }
  } catch (error) {
    console.error('Error loading morning routine:', error);
  }
}

// Create default morning routine
async function createDefaultMorningRoutine() {
  try {
    const { data, error } = await supabase
      .from('morning_routine')
      .insert([{
        user_id: currentUser.id
      }])
      .select()
      .single();

    if (error) throw error;

    if (data && data.content) {
      renderMorningRoutine(data.content);
    }
  } catch (error) {
    console.error('Error creating default morning routine:', error);
  }
}

// Render morning routine content
function renderMorningRoutine(content) {
  currentRoutine = content;

  // Render work day schedule
  if (content.workDays) {
    workDayTitle.textContent = content.workDays.title;
    workDaySchedule.innerHTML = content.workDays.schedule
      .map(item => `
        <div class="schedule-item">
          ${escapeHtml(item)}
        </div>
      `)
      .join('');
  }

  // Render WFH day schedule
  if (content.wfhDays) {
    wfhDayTitle.textContent = content.wfhDays.title;
    wfhDaySchedule.innerHTML = content.wfhDays.schedule
      .map(item => `
        <div class="schedule-item">
          ${escapeHtml(item)}
        </div>
      `)
      .join('');
  }

  // Render workout schedule
  if (content.workoutSchedule) {
    workoutSchedule.innerHTML = content.workoutSchedule
      .map((workout, index) => `
        <tr>
          <td class="dow-cell">${escapeHtml(workout.dow)}</td>
          <td>${escapeHtml(workout.workout)}</td>
          <td>${escapeHtml(workout.notes)}</td>
          <td>
            <div>
              <button class="edit-btn" onclick="editWorkout(${index})" title="Edit">✏️</button>
              <button class="edit-btn delete-btn" onclick="deleteWorkout(${index})" title="Delete">🗑️</button>
            </div>
          </td>
        </tr>
      `)
      .join('');
  }
}

// Sign out
signOutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut();
});

// Edit schedule title
window.editSchedule = async (type) => {
  const schedule = currentRoutine[type];
  const newTitle = prompt('Enter schedule title:', schedule.title);
  if (newTitle === null) return;

  currentRoutine[type].title = newTitle;
  await saveRoutine();
};

// Edit schedule item
window.editScheduleItem = async (type, index) => {
  const schedule = currentRoutine[type];
  const newItem = prompt('Enter schedule item:', schedule.schedule[index]);
  if (newItem === null) return;

  currentRoutine[type].schedule[index] = newItem;
  await saveRoutine();
};

// Edit workout
window.editWorkout = async (index) => {
  const workout = currentRoutine.workoutSchedule[index];

  const newDow = prompt('Enter day of week:', workout.dow);
  if (newDow === null) return;

  const newWorkout = prompt('Enter workout:', workout.workout);
  if (newWorkout === null) return;

  const newNotes = prompt('Enter notes:', workout.notes);
  if (newNotes === null) return;

  currentRoutine.workoutSchedule[index] = {
    dow: newDow,
    workout: newWorkout,
    notes: newNotes
  };

  await saveRoutine();
};

// Delete workout
window.deleteWorkout = async (index) => {
  if (!confirm('Are you sure you want to delete this workout?')) return;

  currentRoutine.workoutSchedule.splice(index, 1);
  await saveRoutine();
};

// Save routine
async function saveRoutine() {
  try {
    const { error } = await supabase
      .from('morning_routine')
      .update({
        content: currentRoutine,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', currentUser.id);

    if (error) throw error;

    await loadMorningRoutine();
  } catch (error) {
    console.error('Error saving routine:', error);
    alert('Failed to save changes: ' + error.message);
  }
}

// Helper function to escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize the app
init();
