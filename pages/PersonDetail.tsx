
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPersonById, getCircles, addInteraction, updatePerson, updateInteraction, deleteInteraction, deletePerson, DATA_UPDATE_EVENT, getTasks } from '../services/storageService';
import { Person, Circle, InteractionType, Interaction, Attachment, Task } from '../types';
import { HealthBadge, calculateHealthScore } from '../components/HealthBadge';
import { ArrowLeft, Mail, Phone, MapPin, Calendar, Plus, MessageSquare, Edit2, Save, X, Star, Globe, Trash2, Link as LinkIcon, AlignLeft, Paperclip, FileText, Camera, Check, Tag, Clock, AlertTriangle, Briefcase, CheckCircle2, ExternalLink } from 'lucide-react';
import { InteractionModal } from '../components/InteractionModal';
import { timeAgo, formatDateReadable } from '../utils/dateUtils';
import { generateGoogleCalendarUrl } from '../utils/calendarUtils';

export const PersonDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [person, setPerson] = useState<Person | null>(null);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [linkedTasks, setLinkedTasks] = useState<Task[]>([]);
  
  // Edit Mode States
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Person>>({});
  
  // Interaction Edit State
  const [editingInteractionId, setEditingInteractionId] = useState<string | null>(null);
  const [editInteractionData, setEditInteractionData] = useState<{notes: string, date: string, type: InteractionType} | null>(null);

  // Quick Add States
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [newLinkUrl, setNewLinkUrl] = useState('');
  
  const [isAddingAttachment, setIsAddingAttachment] = useState(false);
  const [newAttachmentUrl, setNewAttachmentUrl] = useState('');
  const [newAttachmentName, setNewAttachmentName] = useState('');

  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');

  const [newTag, setNewTag] = useState('');

  // Log Modal
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  const refreshData = () => {
    if (id) {
        const p = getPersonById(id);
        if (p) {
            setPerson(p);
            setEditForm({
                name: p.name,
                avatar: p.avatar,
                role: p.role,
                company: p.company,
                location: p.location,
                email: p.email,
                phone: p.phone,
                desiredFrequencyDays: p.desiredFrequencyDays,
                birthday: p.birthday,
                circles: p.circles,
                tags: p.tags || [],
                isFavorite: p.isFavorite,
                socialLinks: p.socialLinks || [],
                notes: p.notes,
                attachments: p.attachments || []
            });
            
            // Find tasks linked to this person
            const allTasks = getTasks();
            const linked = allTasks.filter(t => !t.isCompleted && t.linkedPersonIds?.includes(p.id));
            setLinkedTasks(linked);
        }
    }
    setCircles(getCircles());
  };

  useEffect(() => {
    refreshData();
    
    const handleDataUpdate = () => refreshData();
    window.addEventListener(DATA_UPDATE_EVENT, handleDataUpdate);
    
    return () => window.removeEventListener(DATA_UPDATE_EVENT, handleDataUpdate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSaveProfile = () => {
    if (person && person.id) {
        updatePerson(person.id, editForm);
        setIsEditingProfile(false);
        refreshData();
    }
  };

  const detectPlatform = (url: string): string => {
      if (url.includes('linkedin.com')) return 'LinkedIn';
      if (url.includes('twitter.com') || url.includes('x.com')) return 'Twitter';
      if (url.includes('facebook.com')) return 'Facebook';
      if (url.includes('instagram.com')) return 'Instagram';
      if (url.includes('github.com')) return 'GitHub';
      return 'Website';
  };

  const handleAddSocialLink = () => {
      if (newLinkUrl && person) {
          const platform = detectPlatform(newLinkUrl);
          const currentLinks = person.socialLinks || [];
          updatePerson(person.id, {
              socialLinks: [...currentLinks, { platform, url: newLinkUrl }]
          });
          setNewLinkUrl('');
          setIsAddingLink(false);
          refreshData();
      }
  };

  const handleAddAttachment = () => {
      if (newAttachmentUrl && newAttachmentName && person) {
        const newAtt: Attachment = {
            id: Date.now().toString(),
            type: newAttachmentUrl.match(/\.(jpeg|jpg|gif|png)$/) != null ? 'photo' : 'doc',
            url: newAttachmentUrl,
            name: newAttachmentName,
            dateAdded: new Date().toISOString()
        };
        const currentAtts = person.attachments || [];
        updatePerson(person.id, {
            attachments: [...currentAtts, newAtt]
        });
        setNewAttachmentUrl('');
        setNewAttachmentName('');
        setIsAddingAttachment(false);
        refreshData();
      }
  };

  const handleAppendNote = () => {
      if(newNoteText && person) {
          const currentNotes = person.notes ? person.notes + '\n\n' : '';
          updatePerson(person.id, {
              notes: currentNotes + newNoteText
          });
          setNewNoteText('');
          setIsAddingNote(false);
          refreshData();
      }
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && newTag.trim()) {
          e.preventDefault();
          const currentTags = editForm.tags || [];
          if (!currentTags.includes(newTag.trim())) {
              setEditForm({ ...editForm, tags: [...currentTags, newTag.trim()] });
          }
          setNewTag('');
      }
  };

  const removeTag = (tagToRemove: string) => {
      const currentTags = editForm.tags || [];
      setEditForm({ ...editForm, tags: currentTags.filter(t => t !== tagToRemove) });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setEditForm({...editForm, avatar: reader.result as string});
          };
          reader.readAsDataURL(file);
      }
  };

  const toggleCircle = (circleId: string) => {
      const currentCircles = editForm.circles || [];
      if (currentCircles.includes(circleId)) {
          setEditForm({...editForm, circles: currentCircles.filter(c => c !== circleId)});
      } else {
          setEditForm({...editForm, circles: [...currentCircles, circleId]});
      }
  };

  const handleDeletePerson = () => {
      if (person && window.confirm(`Are you sure you want to delete ${person.name}? This action cannot be undone.`)) {
          deletePerson(person.id);
          navigate('/people');
      }
  };

  // Interaction Editing
  const handleEditInteractionStart = (interaction: Interaction) => {
    setEditingInteractionId(interaction.id);
    setEditInteractionData({
        notes: interaction.notes,
        date: interaction.date,
        type: interaction.type
    });
  };

  const handleEditInteractionSave = (interactionId: string) => {
    if (person && editInteractionData) {
        updateInteraction(person.id, interactionId, editInteractionData);
        setEditingInteractionId(null);
        setEditInteractionData(null);
        refreshData();
    }
  };

  const handleDeleteInteraction = (interactionId: string) => {
      if(person && window.confirm("Delete this interaction?")) {
          deleteInteraction(person.id, interactionId);
          refreshData();
      }
  };

  const handleLogModalSubmit = (data: { personIds: string[], type: InteractionType, date: string, notes: string }) => {
      if (person) {
          addInteraction(person.id, {
              date: data.date,
              type: data.type,
              notes: data.notes,
              sentiment: 'neutral'
          });
          refreshData();
      }
  };
  
  const openGoogleCalendar = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    if (!person) return;
    const url = generateGoogleCalendarUrl(task, [person]);
    window.open(url, '_blank');
  };

  const getAge = (birthdayStr?: string) => {
      if (!birthdayStr) return null;
      const today = new Date();
      const birthDate = new Date(birthdayStr);
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
      }
      return age;
  };

  if (!person) return <div className="p-8 text-white">Loading...</div>;

  const healthScore = calculateHealthScore(person.lastContactDate, person.desiredFrequencyDays);
  const personCircles = circles.filter(c => person.circles.includes(c.id));
  const age = getAge(person.birthday);

  return (
    <div className="max-w-5xl mx-auto p-6 animate-fade-in pb-24 md:pb-6">
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button 
            onClick={() => navigate(-1)} 
            className="flex items-center text-slate-400 hover:text-white transition-colors"
        >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </button>
        
        <div className="flex items-center gap-3">
            <button 
                onClick={() => setIsLogModalOpen(true)}
                className="bg-orbit-600 hover:bg-orbit-500 text-white px-4 py-2 rounded-full flex items-center gap-2 text-sm font-bold transition-colors shadow-lg shadow-orbit-600/20"
            >
                <Plus className="w-5 h-5" /> Log Interaction
            </button>
            <button 
                onClick={() => isEditingProfile ? setEditForm({...editForm, isFavorite: !editForm.isFavorite}) : updatePerson(person.id, { isFavorite: !person.isFavorite }) && refreshData()}
                className={`p-2 rounded-full transition-colors border ${
                    (isEditingProfile ? editForm.isFavorite : person.isFavorite)
                    ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' 
                    : 'text-slate-600 border-slate-700 hover:text-slate-400'
                }`}
            >
                <Star className={`w-5 h-5 ${(isEditingProfile ? editForm.isFavorite : person.isFavorite) ? 'fill-current' : ''}`} />
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Profile Info */}
        <div className="lg:col-span-1 space-y-6">
            <div className="bg-dark-card p-6 rounded-2xl border border-slate-700/50 text-center relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-orbit-900/50 to-transparent"></div>
                
                {/* Edit Toggle */}
                <button 
                    onClick={() => setIsEditingProfile(!isEditingProfile)}
                    className="absolute top-2 right-2 p-2 bg-slate-800/50 rounded-full text-slate-300 hover:text-white hover:bg-slate-700 transition-colors z-20"
                >
                    {isEditingProfile ? <X className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                </button>

                <div className="relative z-10">
                    <div className="relative inline-block mb-4 group/avatar">
                        <img 
                            src={(isEditingProfile ? editForm.avatar : person.avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(person.name)}&background=0ea5e9&color=fff&size=128&rounded=true`} 
                            alt={person.name}
                            className="w-32 h-32 rounded-full object-cover border-4 border-dark-card shadow-xl bg-slate-800"
                        />
                        {isEditingProfile && (
                            <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full cursor-pointer opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                                <Camera className="w-8 h-8 text-white" />
                                <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                            </label>
                        )}
                        <HealthBadge score={healthScore} className="absolute bottom-1 right-1 scale-125" />
                    </div>
                    
                    {isEditingProfile ? (
                        <div className="space-y-3 mb-4 animate-fade-in">
                            <input 
                                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-center text-white font-bold"
                                value={editForm.name}
                                onChange={e => setEditForm({...editForm, name: e.target.value})}
                                placeholder="Name"
                            />
                            <input 
                                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-center text-xs text-slate-300"
                                placeholder="Role"
                                value={editForm.role}
                                onChange={e => setEditForm({...editForm, role: e.target.value})}
                            />
                            <input 
                                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-center text-xs text-slate-300"
                                placeholder="Company"
                                value={editForm.company}
                                onChange={e => setEditForm({...editForm, company: e.target.value})}
                            />
                        </div>
                    ) : (
                        <>
                            <h1 className="text-2xl font-bold text-white">{person.name}</h1>
                            <p className="text-slate-400 mb-4">{person.role} {person.company && `@ ${person.company}`}</p>
                        </>
                    )}
                    
                    {/* Circle Tags */}
                    {isEditingProfile ? (
                        <div className="flex flex-wrap gap-2 justify-center mb-4">
                            {circles.map(c => (
                                <button 
                                    key={c.id}
                                    onClick={() => toggleCircle(c.id)}
                                    className={`text-xs px-3 py-1 rounded-full font-medium border transition-all ${
                                        editForm.circles?.includes(c.id)
                                        ? 'text-white border-transparent opacity-100'
                                        : 'text-slate-400 border-slate-600 opacity-50 hover:opacity-100'
                                    }`}
                                    style={editForm.circles?.includes(c.id) ? { backgroundColor: c.color } : {}}
                                >
                                    {c.name}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-wrap justify-center gap-2 mb-6">
                            {personCircles.map(c => (
                                <span key={c.id} className="text-xs px-3 py-1 rounded-full font-medium text-white shadow-sm" style={{ backgroundColor: c.color }}>
                                    {c.name}
                                </span>
                            ))}
                        </div>
                    )}
                    
                    {/* Context Tags */}
                    {(person.tags && person.tags.length > 0) || isEditingProfile ? (
                        <div className="flex flex-wrap justify-center gap-1.5 mb-6 px-4">
                             {(isEditingProfile ? editForm.tags : person.tags)?.map((tag, idx) => (
                                 <span key={idx} className="bg-slate-800 text-slate-400 text-[10px] px-2 py-1 rounded border border-slate-700 flex items-center gap-1">
                                     <Tag className="w-2 h-2" /> 
                                     {tag}
                                     {isEditingProfile && (
                                         <button onClick={() => removeTag(tag)} className="hover:text-red-400 ml-1"><X className="w-2 h-2"/></button>
                                     )}
                                 </span>
                             ))}
                             {isEditingProfile && (
                                 <input 
                                    className="bg-transparent border-b border-slate-700 text-xs w-20 outline-none text-slate-300 placeholder-slate-600 focus:border-orbit-500 transition-colors"
                                    placeholder="+ Tag"
                                    value={newTag}
                                    onChange={e => setNewTag(e.target.value)}
                                    onKeyDown={handleAddTag}
                                 />
                             )}
                        </div>
                    ) : null}

                    <div className="flex gap-2 justify-center">
                         <a href={`tel:${person.phone}`} className={`bg-green-600 hover:bg-green-500 text-white p-2.5 rounded-lg flex items-center justify-center transition-colors ${!person.phone && 'opacity-50 cursor-not-allowed pointer-events-none'}`}>
                            <Phone className="w-4 h-4" />
                        </a>
                        <a href={`sms:${person.phone}`} className={`flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors ${!person.phone && 'opacity-50 cursor-not-allowed pointer-events-none'}`}>
                            <MessageSquare className="w-4 h-4" /> Message
                        </a>
                        <a href={`mailto:${person.email}`} className={`flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors ${!person.email && 'opacity-50 cursor-not-allowed pointer-events-none'}`}>
                            <Mail className="w-4 h-4" /> Email
                        </a>
                    </div>
                </div>
                
                {isEditingProfile && (
                    <button 
                        onClick={handleSaveProfile}
                        className="mt-4 w-full py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                    >
                        <Save className="w-4 h-4" /> Save Changes
                    </button>
                )}
            </div>

            <div className="bg-dark-card p-6 rounded-2xl border border-slate-700/50">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Details</h3>
                <div className="space-y-4 text-sm">
                    <div className="flex items-center gap-3 text-slate-300">
                        <Phone className="w-4 h-4 text-slate-500" />
                        {isEditingProfile ? (
                            <input 
                                className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white"
                                value={editForm.phone}
                                onChange={e => setEditForm({...editForm, phone: e.target.value})}
                                placeholder="+1 555..."
                            />
                        ) : (
                            person.phone ? (
                                <div className="flex gap-2 items-center">
                                    <span>{person.phone}</span>
                                </div>
                            ) : <span className="text-slate-600 italic">No phone</span>
                        )}
                    </div>

                    <div className="flex items-center gap-3 text-slate-300">
                        <MapPin className="w-4 h-4 text-slate-500" />
                        {isEditingProfile ? (
                            <input 
                                className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white"
                                value={editForm.location}
                                onChange={e => setEditForm({...editForm, location: e.target.value})}
                            />
                        ) : (person.location || <span className="text-slate-600 italic">No location</span>)}
                    </div>
                    
                    <div className="flex items-center gap-3 text-slate-300">
                        <Mail className="w-4 h-4 text-slate-500" />
                        {isEditingProfile ? (
                            <input 
                                className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white"
                                value={editForm.email}
                                onChange={e => setEditForm({...editForm, email: e.target.value})}
                            />
                        ) : (person.email || <span className="text-slate-600 italic">No email</span>)}
                    </div>

                    <div className="flex items-center gap-3 text-slate-300">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        {isEditingProfile ? (
                            <input 
                                type="date"
                                className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white"
                                value={editForm.birthday || ''}
                                onChange={e => setEditForm({...editForm, birthday: e.target.value})}
                            />
                        ) : (
                            person.birthday ? (
                                <span>
                                    {new Date(person.birthday).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
                                    {age !== null && <span className="text-slate-500 ml-1">({age} years old)</span>}
                                </span>
                            ) : <span className="text-slate-600 italic">No birthday</span>
                        )}
                    </div>

                    <div className="flex items-center gap-3 text-slate-300">
                        <Clock className="w-4 h-4 text-slate-500" />
                        {isEditingProfile ? (
                            <div className="flex items-center gap-2 flex-1">
                                <select 
                                    className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white outline-none focus:ring-1 focus:ring-orbit-500 text-sm"
                                    value={editForm.desiredFrequencyDays}
                                    onChange={e => setEditForm({...editForm, desiredFrequencyDays: Number(e.target.value)})}
                                >
                                    <option value={7}>Weekly</option>
                                    <option value={14}>Every 2 Weeks</option>
                                    <option value={30}>Monthly</option>
                                    <option value={60}>Every 2 Months</option>
                                    <option value={90}>Quarterly</option>
                                    <option value={180}>Every 6 Months</option>
                                    <option value={365}>Yearly</option>
                                </select>
                            </div>
                        ) : (
                            <span>Every {person.desiredFrequencyDays} days</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Social Links */}
            <div className="bg-dark-card p-6 rounded-2xl border border-slate-700/50">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <Globe className="w-4 h-4" /> Social Links
                    </h3>
                    {!isEditingProfile && (
                        <button 
                            onClick={() => setIsAddingLink(!isAddingLink)} 
                            className="text-slate-500 hover:text-orbit-400 transition-colors p-1"
                            title="Add Link"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    )}
                </div>
                
                <div className="space-y-3">
                    {person.socialLinks?.map((link, idx) => (
                        <div key={idx} className="flex items-center justify-between group">
                            <a 
                                href={link.url} 
                                target="_blank" 
                                rel="noreferrer"
                                className="flex items-center gap-3 text-sm text-slate-300 hover:text-orbit-400 transition-colors"
                            >
                                <LinkIcon className="w-3 h-3 text-slate-500" />
                                <span className="font-medium">{link.platform}</span>
                            </a>
                            {isEditingProfile && (
                                <button 
                                    onClick={() => {
                                        const current = [...(editForm.socialLinks || [])];
                                        current.splice(idx, 1);
                                        setEditForm({...editForm, socialLinks: current});
                                    }}
                                    className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    ))}

                    {(isAddingLink || isEditingProfile) && (
                        <div className="flex gap-2 mt-2 animate-fade-in">
                            <input 
                                placeholder="Paste Profile URL..."
                                className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                                value={newLinkUrl}
                                onChange={e => setNewLinkUrl(e.target.value)}
                            />
                            <button 
                                onClick={handleAddSocialLink}
                                className="bg-orbit-600 text-white p-1 rounded hover:bg-orbit-500"
                            >
                                <Check className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Danger Zone */}
            <div className="mt-8 pt-6 border-t border-slate-800">
                 <button 
                    onClick={handleDeletePerson}
                    className="w-full py-3 border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                 >
                     <Trash2 className="w-4 h-4" /> Delete Contact
                 </button>
            </div>
        </div>

        {/* Right Column: Interactions & Notes */}
        <div className="lg:col-span-2 space-y-6">

            {/* Linked Tasks Section */}
            {linkedTasks.length > 0 && (
                <div className="bg-gradient-to-r from-orbit-900/20 to-purple-900/20 p-6 rounded-2xl border border-orbit-500/20">
                     <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                        <CheckCircle2 className="w-5 h-5 text-orbit-400" />
                        Upcoming Plans
                    </h2>
                    <div className="grid gap-3">
                        {linkedTasks.map(task => (
                            <div key={task.id} onClick={() => navigate('/reminders')} className="group bg-dark-card p-3 rounded-xl border border-slate-700/50 flex items-center justify-between cursor-pointer hover:border-orbit-500/50 transition-all">
                                <div className="flex flex-col">
                                    <span className="text-white font-medium">{task.title}</span>
                                    <span className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                                        <Calendar className="w-3 h-3" /> 
                                        {task.date ? formatDateReadable(task.date) : 'Unscheduled'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {task.date && (
                                        <button 
                                            onClick={(e) => openGoogleCalendar(e, task)}
                                            className="text-slate-500 hover:text-white p-2 rounded-full hover:bg-slate-700 transition-colors"
                                            title="Add to Google Calendar"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                        </button>
                                    )}
                                    <div className="bg-slate-800 px-3 py-1 rounded text-xs text-slate-300">
                                        {timeAgo(task.date)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Attachments */}
            <div className="bg-dark-card p-6 rounded-2xl border border-slate-700/50">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Paperclip className="w-5 h-5 text-slate-400" />
                        Attachments
                    </h2>
                    {!isEditingProfile && (
                        <button 
                            onClick={() => setIsAddingAttachment(!isAddingAttachment)}
                            className="text-slate-500 hover:text-orbit-400 transition-colors p-1"
                            title="Add Attachment"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {(isAddingAttachment || isEditingProfile) && (
                    <div className="mb-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700 space-y-2 animate-fade-in">
                        <input 
                            placeholder="File/Link Name"
                            className="w-full bg-dark-bg border border-slate-700 rounded px-3 py-2 text-sm text-white"
                            value={newAttachmentName}
                            onChange={e => setNewAttachmentName(e.target.value)}
                        />
                        <input 
                            placeholder="Paste URL to Photo or Doc"
                            className="w-full bg-dark-bg border border-slate-700 rounded px-3 py-2 text-sm text-white"
                            value={newAttachmentUrl}
                            onChange={e => setNewAttachmentUrl(e.target.value)}
                        />
                        <div className="flex justify-end gap-2">
                            <button 
                                onClick={() => setIsAddingAttachment(false)}
                                className="px-3 py-1 text-xs text-slate-400"
                            >Cancel</button>
                            <button 
                                onClick={handleAddAttachment}
                                className="px-3 py-1 bg-orbit-600 text-white rounded text-xs font-medium"
                            >
                                Add
                            </button>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {person.attachments?.map((att, idx) => (
                         <a 
                            key={att.id} 
                            href={att.url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="group relative block p-3 rounded-lg bg-slate-800 border border-slate-700 hover:border-orbit-500/50 hover:bg-slate-700 transition-all"
                        >
                            <div className="flex flex-col items-center text-center gap-2">
                                {att.type === 'photo' ? (
                                    <div className="w-full aspect-video bg-slate-900 rounded overflow-hidden">
                                        <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                                    </div>
                                ) : (
                                    <FileText className="w-8 h-8 text-slate-500 group-hover:text-orbit-400" />
                                )}
                                <span className="text-xs text-slate-300 truncate w-full">{att.name}</span>
                            </div>
                            {isEditingProfile && (
                                <button 
                                    onClick={(e) => { e.preventDefault(); const atts = [...(editForm.attachments || [])]; atts.splice(idx, 1); setEditForm({...editForm, attachments: atts}); }}
                                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                         </a>
                    ))}
                    {(!person.attachments?.length && !isAddingAttachment && !isEditingProfile) && <p className="col-span-3 text-sm text-slate-600 italic">No attachments</p>}
                </div>
            </div>

            {/* Permanent Notes Section */}
            <div className="bg-dark-card p-6 rounded-2xl border border-slate-700/50">
                <div className="flex items-center justify-between mb-4">
                     <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <AlignLeft className="w-5 h-5 text-slate-400" />
                        Notes
                     </h2>
                     {!isEditingProfile && (
                         <button 
                            onClick={() => setIsAddingNote(!isAddingNote)}
                            className="text-slate-500 hover:text-orbit-400 transition-colors p-1"
                            title="Append Note"
                         >
                            <Plus className="w-4 h-4" />
                         </button>
                     )}
                </div>
                
                {(isAddingNote) && (
                    <div className="mb-4 animate-fade-in">
                        <textarea 
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-slate-200 text-sm outline-none focus:ring-2 focus:ring-orbit-500/50 resize-y min-h-[80px]"
                            value={newNoteText}
                            onChange={e => setNewNoteText(e.target.value)}
                            placeholder="Add a quick note..."
                            autoFocus
                        />
                        <div className="flex justify-end gap-2 mt-2">
                             <button onClick={() => setIsAddingNote(false)} className="text-xs text-slate-400">Cancel</button>
                             <button onClick={handleAppendNote} className="bg-orbit-600 text-white px-3 py-1 rounded text-xs">Add Note</button>
                        </div>
                    </div>
                )}

                {isEditingProfile ? (
                    <textarea 
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-slate-200 text-sm outline-none focus:ring-2 focus:ring-orbit-500/50 resize-y min-h-[100px]"
                        value={editForm.notes}
                        onChange={e => setEditForm({...editForm, notes: e.target.value})}
                        placeholder="Add permanent notes about this person..."
                    />
                ) : (
                    <div className="prose prose-invert prose-sm max-w-none text-slate-300 whitespace-pre-wrap">
                        {person.notes || "No notes yet."}
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between pt-4">
                <h2 className="text-xl font-bold text-white">Interaction History</h2>
            </div>

            <div className="relative pl-4 border-l border-slate-800 space-y-8">
                {person.interactions.length === 0 ? (
                    <div className="text-center py-12 bg-dark-card rounded-2xl border border-slate-700 border-dashed ml-4">
                        <MessageSquare className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-400">No interactions recorded yet.</p>
                        <p className="text-slate-500 text-sm">Log your first interaction above.</p>
                    </div>
                ) : (
                    person.interactions.map(interaction => (
                        <div key={interaction.id} className="group relative ml-6">
                            {/* Timeline Dot */}
                            <div className="absolute -left-[33px] top-4 w-3 h-3 rounded-full bg-slate-800 border-2 border-slate-600 group-hover:border-orbit-500 group-hover:bg-orbit-500 transition-colors"></div>

                            <div className="bg-dark-card p-5 rounded-xl border border-slate-700/50 hover:border-slate-600 transition-colors relative">
                                {/* Interaction Actions */}
                                {editingInteractionId !== interaction.id && (
                                    <button 
                                        onClick={() => handleEditInteractionStart(interaction)}
                                        className="absolute top-4 right-4 text-slate-600 hover:text-orbit-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                )}

                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-3">
                                        <span className="text-white font-medium text-sm">
                                            {formatDateReadable(interaction.date)}
                                        </span>
                                        <span className="text-slate-500 text-xs">
                                            ({timeAgo(interaction.date)})
                                        </span>
                                        <span className="bg-slate-800 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide">
                                            {interaction.type}
                                        </span>
                                    </div>
                                </div>
                                
                                {editingInteractionId === interaction.id && editInteractionData ? (
                                    <div className="mt-2 animate-fade-in space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <input 
                                                type="date"
                                                className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-xs"
                                                value={editInteractionData.date.split('T')[0]}
                                                onChange={e => setEditInteractionData({...editInteractionData, date: e.target.value})}
                                            />
                                            <select 
                                                className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-xs"
                                                value={editInteractionData.type}
                                                onChange={e => setEditInteractionData({...editInteractionData, type: e.target.value as InteractionType})}
                                            >
                                                {Object.values(InteractionType).map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        </div>
                                        <textarea 
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-slate-200 text-sm outline-none focus:ring-2 focus:ring-orbit-500/50"
                                            rows={3}
                                            value={editInteractionData.notes}
                                            onChange={(e) => setEditInteractionData({...editInteractionData, notes: e.target.value})}
                                        />
                                        <div className="flex gap-2 mt-2 justify-between items-center">
                                            <button 
                                                onClick={() => handleDeleteInteraction(interaction.id)}
                                                className="text-red-500 hover:text-red-400 text-xs flex items-center gap-1"
                                            >
                                                <Trash2 className="w-3 h-3" /> Delete
                                            </button>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => setEditingInteractionId(null)}
                                                    className="text-xs text-slate-400 hover:text-white px-3 py-1"
                                                >
                                                    Cancel
                                                </button>
                                                <button 
                                                    onClick={() => handleEditInteractionSave(interaction.id)}
                                                    className="bg-orbit-600 text-white text-xs px-3 py-1 rounded hover:bg-orbit-500"
                                                >
                                                    Save Changes
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-slate-200 leading-relaxed text-sm whitespace-pre-wrap">
                                        {interaction.notes}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
      </div>

      <InteractionModal 
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        onSubmit={handleLogModalSubmit}
        initialPersonId={person.id}
      />
    </div>
  );
};
