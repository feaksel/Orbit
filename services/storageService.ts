
import { Person, Circle, Interaction, InteractionType, Task } from '../types';

const STORAGE_KEY_PEOPLE = 'orbit_people_v1';
const STORAGE_KEY_CIRCLES = 'orbit_circles_v1';
const STORAGE_KEY_TASKS = 'orbit_tasks_v1';
const SERVER_API_URL = '/api/data';

export const DATA_UPDATE_EVENT = 'orbit-data-update';
export const SYNC_STATUS_EVENT = 'orbit-sync-status';

// Sync Status Types
export type SyncStatus = 'idle' | 'syncing' | 'saved' | 'error' | 'offline';

// Helper for Robust IDs
export const generateId = (): string => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2);
};

// --- Server Sync Logic ---
let syncTimeout: any = null;
let isSyncing = false;
let isDirty = false; // Flag to track if we have unsaved local changes
let lastDirtyTime = 0; // Track when we became dirty to prevent deadlocks
let syncInterval: any = null;
let currentStatus: SyncStatus = 'idle';

const setSyncStatus = (status: SyncStatus) => {
    currentStatus = status;
    window.dispatchEvent(new CustomEvent(SYNC_STATUS_EVENT, { detail: status }));
};

export const getSyncStatus = () => currentStatus;

export const startAutoSync = () => {
    // Run immediately on load
    initializeFromServer();
    
    if (syncInterval) clearInterval(syncInterval);
    
    // Poll every 5 seconds to keep clients in sync
    syncInterval = setInterval(() => {
        // Only sync if tab is visible to save bandwidth
        if (document.visibilityState === 'visible') {
            initializeFromServer();
        }
    }, 5000);
};

