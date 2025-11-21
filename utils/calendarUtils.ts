
import { Task, Person } from '../types';

export const generateGoogleCalendarUrl = (task: Task, relatedPeople: Person[] = []): string => {
  const baseUrl = "https://calendar.google.com/calendar/render";
  
  // Title
  const text = encodeURIComponent(task.title);
  
  // Dates: Google expects YYYYMMDD format. 
  // If it's a specific date, we set it as an all-day event (YYYYMMDD/YYYYMMDD+1)
  // or if we had time, YYYYMMDDTHHMMSSZ. For now, assuming all-day or general dates.
  let dates = "";
  if (task.date) {
    const startDate = new Date(task.date);
    const startStr = startDate.toISOString().replace(/-|:|\.\d\d\d/g, "").substring(0, 8);
    
    // End date is start date + 1 day for all-day events
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);
    const endStr = endDate.toISOString().replace(/-|:|\.\d\d\d/g, "").substring(0, 8);
    
    dates = `&dates=${startStr}/${endStr}`;
  }

  // Details / Description
  let detailsText = task.notes || "";
  if (relatedPeople.length > 0) {
    detailsText += `\n\nRegarding: ${relatedPeople.map(p => p.name).join(', ')}`;
  }
  // Add Orbit signature
  detailsText += "\n\n(Created via Orbit)";
  const details = encodeURIComponent(detailsText);

  // Construct URL
  return `${baseUrl}?action=TEMPLATE&text=${text}${dates}&details=${details}`;
};
