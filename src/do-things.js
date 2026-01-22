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

// DOM elements - initialized after DOM loads
let userEmailSpan, signOutBtn;

// Host Ideas - initialized after DOM loads
let hostIdeasForm, hostIdeaInput, hostTimeframeInput, hostNotesInput, hostIdeasList;

// Events - initialized after DOM loads
let eventsForm, eventInput, eventDateInput, eventNotesInput;
let calendar, prevMonthBtn, nextMonthBtn, calendarMonthYear;
let eventModal, modalClose, modalEventTitle, modalEventDate, modalEventNotes;
let modalEditBtn, modalDeleteBtn;
let calendarViewBtn, listViewBtn, calendarContainer, eventsListContainer, eventsList;

let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let allEvents = [];
let selectedEvent = null;

// Things to Do - initialized after DOM loads
let thingsForm, thingInput, thingNotesInput, thingsList;

// Edit modals - initialized after DOM loads
let editEventModal, editEventForm, editEventNameInput, editEventDateInput, editEventNotesInput, editEventCancel;
let editHostIdeaModal, editHostIdeaForm, editHostIdeaInput, editHostTimeframeInput, editHostNotesInputModal, editHostIdeaCancel;
let editThingModal, editThingForm, editThingNameInput, editThingNotesInputModal, editThingCancel;

let currentUser = null;
let currentEditEventId = null;
let currentEditHostIdeaId = null;
let currentEditThingId = null;

// Initialize all DOM elements
function initDOMElements() {
  // Common elements
  userEmailSpan = document.getElementById('user-email');
  signOutBtn = document.getElementById('sign-out-btn');

  // Host Ideas
  hostIdeasForm = document.getElementById('host-ideas-form');
  hostIdeaInput = document.getElementById('host-idea-input');
  hostTimeframeInput = document.getElementById('host-timeframe-input');
  hostNotesInput = document.getElementById('host-notes-input');
  hostIdeasList = document.getElementById('host-ideas-list');

  // Events
  eventsForm = document.getElementById('events-form');
  eventInput = document.getElementById('event-input');
  eventDateInput = document.getElementById('event-date-input');
  eventNotesInput = document.getElementById('event-notes-input');
  calendar = document.getElementById('calendar');
  prevMonthBtn = document.getElementById('prev-month');
  nextMonthBtn = document.getElementById('next-month');
  calendarMonthYear = document.getElementById('calendar-month-year');
  eventModal = document.getElementById('event-modal');
  modalClose = document.getElementById('modal-close');
  modalEventTitle = document.getElementById('modal-event-title');
  modalEventDate = document.getElementById('modal-event-date');
  modalEventNotes = document.getElementById('modal-event-notes');
  modalEditBtn = document.getElementById('modal-edit-btn');
  modalDeleteBtn = document.getElementById('modal-delete-btn');
  calendarViewBtn = document.getElementById('calendar-view-btn');
  listViewBtn = document.getElementById('list-view-btn');
  calendarContainer = document.getElementById('calendar-container');
  eventsListContainer = document.getElementById('events-list-container');
  eventsList = document.getElementById('events-list');

  // Things to Do
  thingsForm = document.getElementById('things-form');
  thingInput = document.getElementById('thing-input');
  thingNotesInput = document.getElementById('thing-notes-input');
  thingsList = document.getElementById('things-list');

  // Edit Event Modal
  editEventModal = document.getElementById('edit-event-modal');
  editEventForm = document.getElementById('edit-event-form');
  editEventNameInput = document.getElementById('edit-event-name');
  editEventDateInput = document.getElementById('edit-event-date');
  editEventNotesInput = document.getElementById('edit-event-notes');
  editEventCancel = document.getElementById('edit-event-cancel');

  // Edit Host Idea Modal
  editHostIdeaModal = document.getElementById('edit-host-idea-modal');
  editHostIdeaForm = document.getElementById('edit-host-idea-form');
  editHostIdeaInput = document.getElementById('edit-host-idea');
  editHostTimeframeInput = document.getElementById('edit-host-timeframe');
  editHostNotesInputModal = document.getElementById('edit-host-notes');
  editHostIdeaCancel = document.getElementById('edit-host-idea-cancel');

  // Edit Thing Modal
  editThingModal = document.getElementById('edit-thing-modal');
  editThingForm = document.getElementById('edit-thing-form');
  editThingNameInput = document.getElementById('edit-thing-name');
  editThingNotesInputModal = document.getElementById('edit-thing-notes');
  editThingCancel = document.getElementById('edit-thing-cancel');

  // Setup all event listeners after DOM elements are ready
  setupEventListeners();
}