// Saves current local state to the server (Debounced)
const triggerServerSync = () => {
    isDirty = true; // Mark as dirty immediately
    lastDirtyTime = Date.now();
    setSyncStatus('syncing');
    
    if (syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = setTimeout(async () => {
        if (isSyncing) return; // Prevent overlap
        isSyncing = true;
        
        try {
            const data = {
                people: getPeople(),
                circles: getCircles(),
                tasks: getTasks(),
                metadata: { lastUpdated: new Date().toISOString() }
            };
            
            // Add timestamp to URL to bypass aggressive caching on some networks
            const uniqueUrl = `${SERVER_API_URL}?t=${Date.now()}`;
            
            const res = await fetch(uniqueUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (res.ok) {
                console.log('Synced to server/cloud');
                isDirty = false; // Sync complete, safe to pull again
                setSyncStatus('saved');
                setTimeout(() => setSyncStatus('idle'), 2000);
            } else {
                console.warn('Sync failed:', await res.text());
                setSyncStatus('error');
                // If save failed, we assume we are still dirty, but we update timestamp 
                lastDirtyTime = Date.now(); 
            }
        } catch (e) {
            console.debug('Sync skipped (Offline)');
            setSyncStatus('offline');
        } finally {
            isSyncing = false;
        }
    }, 2000); // 2 second debounce to reduce cloud writes
};

export const initializeFromServer = async (): Promise<boolean> => {
    // CRITICAL: If we have unsaved local changes (user is typing), do NOT pull from server
    // This prevents the "ghost typing" issue where server data overwrites local work.
    
    // DEADLOCK FIX: Reduced timeout to 10s to recover faster from failed saves
    if (isDirty) {
        if (Date.now() - lastDirtyTime < 10000) {
            return false; // Still waiting for valid save
        } else {
            console.warn("Sync lock expired (deadlock detected), forcing refresh...");
            isDirty = false; // Force reset
        }
    }

    try {
        // Add timestamp to force bypass browser cache and Vercel edge cache
        const uniqueUrl = `${SERVER_API_URL}?t=${Date.now()}&r=${Math.random()}`;
        
        // CHANGED: Reverted to GET to prevent database overwrites
        const response = await fetch(uniqueUrl, {
            method: 'GET', 
            headers: { 
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
        
        let data;
        if (!response.ok) {
            if (response.status !== 404) setSyncStatus('error');
            return false;
        } else {
            data = await response.json();
        }

        if (!data) return false;

        // Check if this is just a success message from a POST save (legacy bug handling)
        if (data.success && !data.people && !data.circles) {
             return false;
        }

        let hasChanges = false;

        // Helper to update local storage only if data changed
        const updateIfChanged = (key: string, newData: any) => {
            if (!newData || !Array.isArray(newData)) return;
            
            const currentStr = localStorage.getItem(key);
            const newStr = JSON.stringify(newData);
            
            if (currentStr !== newStr) {
                localStorage.setItem(key, newStr);
                hasChanges = true;
            }
        };

        // Merge logic: Server wins if data exists
        updateIfChanged(STORAGE_KEY_PEOPLE, data.people);
        updateIfChanged(STORAGE_KEY_CIRCLES, data.circles);
        updateIfChanged(STORAGE_KEY_TASKS, data.tasks);
        
        // Notify app to refresh only if we actually updated something (reduces flicker)
        if (hasChanges) {
            console.log("Received new data from cloud");
            window.dispatchEvent(new Event(DATA_UPDATE_EVENT));
        }
        
        if (currentStatus !== 'saved' && currentStatus !== 'syncing') {
            setSyncStatus('idle');
        }
        
        return true;
    } catch (e) {
        // console.log("Could not initialize from server (Offline or First Run)");
        return false;
    }
};

// Initial Seed Data
const DEFAULT_CIRCLES: Circle[] = [
  { id: 'c1', name: 'Family', color: '#ec4899' }, // Pink
  { id: 'c2', name: 'Friends', color: '#f59e0b' }, // Amber
  { id: 'c3', name: 'Work', color: '#3b82f6' },   // Blue
  { id: 'c4', name: 'Networking', color: '#10b981' } // Emerald
];

const DEFAULT_PEOPLE: Person[] = [
  {
    id: 'p1',
    name: 'Sarah Chen',
    role: 'Product Manager',
    company: 'TechFlow',
    location: 'San Francisco, CA',
    email: 'sarah.c@example.com',
    phone: '+1 (555) 123-4567',
    circles: ['c3', 'c2'],
    desiredFrequencyDays: 14,
    isFavorite: true,
    birthday: '1990-10-24',
    socialLinks: [
      { platform: 'LinkedIn', url: 'https://linkedin.com/in/sarahchen' },
      { platform: 'Twitter', url: 'https://twitter.com/sarahc' }
    ],
    lastContactDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    interactions: [
      {
        id: 'i1',
        contactId: 'p1',
        date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
        type: InteractionType.MEETING,
        notes: 'Coffee catchup. Discussed the Q3 roadmap and her new puppy.',
        sentiment: 'positive'
      }
    ]
  },
  {
    id: 'p2',
    name: 'Michael Ross',
    role: 'Brother',
    location: 'Chicago, IL',
    phone: '+1 (555) 987-6543',
    circles: ['c1'],
    desiredFrequencyDays: 7,
    isFavorite: true,
    birthday: new Date(Date.now() + 1000 * 60 * 60 * 24 * 4).toISOString().split('T')[0],
    lastContactDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
    interactions: []
  },
  {
    id: 'p3',
    name: 'Elena Rodriguez',
    role: 'Designer',
    company: 'Freelance',
    circles: ['c3', 'c4'],
    desiredFrequencyDays: 30,
    lastContactDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45).toISOString(),
    interactions: []
  },
  {
    id: 'p4',
    name: 'David Kim',
    role: 'Gym Buddy',
    circles: ['c2'],
    desiredFrequencyDays: 3,
    lastContactDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
    interactions: []
  }
];

const DEFAULT_TASKS: Task[] = [
    {
        id: 't1',
        title: 'File Quarterly Taxes',
        date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString().split('T')[0],
        isCompleted: false,
        type: 'task',
        recurrence: 'monthly',
        category: 'finance'
    },
    {
        id: 't2',
        title: 'Call Mom',
        date: new Date().toISOString().split('T')[0],
        isCompleted: false,
        type: 'reminder',
        recurrence: 'weekly',
        linkedPersonIds: ['p2'],
        category: 'personal'
    }
];

// --- Circles ---
export const getCircles = (): Circle[] => {
  const stored = localStorage.getItem(STORAGE_KEY_CIRCLES);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY_CIRCLES, JSON.stringify(DEFAULT_CIRCLES));
    return DEFAULT_CIRCLES;
  }
  return JSON.parse(stored);
};

export const createNewCircle = (name: string): Circle => {
    const circles = getCircles();
    const colors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    const newCircle: Circle = {
        id: generateId(),
        name: name,
        color: randomColor
    };
    
    circles.push(newCircle);
    localStorage.setItem(STORAGE_KEY_CIRCLES, JSON.stringify(circles));
    triggerServerSync();
    return newCircle;
};

// --- People ---
export const getPeople = (): Person[] => {
  const stored = localStorage.getItem(STORAGE_KEY_PEOPLE);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY_PEOPLE, JSON.stringify(DEFAULT_PEOPLE));
    return DEFAULT_PEOPLE;
  }
  return JSON.parse(stored);
};

