export enum HealthStatus {
  HEALTHY = 'HEALTHY',
  NEEDS_ATTENTION = 'NEEDS_ATTENTION',
  OVERDUE = 'OVERDUE'
}

export enum InteractionType {
  CALL = 'Call',
  MEETING = 'Meeting',
  MESSAGE = 'Message',
  EMAIL = 'Email',
  SOCIAL = 'Social',
  OTHER = 'Other'
}

export interface Circle {
  id: string;
  name: string;
  color: string;
}

export interface Interaction {
  id: string;
  contactId: string;
  date: string; // ISO Date string
  type: InteractionType;
  notes: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
}

export interface SocialLink {
  platform: string;
  url: string;
}

export interface Attachment {
  id: string;
  type: 'photo' | 'doc';
  url: string;
  name: string;
  dateAdded: string;
}

export interface Person {
  id: string;
  name: string;
  avatar?: string; // URL
  role?: string;
  company?: string;
  email?: string;
  phone?: string;
  location?: string;
  circles: string[]; // Circle IDs
  tags?: string[];
  lastContactDate?: string;
  desiredFrequencyDays: number;
  interactions: Interaction[];
  notes?: string;
  birthday?: string; // ISO Date string (YYYY-MM-DD)
  isFavorite?: boolean;
  socialLinks?: SocialLink[];
  attachments?: Attachment[];
}

export interface Task {
  id: string;
  title: string;
  date?: string; // ISO Date string, optional for General To-Dos
  isCompleted: boolean;
  type: 'task' | 'event' | 'reminder';
  recurrence?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'none';
  linkedPersonIds?: string[]; // Who is this task regarding?
  category?: 'finance' | 'health' | 'work' | 'personal' | 'general';
  notes?: string;
}

export interface ParsedInteraction {
  people: string[];
  date: string;
  type: InteractionType;
  summary: string;
  actionItems: string[];
}