// Setup all event listeners
function setupEventListeners() {
  if (!prevMonthBtn || !nextMonthBtn || !eventModal) {
    console.error('Calendar elements not found for event listeners');
    return;
  }

  // Sign out button
  signOutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut();
  });

  // View toggle buttons
  calendarViewBtn.addEventListener('click', () => {
    calendarViewBtn.classList.add('active');
    listViewBtn.classList.remove('active');
    calendarContainer.classList.remove('hidden');
    eventsListContainer.classList.remove('show');
  });

  listViewBtn.addEventListener('click', () => {
    listViewBtn.classList.add('active');
    calendarViewBtn.classList.remove('active');
    eventsListContainer.classList.add('show');
    calendarContainer.classList.add('hidden');
    renderEventsList();
  });

  // Calendar navigation
  prevMonthBtn.addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }
    renderCalendar();
  });

  nextMonthBtn.addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    renderCalendar();
  });

  // Close modal
  modalClose.addEventListener('click', () => {
    eventModal.classList.remove('show');
    selectedEvent = null;
  });

  eventModal.addEventListener('click', (e) => {
    if (e.target.id === 'event-modal') {
      eventModal.classList.remove('show');
      selectedEvent = null;
    }
  });

  // Modal edit button - opens edit modal
  modalEditBtn.addEventListener('click', () => {
    if (!selectedEvent) return;

    // Store current edit ID
    currentEditEventId = selectedEvent.id;

    // Populate modal fields
    editEventNameInput.value = selectedEvent.event;
    editEventDateInput.value = selectedEvent.date;
    editEventNotesInput.value = selectedEvent.notes || '';

    // Close detail modal and open edit modal
    eventModal.classList.remove('show');
    editEventModal.classList.add('show');
  });

  // Edit Event Modal handlers
  editEventCancel.addEventListener('click', () => {
    editEventModal.classList.remove('show');
    currentEditEventId = null;
  });

  editEventModal.addEventListener('click', (e) => {
    if (e.target === editEventModal) {
      editEventModal.classList.remove('show');
      currentEditEventId = null;
    }
  });

  editEventForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentEditEventId) return;

    try {
      const { error } = await supabase
        .from('events')
        .update({
          event: editEventNameInput.value.trim(),
          date: editEventDateInput.value,
          notes: editEventNotesInput.value.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', currentEditEventId);

      if (error) throw error;

      editEventModal.classList.remove('show');
      currentEditEventId = null;
      selectedEvent = null;
      await loadEvents();
    } catch (error) {
      console.error('Error updating event:', error);
      alert('Failed to update event: ' + error.message);
    }
  });

  // Edit Host Idea Modal handlers
  editHostIdeaCancel.addEventListener('click', () => {
    editHostIdeaModal.classList.remove('show');
    currentEditHostIdeaId = null;
  });

  editHostIdeaModal.addEventListener('click', (e) => {
    if (e.target === editHostIdeaModal) {
      editHostIdeaModal.classList.remove('show');
      currentEditHostIdeaId = null;
    }
  });

  editHostIdeaForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentEditHostIdeaId) return;

    try {
      const { error } = await supabase
        .from('host_ideas')
        .update({
          idea: editHostIdeaInput.value.trim(),
          timeframe: editHostTimeframeInput.value.trim(),
          notes: editHostNotesInputModal.value.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', currentEditHostIdeaId);

      if (error) throw error;

      editHostIdeaModal.classList.remove('show');
      currentEditHostIdeaId = null;
      await loadHostIdeas();
    } catch (error) {
      console.error('Error updating host idea:', error);
      alert('Failed to update host idea: ' + error.message);
    }
  });

  // Edit Thing Modal handlers
  editThingCancel.addEventListener('click', () => {
    editThingModal.classList.remove('show');
    currentEditThingId = null;
  });

  editThingModal.addEventListener('click', (e) => {
    if (e.target === editThingModal) {
      editThingModal.classList.remove('show');
      currentEditThingId = null;
    }
  });

  editThingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentEditThingId) return;

    try {
      const { error } = await supabase
        .from('things_to_do')
        .update({
          thing: editThingNameInput.value.trim(),
          notes: editThingNotesInputModal.value.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', currentEditThingId);

      if (error) throw error;

      editThingModal.classList.remove('show');
      currentEditThingId = null;
      await loadThings();
    } catch (error) {
      console.error('Error updating thing:', error);
      alert('Failed to update thing: ' + error.message);
    }
  });

  // Modal delete button
  modalDeleteBtn.addEventListener('click', async () => {
    if (!selectedEvent) return;

    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', selectedEvent.id);

      if (error) throw error;

      eventModal.classList.remove('show');
      selectedEvent = null;
      await loadEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event: ' + error.message);
    }
  });

  // Add new event form submission
  eventsForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const event = eventInput.value.trim();
    const date = eventDateInput.value.trim();
    const notes = eventNotesInput.value.trim();

    if (!event || !date) return;

    try {
      const { error } = await supabase
        .from('events')
        .insert([{
          user_id: currentUser.id,
          event: event,
          date: date,
          notes: notes
        }]);

      if (error) throw error;

      // Clear form
      eventInput.value = '';
      eventDateInput.value = '';
      eventNotesInput.value = '';

      // Reload
      await loadEvents();
    } catch (error) {
      console.error('Error adding event:', error);
      alert('Failed to add event: ' + error.message);
    }
  });

  // Host Ideas form submission
  hostIdeasForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const idea = hostIdeaInput.value.trim();
    const timeframe = hostTimeframeInput.value.trim();
    const notes = hostNotesInput.value.trim();

    if (!idea || !timeframe) return;

    try {
      const { error } = await supabase
        .from('host_ideas')
        .insert([{
          user_id: currentUser.id,
          idea: idea,
          timeframe: timeframe,
          notes: notes
        }]);

      if (error) throw error;

      // Clear form
      hostIdeaInput.value = '';
      hostTimeframeInput.value = '';
      hostNotesInput.value = '';

      // Reload
      await loadHostIdeas();
    } catch (error) {
      console.error('Error adding host idea:', error);
      alert('Failed to add host idea: ' + error.message);
    }
  });

  // Things to Do form submission
  thingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const thing = thingInput.value.trim();
    const notes = thingNotesInput.value.trim();

    if (!thing) return;

    try {
      const { error } = await supabase
        .from('things_to_do')
        .insert([{
          user_id: currentUser.id,
          thing: thing,
          notes: notes
        }]);

      if (error) throw error;

      // Clear form
      thingInput.value = '';
      thingNotesInput.value = '';

      // Reload
      await loadThings();
    } catch (error) {
      console.error('Error adding thing:', error);
      alert('Failed to add thing: ' + error.message);
    }
  });
}