export const savePerson = (person: Person): void => {
  const people = getPeople();
  if (!person.id) person.id = generateId();
  
  const index = people.findIndex(p => p.id === person.id);
  if (index >= 0) {
    people[index] = person;
  } else {
    people.push(person);
  }
  localStorage.setItem(STORAGE_KEY_PEOPLE, JSON.stringify(people));
  triggerServerSync();
};

export const updatePerson = (personId: string, updates: Partial<Person>): Person | null => {
  const people = getPeople();
  const index = people.findIndex(p => p.id === personId);
  if (index === -1) return null;
  
  people[index] = { ...people[index], ...updates };
  localStorage.setItem(STORAGE_KEY_PEOPLE, JSON.stringify(people));
  triggerServerSync();
  return people[index];
};

export const snoozePerson = (personId: string, days: number): void => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    updatePerson(personId, { snoozeUntil: date.toISOString() });
};

export const deletePerson = (personId: string): void => {
    let people = getPeople();
    people = people.filter(p => p.id !== personId);
    localStorage.setItem(STORAGE_KEY_PEOPLE, JSON.stringify(people));
    triggerServerSync();
};

export const getPersonById = (id: string): Person | undefined => {
  return getPeople().find(p => p.id === id);
};

// --- Interactions ---
export const addInteraction = (personId: string, interaction: Omit<Interaction, 'id' | 'contactId'>): void => {
  const people = getPeople();
  const person = people.find(p => p.id === personId);
  if (person) {
    const newInteraction: Interaction = {
      ...interaction,
      id: generateId(),
      contactId: personId
    };
    person.interactions.unshift(newInteraction);
    
    if (!person.lastContactDate || new Date(interaction.date) > new Date(person.lastContactDate)) {
      person.lastContactDate = interaction.date;
    }
    
    // Clear snooze when interaction is added
    person.snoozeUntil = undefined;
    
    savePerson(person);
    // savePerson triggers sync
  }
};

export const updateInteraction = (personId: string, interactionId: string, updates: Partial<Interaction>): void => {
  const people = getPeople();
  const person = people.find(p => p.id === personId);
  if (person) {
    const intIndex = person.interactions.findIndex(i => i.id === interactionId);
    if (intIndex >= 0) {
      person.interactions[intIndex] = { ...person.interactions[intIndex], ...updates };
      person.interactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const dates = person.interactions.map(i => new Date(i.date).getTime());
      if (dates.length > 0) {
        person.lastContactDate = new Date(Math.max(...dates)).toISOString();
      } else {
        person.lastContactDate = undefined;
      }

      savePerson(person);
    }
  }
};

export const deleteInteraction = (personId: string, interactionId: string): void => {
    const people = getPeople();
    const person = people.find(p => p.id === personId);
    if (person) {
        person.interactions = person.interactions.filter(i => i.id !== interactionId);
        
        const dates = person.interactions.map(i => new Date(i.date).getTime());
        if (dates.length > 0) {
            person.lastContactDate = new Date(Math.max(...dates)).toISOString();
        } else {
            person.lastContactDate = undefined;
        }

        savePerson(person);
    }
  };