// Initialize app
async function init() {
  // Initialize DOM elements
  initDOMElements();

  // Check for existing session
  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    currentUser = session.user;
    userEmailSpan.textContent = currentUser.email;
    await Promise.all([
      loadHostIdeas(),
      loadEvents(),
      loadThings()
    ]);
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

// Helper function to escape HTML
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ==================== HOST IDEAS ====================

async function loadHostIdeas() {
  try {
    const { data, error } = await supabase
      .from('host_ideas')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: true });

    if (error) throw error;
    renderHostIdeas(data || []);
  } catch (error) {
    console.error('Error loading host ideas:', error);
    renderHostIdeas([]);
  }
}

function renderHostIdeas(hostIdeas) {
  if (hostIdeas.length === 0) {
    hostIdeasList.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; padding: 40px; color: #999;">
          No host ideas added yet
        </td>
      </tr>
    `;
    return;
  }

  hostIdeasList.innerHTML = hostIdeas.map(idea => `
    <tr>
      <td>${escapeHtml(idea.idea)}</td>
      <td>${escapeHtml(idea.timeframe)}</td>
      <td>${escapeHtml(idea.notes || '')}</td>
      <td>
        <div class="actions">
          <button class="btn-icon" onclick="editHostIdea('${idea.id}')" title="Edit">✏️</button>
          <button class="btn-icon btn-delete" onclick="deleteHostIdea('${idea.id}')" title="Delete">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

window.editHostIdea = async (id) => {
  const { data: hostIdea, error } = await supabase
    .from('host_ideas')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching host idea:', error);
    return;
  }

  // Store current edit ID
  currentEditHostIdeaId = id;

  // Populate modal fields
  editHostIdeaInput.value = hostIdea.idea;
  editHostTimeframeInput.value = hostIdea.timeframe;
  editHostNotesInputModal.value = hostIdea.notes || '';

  // Show modal
  editHostIdeaModal.classList.add('show');
};

window.deleteHostIdea = async (id) => {
  if (!confirm('Are you sure you want to delete this host idea?')) return;

  try {
    const { error } = await supabase
      .from('host_ideas')
      .delete()
      .eq('id', id);

    if (error) throw error;
    await loadHostIdeas();
  } catch (error) {
    console.error('Error deleting host idea:', error);
    alert('Failed to delete host idea: ' + error.message);
  }
};

// ==================== EVENTS ====================

async function loadEvents() {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('date', { ascending: true });

    if (error) throw error;
    allEvents = data || [];
    renderCalendar();
    // Also update list view if it's visible
    if (eventsListContainer && eventsListContainer.classList.contains('show')) {
      renderEventsList();
    }
  } catch (error) {
    console.error('Error loading events:', error);
    allEvents = [];
    renderCalendar();
    if (eventsListContainer && eventsListContainer.classList.contains('show')) {
      renderEventsList();
    }
  }
}

function renderCalendar() {
  if (!calendar || !calendarMonthYear) {
    console.error('Calendar elements not found!');
    return;
  }

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  calendarMonthYear.textContent = `${monthNames[currentMonth]} ${currentYear}`;

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  const today = new Date();
  const isCurrentMonth = today.getMonth() === currentMonth && today.getFullYear() === currentYear;
  const todayDate = today.getDate();

  let calendarHTML = `
    <div class="calendar-header">
      <div class="calendar-header-day">Sun</div>
      <div class="calendar-header-day">Mon</div>
      <div class="calendar-header-day">Tue</div>
      <div class="calendar-header-day">Wed</div>
      <div class="calendar-header-day">Thu</div>
      <div class="calendar-header-day">Fri</div>
      <div class="calendar-header-day">Sat</div>
    </div>
    <div class="calendar-grid">
  `;

  // Previous month days
  for (let i = firstDay - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    calendarHTML += `<div class="calendar-day other-month"><div class="calendar-day-number">${day}</div></div>`;
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayEvents = allEvents.filter(event => event.date === dateStr);

    const isToday = isCurrentMonth && day === todayDate;
    const todayClass = isToday ? 'today' : '';

    calendarHTML += `
      <div class="calendar-day ${todayClass}">
        <div class="calendar-day-number">${day}</div>
        ${dayEvents.map(event => `
          <div class="calendar-event" onclick="showEventModal('${event.id}')">
            ${escapeHtml(event.event)}
          </div>
        `).join('')}
      </div>
    `;
  }

  // Next month days to fill the grid
  const totalCells = firstDay + daysInMonth;
  const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (let day = 1; day <= remainingCells; day++) {
    calendarHTML += `<div class="calendar-day other-month"><div class="calendar-day-number">${day}</div></div>`;
  }

  calendarHTML += '</div>';
  calendar.innerHTML = calendarHTML;
}