// --- Tasks ---
export const getTasks = (): Task[] => {
    const stored = localStorage.getItem(STORAGE_KEY_TASKS);
    if (!stored) {
        localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(DEFAULT_TASKS));
        return DEFAULT_TASKS;
    }
    return JSON.parse(stored);
};

export const saveTask = (task: Task): void => {
    const tasks = getTasks();
    if (!task.id) task.id = generateId();

    const index = tasks.findIndex(t => t.id === task.id);
    if (index >= 0) {
        tasks[index] = task;
    } else {
        tasks.push(task);
    }
    localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(tasks));
    triggerServerSync();
};

export const deleteTask = (taskId: string): void => {
    try {
        const tasks = getTasks();
        const filtered = tasks.filter(t => String(t.id) !== String(taskId));
        localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(filtered));
        triggerServerSync();
    } catch (e) {
        console.error("Failed to delete task", e);
    }
};

export const toggleTaskCompletion = (taskId: string): void => {
    const tasks = getTasks();
    const task = tasks.find(t => t.id === taskId);
    
    if (task) {
        const wasCompleted = task.isCompleted;
        task.isCompleted = !wasCompleted;
        
        // If it was an inbox task (no date) and is now completed, stamp it with today's date
        // so it shows up in the daily archive log.
        if (!wasCompleted && !task.date) {
            task.date = new Date().toISOString().split('T')[0];
        }
        
        if (!wasCompleted && task.recurrence && task.recurrence !== 'none') {
            const nextDate = new Date(task.date || new Date().toISOString());
            
            if (task.recurrence === 'daily') nextDate.setDate(nextDate.getDate() + 1);
            if (task.recurrence === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
            if (task.recurrence === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
            if (task.recurrence === 'yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);
            
            const nextTask: Task = {
                ...task,
                id: generateId(),
                date: nextDate.toISOString().split('T')[0],
                isCompleted: false 
            };
            tasks.push(nextTask);
            task.recurrence = 'none'; 
        }

        localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(tasks));
        triggerServerSync();
    }
};

// --- Data Management ---
export const exportData = (): string => {
    const data = {
      people: getPeople(),
      circles: getCircles(),
      tasks: getTasks(),
      metadata: {
        exportedAt: new Date().toISOString(),
        appVersion: '1.0',
        appName: 'Orbit'
      }
    };
    return JSON.stringify(data, null, 2);
  };
  
  export const importData = async (jsonString: string): Promise<{success: boolean, message: string}> => {
    try {
      const data = JSON.parse(jsonString);
      
      if (!data.people || !Array.isArray(data.people)) {
          throw new Error("Invalid backup file format: Missing 'people' data.");
      }
  
      if (data.people) localStorage.setItem(STORAGE_KEY_PEOPLE, JSON.stringify(data.people));
      if (data.circles) localStorage.setItem(STORAGE_KEY_CIRCLES, JSON.stringify(data.circles));
      if (data.tasks) localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(data.tasks));
      
      triggerServerSync();
      window.dispatchEvent(new Event(DATA_UPDATE_EVENT));
      return { success: true, message: `Successfully restored ${data.people.length} contacts.` };
    } catch (e: any) {
      console.error("Import failed", e);
      return { success: false, message: e.message || "Failed to parse backup file." };
    }
  };
  
  export const clearAllData = (): void => {
      localStorage.removeItem(STORAGE_KEY_PEOPLE);
      localStorage.removeItem(STORAGE_KEY_CIRCLES);
      localStorage.removeItem(STORAGE_KEY_TASKS);
      
      localStorage.setItem(STORAGE_KEY_PEOPLE, JSON.stringify(DEFAULT_PEOPLE));
      localStorage.setItem(STORAGE_KEY_CIRCLES, JSON.stringify(DEFAULT_CIRCLES));
      localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(DEFAULT_TASKS));
      triggerServerSync();
      window.dispatchEvent(new Event(DATA_UPDATE_EVENT));
  };