// Show event details in modal
window.showEventModal = (eventId) => {
  selectedEvent = allEvents.find(e => e.id === eventId);
  if (!selectedEvent) return;

  modalEventTitle.textContent = selectedEvent.event;
  modalEventDate.textContent = new Date(selectedEvent.date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  modalEventNotes.textContent = selectedEvent.notes || 'No notes';

  eventModal.classList.add('show');
};

// Render events list view
function renderEventsList() {
  if (allEvents.length === 0) {
    eventsList.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; padding: 40px; color: #999;">
          No events added yet
        </td>
      </tr>
    `;
    return;
  }

  // Sort events by date
  const sortedEvents = [...allEvents].sort((a, b) => new Date(a.date) - new Date(b.date));

  eventsList.innerHTML = sortedEvents.map(event => {
    const formattedDate = new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    return `
      <tr>
        <td>${escapeHtml(event.event)}</td>
        <td>${formattedDate}</td>
        <td>${escapeHtml(event.notes || '')}</td>
        <td>
          <div class="actions">
            <button class="btn-icon" onclick="editEventFromList('${event.id}')" title="Edit">✏️</button>
            <button class="btn-icon btn-delete" onclick="deleteEventFromList('${event.id}')" title="Delete">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Edit event from list view
window.editEventFromList = async (id) => {
  const event = allEvents.find(e => e.id === id);
  if (!event) return;

  // Store current edit ID
  currentEditEventId = id;

  // Populate modal fields
  editEventNameInput.value = event.event;
  editEventDateInput.value = event.date;
  editEventNotesInput.value = event.notes || '';

  // Show edit modal
  editEventModal.classList.add('show');
};

// Delete event from list view
window.deleteEventFromList = async (id) => {
  if (!confirm('Are you sure you want to delete this event?')) return;

  try {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id);

    if (error) throw error;
    await loadEvents();
    renderEventsList();
  } catch (error) {
    console.error('Error deleting event:', error);
    alert('Failed to delete event: ' + error.message);
  }
};

// ==================== THINGS TO DO ====================

async function loadThings() {
  try {
    const { data, error } = await supabase
      .from('things_to_do')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: true });

    if (error) throw error;
    renderThings(data || []);
  } catch (error) {
    console.error('Error loading things:', error);
    renderThings([]);
  }
}

function renderThings(things) {
  if (things.length === 0) {
    thingsList.innerHTML = `
      <tr>
        <td colspan="3" style="text-align: center; padding: 40px; color: #999;">
          No things added yet
        </td>
      </tr>
    `;
    return;
  }

  thingsList.innerHTML = things.map(thing => `
    <tr>
      <td>${escapeHtml(thing.thing)}</td>
      <td>${escapeHtml(thing.notes || '')}</td>
      <td>
        <div class="actions">
          <button class="btn-icon" onclick="editThing('${thing.id}')" title="Edit">✏️</button>
          <button class="btn-icon btn-delete" onclick="deleteThing('${thing.id}')" title="Delete">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

window.editThing = async (id) => {
  const { data: thing, error } = await supabase
    .from('things_to_do')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching thing:', error);
    return;
  }

  // Store current edit ID
  currentEditThingId = id;

  // Populate modal fields
  editThingNameInput.value = thing.thing;
  editThingNotesInputModal.value = thing.notes || '';

  // Show modal
  editThingModal.classList.add('show');
};

window.deleteThing = async (id) => {
  if (!confirm('Are you sure you want to delete this thing?')) return;

  try {
    const { error } = await supabase
      .from('things_to_do')
      .delete()
      .eq('id', id);

    if (error) throw error;
    await loadThings();
  } catch (error) {
    console.error('Error deleting thing:', error);
    alert('Failed to delete thing: ' + error.message);
  }
};

// Initialize the app
init();
