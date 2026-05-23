import React, { useState, useMemo } from "react";
import { User, CatalogItem, ChatMessage, ConsultationQuestion, ConsultationSchedule } from "../types";
import { 
  Users, 
  BookOpen, 
  MessageSquare, 
  Settings, 
  Plus, 
  Trash2, 
  Check, 
  Search, 
  Clock, 
  Phone, 
  Calendar, 
  Compass, 
  Send,
  CalendarCheck,
  Power,
  Sparkles,
  Info,
  Mic,
  Camera,
  X,
  Square,
  Video,
  Reply,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  FileText,
  Heart,
  Mail,
  User as UserIcon,
  Paperclip
} from "lucide-react";

const ALL_SPECIALTIES = [
  "Psicologia",
  "Psicanalista",
  "Fisioterapia",
  "Optometrista",
  "Fonoaudiologia",
  "Nutricionista",
  "Massoterapeuta",
  "Odontologia",
  "Clínico geral",
  "Enfermagem"
];

interface AdminPanelProps {
  currentUser: User;
  users: User[];
  catalog: CatalogItem[];
  messages: ChatMessage[];
  questions: ConsultationQuestion[];
  schedules: ConsultationSchedule[];
  activeSpecialties: string[];
  unavailableDates: string[];
  onUpdateActiveSpecialties: (specialties: string[]) => void;
  onUpdateUnavailableDates: (dates: string[]) => void;
  
  onAddCatalogItem: (item: Omit<CatalogItem, "id">) => void;
  onDeleteCatalogItem: (id: string) => void;
  onSendMessage: (receiverId: string, text: string, attachment?: any, replyTo?: any) => void;
  onUpdateQuestions: (updatedQuestions: ConsultationQuestion[]) => void;
  onConfirmSchedule: (id: string, date: string, time: string, location: string, notes?: string, status?: any) => void;
  onUpdateSchedule: (id: string, updatedFields: any) => void;
  onDeleteSchedule: (id: string) => void;
  onDeleteUser: (userId: string) => void;
  onLogout: () => void;
}

export default function AdminPanel({
  currentUser,
  users,
  catalog,
  messages,
  questions,
  schedules,
  activeSpecialties,
  unavailableDates,
  onUpdateActiveSpecialties,
  onUpdateUnavailableDates,
  onAddCatalogItem,
  onDeleteCatalogItem,
  onSendMessage,
  onUpdateQuestions,
  onConfirmSchedule,
  onUpdateSchedule,
  onDeleteSchedule,
  onDeleteUser,
  onLogout,
}: AdminPanelProps) {
  // Navigation / views
  const [activeTab, setActiveTab] = useState<"users" | "catalog" | "chat">("users");
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // New Catalog Form State
  const [newCatalogTitle, setNewCatalogTitle] = useState("");
  const [newCatalogDesc, setNewCatalogDesc] = useState("");
  const [newCatalogPrice, setNewCatalogPrice] = useState("");
  const [newCatalogImage, setNewCatalogImage] = useState("");
  const [catalogError, setCatalogError] = useState("");

  // Chat State
  const [selectedChatUserId, setSelectedChatUserId] = useState<string | null>(null);
  const [typedMessage, setTypedMessage] = useState("");
  const [adminMailSubject, setAdminMailSubject] = useState("Retorno da Coordenação");

  // Schedule/Account Admin Management States
  const [editingAdminScheduleId, setEditingAdminScheduleId] = useState<string | null>(null);
  const [editingScheduleData, setEditingScheduleData] = useState<any>(null);
  const [confirmDeleteScheduleId, setConfirmDeleteScheduleId] = useState<string | null>(null);
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<string | null>(null);

  // New Consultation Confirmation state variables
  const [confirmingScheduleId, setConfirmingScheduleId] = useState<string | null>(null);
  const [confirmDate, setConfirmDate] = useState("");
  const [confirmTime, setConfirmTime] = useState("");
  const [confirmLocation, setConfirmLocation] = useState("Rua Farias de Brito 389 - Santa Mônica");
  const [confirmNotes, setConfirmNotes] = useState("");

  // Rich media states
  const [draftAttachment, setDraftAttachment] = useState<{
    type: 'image' | 'video' | 'audio' | 'pdf';
    url: string;
    name?: string;
  } | null>(null);

  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);

  // Audio Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const audioRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioStreamRef = React.useRef<MediaStream | null>(null);
  const audioIntervalRef = React.useRef<any>(null);

  // Live Camera states
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const cameraVideoRef = React.useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = React.useRef<MediaStream | null>(null);
  const cameraMediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const cameraVideoChunks = React.useRef<Blob[]>([]);
  const cameraIntervalRef = React.useRef<any>(null);

  // Fullscreen zoom/pan lightbox states
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxScale, setLightboxScale] = useState(1);
  const [lightboxPos, setLightboxPos] = useState({ x: 0, y: 0 });
  const [isDraggingLightbox, setIsDraggingLightbox] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
      if (cameraIntervalRef.current) clearInterval(cameraIntervalRef.current);
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // ==================== RICH MEDIA HANDLERS ====================
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      let type: 'image' | 'video' | 'pdf' = 'image';
      if (file.type.startsWith('video/')) {
        type = 'video';
      } else if (file.type === 'application/pdf') {
        type = 'pdf';
      }
      setDraftAttachment({
        type,
        url: result,
        name: file.name
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      audioRecorderRef.current = mediaRecorder;
      
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          setDraftAttachment({
            type: 'audio',
            url: reader.result as string,
            name: `Áudio Coordenação (${recordingDuration}s)`
          });
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      audioIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Erro ao acessar microfone", err);
      alert("Para enviar áudios, por favor conceda a permissão de acesso ao microfone no navegador.");
    }
  };

  const stopAudioRecording = () => {
    if (audioRecorderRef.current && isRecording) {
      audioRecorderRef.current.stop();
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    if (audioIntervalRef.current) {
      clearInterval(audioIntervalRef.current);
    }
    setIsRecording(false);
  };

  const cancelAudioRecording = () => {
    if (audioRecorderRef.current) {
      audioRecorderRef.current.onstop = null;
      audioRecorderRef.current.stop();
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    if (audioIntervalRef.current) {
      clearInterval(audioIntervalRef.current);
    }
    setIsRecording(false);
    setRecordingDuration(0);
  };

  // Camera controls
  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      cameraStreamRef.current = stream;
      setIsCameraOpen(true);
      setTimeout(() => {
        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = stream;
        }
      }, 300);
    } catch (err) {
      console.error("Erro ao acessar câmera", err);
      alert("Permita o acesso à câmera e microfone para tirar fotos ou gravar vídeos.");
    }
  };

  const closeCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(track => track.stop());
      cameraStreamRef.current = null;
    }
    if (cameraIntervalRef.current) clearInterval(cameraIntervalRef.current);
    setIsCameraOpen(false);
    setIsRecordingVideo(false);
    setVideoDuration(0);
  };

  const takePhotoSnapshot = () => {
    if (!cameraVideoRef.current) return;
    const video = cameraVideoRef.current;
    
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/png');
      setDraftAttachment({
        type: 'image',
        url: dataUrl,
        name: `Foto Admin (${new Date().toLocaleTimeString('pt-BR')})`
      });
      closeCamera();
    }
  };

  const startVideoRecording = () => {
    if (!cameraStreamRef.current) return;
    setIsRecordingVideo(true);
    setVideoDuration(0);
    cameraVideoChunks.current = [];

    const recorder = new MediaRecorder(cameraStreamRef.current);
    cameraMediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        cameraVideoChunks.current.push(e.data);
      }
    };

    recorder.onstop = () => {
      const videoBlob = new Blob(cameraVideoChunks.current, { type: 'video/mp4' });
      const reader = new FileReader();
      reader.onloadend = () => {
        setDraftAttachment({
          type: 'video',
          url: reader.result as string,
          name: `Vídeo Admin (${videoDuration}s)`
        });
      };
      reader.readAsDataURL(videoBlob);
      closeCamera();
    };

    recorder.start();
    cameraIntervalRef.current = setInterval(() => {
      setVideoDuration(prev => prev + 1);
    }, 1000);
  };

  const stopVideoRecording = () => {
    if (cameraMediaRecorderRef.current && isRecordingVideo) {
      cameraMediaRecorderRef.current.stop();
    }
  };

  // Zoom & Pan Lightbox handlers
  const handleZoomIn = () => setLightboxScale(prev => Math.min(prev + 0.25, 4));
  const handleZoomOut = () => setLightboxScale(prev => Math.max(prev - 0.25, 0.5));
  const handleZoomReset = () => {
    setLightboxScale(1);
    setLightboxPos({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingLightbox(true);
    setDragStart({ x: e.clientX - lightboxPos.x, y: e.clientY - lightboxPos.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingLightbox) return;
    setLightboxPos({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDraggingLightbox(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      setIsDraggingLightbox(true);
      setDragStart({ x: t.clientX - lightboxPos.x, y: t.clientY - lightboxPos.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingLightbox || e.touches.length !== 1) return;
    const t = e.touches[0];
    setLightboxPos({
      x: t.clientX - dragStart.x,
      y: t.clientY - dragStart.y
    });
  };
  // =============================================================

  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChatUserId) return;
    if (!typedMessage.trim() && !draftAttachment) return;
    
    const formatted = `Assunto: ${adminMailSubject.trim() || "Retorno de Coordenação"}\n\n${typedMessage.trim()}`;
    
    const attachmentArg = draftAttachment ? {
      type: draftAttachment.type,
      url: draftAttachment.url,
      name: draftAttachment.name
    } : undefined;

    const replyToArg = replyTarget ? {
      id: replyTarget.id,
      text: replyTarget.text,
      senderName: replyTarget.senderId === currentUser.id ? "Coordenação" : (users.find(u => u.id === replyTarget.senderId)?.name || "Paciente"),
      mediaUrl: replyTarget.attachment?.url,
      mediaType: replyTarget.attachment?.type
    } : undefined;

    onSendMessage(selectedChatUserId, formatted, attachmentArg, replyToArg);
    
    setTypedMessage("");
    setDraftAttachment(null);
    setReplyTarget(null);
  };
  const [editingQuestions, setEditingQuestions] = useState<ConsultationQuestion[]>(questions);
  const [newQuestionLabel, setNewQuestionLabel] = useState("");
  const [newQuestionType, setNewQuestionType] = useState<"text" | "number" | "textarea">("text");

  // Filter clients to mock messaging/listing.
  const clientsOnly = useMemo(() => {
    return users
      .filter((u) => !u.isAdmin)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [users]);

  // Alphabetically sorted client list matching search query
  const filteredClients = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return clientsOnly;
    return clientsOnly.filter(
      (c) => 
        c.name.toLowerCase().includes(q) || 
        c.email.toLowerCase().includes(q) ||
        c.phone1.includes(q) ||
        (c.phone2 && c.phone2.includes(q))
    );
  }, [clientsOnly, searchQuery]);

  // Filter catalogue matching search query
  const filteredCatalog = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return catalog;
    return catalog.filter(
      (item) => 
        item.title.toLowerCase().includes(q) || 
        item.description.toLowerCase().includes(q)
    );
  }, [catalog, searchQuery]);

  // Handle Dynamic Question addition
  const handleAddQuestion = () => {
    if (!newQuestionLabel.trim()) return;
    const newQ: ConsultationQuestion = {
      id: "q-" + Date.now(),
      label: newQuestionLabel.trim(),
      type: newQuestionType,
      required: true // mandatory as requested: "não pode pular nada, ok?"
    };
    setEditingQuestions([...editingQuestions, newQ]);
    setNewQuestionLabel("");
  };

  const handleRemoveQuestion = (id: string) => {
    setEditingQuestions(editingQuestions.filter(q => q.id !== id));
  };

  const handleSaveQuestions = () => {
    onUpdateQuestions(editingQuestions);
    setShowConfigModal(false);
  };

  // Chat target calculation
  const selectedChatUser = useMemo(() => {
    return users.find(u => u.id === selectedChatUserId) || null;
  }, [users, selectedChatUserId]);

  const activeChatMessages = useMemo(() => {
    if (!selectedChatUserId) return [];
    return messages.filter(
      (m) => 
        (m.senderId === "admin" && m.receiverId === selectedChatUserId) ||
        (m.senderId === selectedChatUserId && m.receiverId === "admin")
    ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [messages, selectedChatUserId]);

  const handleCreateMockCatalog = () => {
    onAddCatalogItem({
      title: "Clínica de Estética " + (catalog.length + 1),
      description: "Tratamentos dermatológicos personalizados de alta tecnologia para rejuvenescimento.",
      price: "R$ 190,00",
      imageUrl: "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&w=500&q=80"
    });
  };

  const handleAddCatalogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCatalogError("");
    if (!newCatalogTitle.trim() || !newCatalogDesc.trim() || !newCatalogPrice.trim()) {
      setCatalogError("Preencha título, descrição e valor.");
      return;
    }
    const defaultImg = "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=500&q=80";
    onAddCatalogItem({
      title: newCatalogTitle.trim(),
      description: newCatalogDesc.trim(),
      price: newCatalogPrice.trim(),
      imageUrl: newCatalogImage.trim() || defaultImg
    });
    setNewCatalogTitle("");
    setNewCatalogDesc("");
    setNewCatalogPrice("");
    setNewCatalogImage("");
  };

  // Get unread messages counts grouped by sender
  const unreadCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    messages.forEach(m => {
      if (m.senderId !== "admin" && !m.readByReceiver) {
        counts[m.senderId] = (counts[m.senderId] || 0) + 1;
      }
    });
    return counts;
  }, [messages]);

  return (
    <div className="min-h-screen bg-[#F3F7FA] flex flex-col">
      
      {/* Top Admin Header Bar with logo, brand colors, and search */}
      <header className="bg-brand-blue text-white shadow-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-white rounded-xl shadow-inner flex items-center justify-center">
              <img 
                src="https://i.ibb.co/F4fT9dtd/Copilot-20260522-174622.png" 
                alt="CTC Logomarca" 
                className="h-10 w-auto object-contain rounded-lg"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-brand-green text-brand-blue px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  COORDENAÇÃO
                </span>
                <span className="text-[10px] text-slate-300">Modo Gestor</span>
              </div>
              <h1 className="text-base font-bold text-white tracking-tight">Painel Corporativo CTC</h1>
            </div>
          </div>

          {/* Centralized Search Bar */}
          <div className="relative w-full md:w-96 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
            <input
              type="text"
              id="search-admin"
              placeholder="Pesquisar e-mails, nomes, catálogos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-900/40 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-green focus:border-brand-green"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-100 truncate max-w-[150px]">{currentUser.name}</p>
              <p className="text-[9px] text-slate-300">Administrador</p>
            </div>

            {/* Gear Configuration Button for dynamic consultation questions */}
            <button
              id="btn-admin-config"
              onClick={() => {
                setEditingQuestions([...questions]); // load current state
                setShowConfigModal(true);
              }}
              title="Configurar campos do agendamento"
              className="p-2.5 bg-slate-800/60 hover:bg-slate-800 rounded-xl transition text-slate-300 hover:text-white border border-slate-700/50 cursor-pointer relative"
            >
              <Settings className="w-4.5 h-4.5" />
              <span className="absolute -top-1 -right-1 bg-brand-green text-brand-blue text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {questions.length}
              </span>
            </button>

            <button
              id="btn-admin-logout"
              onClick={onLogout}
              className="p-2.5 bg-slate-800/60 hover:bg-rose-950/40 text-slate-300 hover:text-rose-400 rounded-xl transition cursor-pointer border border-slate-700/50"
              title="Encerrar Sessão"
            >
              <Power className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Section Grid */}
      <main className="max-w-7xl mx-auto w-full px-4 py-6 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Aspect: Active Schedules & Consultations Tracker */}
        <section className="lg:col-span-4 space-y-6">
          
          <div className="bg-white border border-slate-200/85 rounded-2xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-brand-blue" />
                <h2 className="text-sm font-bold text-slate-800">Consultas Agendadas</h2>
              </div>
              <span className="bg-orange-100 text-orange-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {schedules.filter(s => s.status === 'pending').length} Pendentes
              </span>
            </div>

            <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
              Consulte e valide as marcações abaixo. Após confirmar, use a aba Conversas ou WhatsApp para alinhar a data oficial.
            </p>

            <div className="space-y-3.5 max-h-[64vh] overflow-y-auto pr-1">
              {schedules.map((schedule) => (
                <div 
                  key={schedule.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    schedule.status === 'confirmed' 
                      ? "bg-slate-55 border-slate-200/90 shadow-2xs opacity-95"
                      : "bg-orange-50/50 border-orange-200 shadow-sm"
                  }`}
                >
                  <div className="flex items-start justify-between gap-1.5 mb-2.5">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 truncate max-w-[190px]">
                        {schedule.fullName || schedule.userName}
                      </h4>
                      <p className="text-[9.5px] font-semibold text-slate-500">{schedule.professionalType}</p>
                    </div>
                    {schedule.status === "confirmed" ? (
                      <span className="text-[9px] bg-green-150 text-green-800 font-extrabold px-2 py-0.5 rounded-md uppercase">
                        Confirmado
                      </span>
                    ) : schedule.status === "unavailable_date" ? (
                      <span className="text-[9px] bg-rose-150 text-rose-800 font-extrabold px-2 py-0.5 rounded-md uppercase">
                        Data Indisponível
                      </span>
                    ) : (
                      <span className="text-[9px] bg-amber-150 text-amber-800 font-extrabold px-2 py-0.5 rounded-md uppercase animate-pulse">
                        Pendente
                      </span>
                    )}
                  </div>

                  {/* Questionnaire clinical fields */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80 space-y-1.5 mb-3 text-[10.5px] text-slate-700">
                    <div>
                      <span className="text-[8.5px] uppercase font-bold text-slate-400 block tracking-wider leading-none mb-1">Dados de Contato & Idade</span>
                      <p className="font-bold text-slate-850">
                        📲 WhatsApp:{" "}
                        {schedule.whatsapp ? (
                          <a
                            href={`https://wa.me/55${schedule.whatsapp.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-brand-blue hover:text-brand-blue-hover hover:underline font-extrabold"
                            title="Abrir no WhatsApp"
                          >
                            {schedule.whatsapp} ↗
                          </a>
                        ) : (
                          <span className="text-slate-400 font-normal">(não informado)</span>
                        )}
                      </p>
                      <p>🎂 Idade: <span className="font-bold text-slate-800">{schedule.age} anos</span></p>
                    </div>

                    <div className="pt-1.5 border-t border-slate-100">
                      <span className="text-[8.5px] uppercase font-bold text-slate-400 block tracking-wider leading-none mb-1">Documentos Eleitorais & Civis</span>
                      <p>🪪 RG / CPF: <span className="font-semibold text-slate-800">{schedule.rg || "N/A"} / {schedule.cpf || "N/A"}</span></p>
                      <p>🗳️ Título: <span className="font-semibold text-slate-800">{schedule.voterCard || "N/A"}</span> (Zona {schedule.voterZone || "N/A"} / Seção {schedule.voterSection || "N/A"})</p>
                    </div>

                    <div className="pt-1.5 border-t border-slate-100">
                      <span className="text-[8.5px] uppercase font-bold text-slate-400 block tracking-wider leading-none mb-1">Endereço do Paciente</span>
                      <p className="font-semibold text-slate-850">📍 {schedule.street || "N/A"}, {schedule.number || "N/A"}</p>
                      <p className="text-[10px] text-slate-500">{schedule.neighborhood || "N/A"} - {schedule.city || "N/A"}/{schedule.state || "N/A"} ({schedule.cep || "N/A"})</p>
                      {schedule.complement && <p className="text-[10px] italic text-slate-450">Comp: {schedule.complement}</p>}
                    </div>

                    <div className="pt-1.5 border-t border-slate-100 space-y-0.5">
                      <span className="text-[8.5px] uppercase font-bold text-slate-400 block tracking-wider leading-none mb-1">Sintomas & Motivo</span>
                      <p className="bg-slate-50 p-1.5 rounded-lg border border-slate-150 italic whitespace-pre-wrap"><strong className="not-italic text-slate-600 block text-[9.5px]">🩺 Sintomas e Quadros:</strong>{schedule.symptoms}</p>
                      <p className="bg-slate-50 p-1.5 rounded-lg border border-slate-150 italic whitespace-pre-wrap"><strong className="not-italic text-slate-600 block text-[9.5px]">🎯 Motivo do Agendamento:</strong>{schedule.reason}</p>
                    </div>

                    {schedule.status === "confirmed" ? (
                      <div className="pt-2 border-t-2 border-emerald-250 bg-emerald-50/50 p-2 rounded-lg space-y-1 block">
                        <span className="text-[8.5px] uppercase font-extrabold text-emerald-800 block tracking-wider leading-none">Dados da Consulta Confirmada</span>
                        <p className="text-slate-700">📅 Data: <span className="font-black text-emerald-900">{schedule.confirmedDate || "Alinhando..."}</span></p>
                        <p className="text-slate-700">⏰ Horário: <span className="font-black text-emerald-900">{schedule.confirmedTime || "Alinhando..."}</span></p>
                        <p className="text-slate-700">🏥 Local: <span className="font-bold text-slate-805 text-[10px]">{schedule.confirmedLocation || "Rua Farias de Brito 389 - Santa Mônica"}</span></p>
                        {schedule.confirmedNotes && <p className="italic text-emerald-850 text-[10px]">Nota: {schedule.confirmedNotes}</p>}
                      </div>
                    ) : schedule.status === "unavailable_date" ? (
                      <div className="pt-2 border-t-2 border-rose-250 bg-rose-50/50 p-2 rounded-lg space-y-1 block animate-in fade-in">
                        <span className="text-[8.5px] uppercase font-extrabold text-rose-800 block tracking-wider leading-none">⚠️ Data Marcada como Indisponível</span>
                        <p className="text-slate-700">📅 Opção Sugerida: <span className="font-black text-rose-900">{schedule.confirmedDate || "Alinhando..."}</span></p>
                        <p className="text-slate-700">⏰ Horário: <span className="font-black text-rose-900">{schedule.confirmedTime || "Alinhando..."}</span></p>
                        <p className="text-slate-700">🏥 Local: <span className="font-bold text-slate-805 text-[10px]">{schedule.confirmedLocation || "Rua Farias de Brito 389 - Santa Mônica"}</span></p>
                        {schedule.confirmedNotes && <p className="italic text-rose-850 text-[10px]">Sugestão/Motivo: {schedule.confirmedNotes}</p>}
                      </div>
                    ) : (
                      <div className="pt-2 border-t border-dashed border-slate-200 bg-slate-50 p-2 rounded-lg space-y-1 block">
                        <span className="text-[8.5px] uppercase font-extrabold text-slate-500 block tracking-wider leading-none">🗓️ Horário Solicitado pelo Paciente</span>
                        <p className="text-slate-700">📅 Data Escolhida: <span className="font-extrabold text-slate-900">{schedule.confirmedDate || "(não definida)"}</span></p>
                        <p className="text-slate-700">⏰ Horário: <span className="font-extrabold text-slate-900">{schedule.confirmedTime || "(não definido)"}</span></p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      Recebido em {new Date(schedule.createdAt).toLocaleString("pt-BR", { 
                        day: "2-digit", 
                        month: "2-digit", 
                        hour: "2-digit", 
                        minute: "2-digit" 
                      })}
                    </span>
                  </div>

                  {/* Actions for Coordinator/Admin to Edit & Delete */}
                  <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-slate-200/55 mt-2.5 mb-2">
                    <button
                      onClick={() => {
                        setEditingAdminScheduleId(schedule.id);
                        setEditingScheduleData({ ...schedule });
                      }}
                      className="text-brand-blue hover:text-brand-blue-hover text-[10.5px] font-bold transition cursor-pointer"
                    >
                      Editar Dados
                    </button>

                    {confirmDeleteScheduleId === schedule.id ? (
                      <div className="flex items-center gap-1.5 animate-in fade-in zoom-in-95">
                        <span className="text-[9px] text-red-650 font-bold">Excluir?</span>
                        <button
                          onClick={() => {
                            onDeleteSchedule(schedule.id);
                            setConfirmDeleteScheduleId(null);
                          }}
                          className="bg-red-650 hover:bg-red-800 text-white text-[9px] font-bold px-1.5 py-0.5 rounded transition cursor-pointer"
                        >
                          Sim
                        </button>
                        <button
                          onClick={() => setConfirmDeleteScheduleId(null)}
                          className="text-slate-500 hover:text-slate-700 text-[9px] font-bold px-1.5 py-0.5 border rounded bg-white transition cursor-pointer"
                        >
                          Não
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteScheduleId(schedule.id)}
                        className="text-rose-600 hover:text-rose-800 text-[10px] font-bold transition cursor-pointer flex items-center gap-0.5"
                      >
                        <Trash2 className="w-3 h-3" />
                        Excluir
                      </button>
                    )}
                  </div>

                  {/* Consultation Scheduling Config inline Form */}
                  {confirmingScheduleId === schedule.id ? (
                    <div className="mt-3 p-3.5 bg-emerald-50 rounded-2xl border border-emerald-250 space-y-3 animate-in fade-in slide-in-from-top-2">
                      <p className="text-[10px] font-black text-emerald-900 uppercase tracking-wider">Revisar & Ajustar Detalhes da Consulta</p>
                      
                      <div className="space-y-2.5 text-xs">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase">Data Ajustada</label>
                            <input
                              type="date"
                              value={confirmDate}
                              onChange={(e) => setConfirmDate(e.target.value)}
                              className="w-full mt-0.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand-blue font-bold text-slate-800"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase">Horário</label>
                            <select
                              value={confirmTime}
                              onChange={(e) => setConfirmTime(e.target.value)}
                              className="w-full mt-0.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand-blue font-bold text-slate-800"
                            >
                              <option value="">(selecione)</option>
                              {["08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"].map((t) => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase">Local de Atendimento *</label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: Rua Farias de Brito 389 - Santa Mônica"
                            value={confirmLocation}
                            onChange={(e) => setConfirmLocation(e.target.value)}
                            className="w-full mt-0.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand-blue font-semibold text-slate-800"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase">Observações do Profissional / Recomendações / Justificativa</label>
                          <textarea
                            placeholder="Ex: Avisar se houver imprevistos. Ir com roupas leves."
                            rows={2.5}
                            value={confirmNotes}
                            onChange={(e) => setConfirmNotes(e.target.value)}
                            className="w-full mt-0.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand-blue resize-none"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-emerald-250">
                        <button
                          onClick={() => {
                            if (!confirmLocation.trim()) {
                              alert("Ops! Por favor insira o Local de Atendimento.");
                              return;
                            }
                            if (!confirmDate) {
                              alert("Ops! Por favor selecione uma data.");
                              return;
                            }
                            onConfirmSchedule(schedule.id, confirmDate, confirmTime, confirmLocation.trim(), confirmNotes.trim(), "confirmed");
                            setConfirmingScheduleId(null);
                            setConfirmNotes("");
                          }}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2 px-3 rounded-xl text-xs transition transition-all cursor-pointer text-center"
                        >
                          Confirmar Consulta
                        </button>
                        
                        <button
                          onClick={() => {
                            if (!confirmLocation.trim()) {
                              alert("Ops! Por favor insira o Local de Atendimento.");
                              return;
                            }
                            if (!confirmDate) {
                              alert("Ops! Por favor selecione uma data.");
                              return;
                            }
                            onConfirmSchedule(schedule.id, confirmDate, confirmTime, confirmLocation.trim(), confirmNotes.trim(), "unavailable_date");
                            setConfirmingScheduleId(null);
                            setConfirmNotes("");
                          }}
                          className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-extrabold py-2 px-3 rounded-xl text-xs transition transition-all cursor-pointer text-center"
                        >
                          ⚠️ Data Indisponível
                        </button>

                        <button
                          onClick={() => {
                            setConfirmingScheduleId(null);
                          }}
                          className="px-3 py-2 bg-slate-200 hover:bg-slate-300 rounded-xl text-xs text-slate-700 font-bold transition cursor-pointer"
                        >
                          Voltar
                        </button>
                      </div>
                    </div>
                  ) : schedule.status !== "confirmed" && (
                    <button
                      onClick={() => {
                        setConfirmingScheduleId(schedule.id);
                        setConfirmDate(schedule.confirmedDate || "");
                        setConfirmTime(schedule.confirmedTime || "");
                        setConfirmLocation("Rua Farias de Brito 389 - Santa Mônica");
                        setConfirmNotes("");
                      }}
                      className="w-full bg-brand-green hover:bg-brand-green-hover text-brand-blue font-extrabold py-2 px-3 rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-sm mt-3 border border-emerald-300"
                    >
                      <Check className="w-3.5 h-3.5" />
                      {schedule.status === "unavailable_date" ? "Re-avaliar e Confirmar Local" : "Aprovar & Confirmar Local"}
                    </button>
                  )}

                  {/* Inline clinical editor form */}
                  {editingAdminScheduleId === schedule.id && editingScheduleData ? (
                    <div className="mt-3 p-3.5 bg-slate-100 rounded-2xl border border-slate-300 space-y-3 text-xs animate-in fade-in zoom-in-95">
                      <p className="text-[10px] uppercase font-bold text-slate-500">Editar Detalhes Clínicos</p>
                      
                      <div className="space-y-2">
                        <div>
                          <label className="text-[9px] uppercase font-bold text-slate-400 block">Nome Completo</label>
                          <input
                            type="text"
                            value={editingScheduleData.fullName || ""}
                            onChange={(e) => setEditingScheduleData((prev: any) => ({ ...prev, fullName: e.target.value }))}
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-[11px]"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] uppercase font-bold text-slate-400 block">Idade</label>
                            <input
                              type="number"
                              value={editingScheduleData.age || ""}
                              onChange={(e) => setEditingScheduleData((prev: any) => ({ ...prev, age: parseInt(e.target.value) || 0 }))}
                              className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-[11px]"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] uppercase font-bold text-slate-400 block">Especialidade</label>
                            <select
                              value={editingScheduleData.professionalType || ""}
                              onChange={(e) => setEditingScheduleData((prev: any) => ({ ...prev, professionalType: e.target.value }))}
                              className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-[11px] font-bold text-slate-700"
                            >
                              {ALL_SPECIALTIES.map(st => (
                                <option key={st} value={st}>{st}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Editable Date and Time for Admin override option */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] uppercase font-bold text-slate-400 block">Data da Consulta</label>
                            <input
                              type="date"
                              value={editingScheduleData.confirmedDate || ""}
                              onChange={(e) => setEditingScheduleData((prev: any) => ({ ...prev, confirmedDate: e.target.value }))}
                              className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-[11.5px] font-bold text-slate-800"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] uppercase font-bold text-slate-400 block">Horário Selecionado</label>
                            <select
                              value={editingScheduleData.confirmedTime || ""}
                              onChange={(e) => setEditingScheduleData((prev: any) => ({ ...prev, confirmedTime: e.target.value }))}
                              className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-[11.5px] font-bold text-slate-800 text-left"
                            >
                              <option value="">(nenhum)</option>
                              {["08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"].map((t) => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] uppercase font-bold text-slate-400 block">RG</label>
                            <input
                              type="text"
                              value={editingScheduleData.rg || ""}
                              onChange={(e) => setEditingScheduleData((prev: any) => ({ ...prev, rg: e.target.value }))}
                              className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-[11px]"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] uppercase font-bold text-slate-400 block">CPF</label>
                            <input
                              type="text"
                              value={editingScheduleData.cpf || ""}
                              onChange={(e) => setEditingScheduleData((prev: any) => ({ ...prev, cpf: e.target.value }))}
                              className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-[11px]"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-1 grid-flow-row">
                          <div className="col-span-1">
                            <label className="text-[9px] uppercase font-bold text-slate-400 block">CEP</label>
                            <input
                              type="text"
                              value={editingScheduleData.cep || ""}
                              onChange={(e) => setEditingScheduleData((prev: any) => ({ ...prev, cep: e.target.value }))}
                              className="w-full px-1.5 py-1 bg-white border border-slate-300 rounded text-[11px]"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="text-[9px] uppercase font-bold text-slate-400 block">Rua</label>
                            <input
                              type="text"
                              value={editingScheduleData.street || ""}
                              onChange={(e) => setEditingScheduleData((prev: any) => ({ ...prev, street: e.target.value }))}
                              className="w-full px-1.5 py-1 bg-white border border-slate-300 rounded text-[11px]"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[9px] uppercase font-bold text-slate-400 block">Sintomas</label>
                          <textarea
                            value={editingScheduleData.symptoms || ""}
                            onChange={(e) => setEditingScheduleData((prev: any) => ({ ...prev, symptoms: e.target.value }))}
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-[11px] resize-none"
                            rows={2.5}
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-slate-200">
                        <button
                          onClick={() => {
                            onUpdateSchedule(schedule.id, editingScheduleData);
                            setEditingAdminScheduleId(null);
                            setEditingScheduleData(null);
                          }}
                          className="flex-1 bg-brand-blue text-white font-bold py-1.5 px-3 rounded-lg text-[11px] cursor-pointer"
                        >
                          Salvar Alterações
                        </button>
                        <button
                          onClick={() => {
                            setEditingAdminScheduleId(null);
                            setEditingScheduleData(null);
                          }}
                          className="bg-slate-350 text-slate-700 py-1.5 px-2.5 rounded-lg text-[11px] cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : null}

                </div>
              ))}

              {schedules.length === 0 && (
                <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p className="text-xs text-slate-400">Nenhuma consulta agendada no momento.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Right Aspect: Users list, catalogue editor, or conversation tracker layout */}
        <section className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[500px]">
          
          {/* Section Navigation Tabs */}
          <div className="flex bg-slate-50 border-b border-slate-200 px-4 pt-2">
            <button
              onClick={() => setActiveTab("users")}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 -mb-px transition-all cursor-pointer ${
                activeTab === "users"
                  ? "border-brand-blue text-brand-blue bg-white rounded-t-xl"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Users className="w-4 h-4" />
              Lista de Pessoas ({clientsOnly.length})
            </button>
            <button
              id="tab-catalog"
              onClick={() => setActiveTab("catalog")}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 -mb-px transition-all cursor-pointer ${
                activeTab === "catalog"
                  ? "border-brand-blue text-brand-blue bg-white rounded-t-xl"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Visualizador de Catálogo ({catalog.length})
            </button>
            <button
              id="tab-chats"
              onClick={() => setActiveTab("chat")}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 -mb-px transition-all cursor-pointer relative ${
                activeTab === "chat"
                  ? "border-brand-blue text-brand-blue bg-white rounded-t-xl"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Conversas
              {Object.keys(unreadCounts).length > 0 && (
                <span className="absolute top-1 right-2 bg-brand-green text-brand-blue font-extrabold text-[9px] w-4 h-4 rounded-full flex items-center justify-center animate-bounce">
                  {Object.keys(unreadCounts).length}
                </span>
              )}
            </button>
          </div>

          <div className="p-5 flex-1 flex flex-col overflow-hidden">
            
            {/* VIEW 1: Alphabetical Registered Users with age, emails & up to 2 whatsapp slots */}
            {activeTab === "users" && (
              <div className="space-y-4 flex-1 flex flex-col">
                <div className="flex items-center justify-between border-b pb-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">E-mails e Nomes Cadastrados</h3>
                    <p className="text-[11px] text-slate-400">Ordenados alfabeticamente para um gerenciamento profissional.</p>
                  </div>
                  {searchQuery && (
                    <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                      Filtrado por: &quot;{searchQuery}&quot;
                    </span>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto max-h-[60vh] space-y-2 pr-1">
                  {filteredClients.map((client) => {
                    const clientSchedules = schedules.filter(s => s.userId === client.id);
                    return (
                      <div 
                        key={client.id}
                        className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200/60 rounded-xl p-3.5 transition flex flex-col md:flex-row md:items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-slate-800">{client.name}</h4>
                            <span className="bg-brand-blue/10 text-brand-blue text-[9px] font-bold px-1.5 py-0.5 rounded">
                              {client.age} anos
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5">{client.email}</p>
                          
                          {/* Whatsapp display */}
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 rounded px-2 py-0.5 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-emerald-600" />
                              WhatsApp 1: {client.phone1}
                            </span>
                            {client.phone2 && (
                              <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 rounded px-2 py-0.5 flex items-center gap-1">
                                <Phone className="w-3 h-3 text-emerald-600" />
                                WhatsApp 2: {client.phone2}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                          <button
                            onClick={() => {
                              const cleanedPhone = (client.phone1 || "").replace(/\D/g, "");
                              const text = encodeURIComponent(`Olá, ${client.name}! Sou o coordenador do CTC e gostaria de falar sobre seu atendimento.`);
                              window.open(`https://wa.me/55${cleanedPhone}?text=${text}`, "_blank");
                            }}
                            className="bg-brand-blue hover:bg-brand-blue-hover text-white text-xs font-semibold py-1.5 px-3 rounded-lg transition flex items-center gap-1 cursor-pointer animate-in fade-in"
                          >
                            <Phone className="w-3 h-3 text-white shrink-0" />
                            Conversar (WhatsApp)
                          </button>

                          {/* Delete Client Account with double-click confirm state */}
                          {confirmDeleteUserId === client.id ? (
                            <div className="flex items-center gap-1 animate-in fade-in zoom-in-95">
                              <span className="text-[10px] text-red-650 font-bold">Excluir Conta?</span>
                              <button
                                onClick={() => {
                                  onDeleteUser(client.id);
                                  setConfirmDeleteUserId(null);
                                }}
                                className="bg-red-650 hover:bg-red-800 text-white text-[10px] font-extrabold px-2 py-1 rounded transition cursor-pointer"
                              >
                                Sim
                              </button>
                              <button
                                onClick={() => setConfirmDeleteUserId(null)}
                                className="text-slate-500 hover:text-slate-700 text-[10px] font-bold px-2 py-1 border rounded bg-white transition cursor-pointer"
                              >
                                Não
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteUserId(client.id)}
                              className="text-slate-400 hover:text-rose-650 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer flex items-center justify-center"
                              title="Excluir cadastro da conta deste paciente"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {filteredClients.length === 0 && (
                    <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <p className="text-xs text-slate-400">Nenhum cliente cadastrado corresponde à busca.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VIEW 2: Catalogue Settings & Management */}
            {activeTab === "catalog" && (
              <div className="space-y-5 flex-1 flex flex-col overflow-y-auto max-h-[64vh]">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  
                  {/* Create item form */}
                  <div className="bg-slate-50/50 border border-slate-200 p-4 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-700">Inserir Novo Item no Catálogo</h4>
                      <button
                        type="button"
                        onClick={handleCreateMockCatalog}
                        className="text-[10px] text-brand-blue hover:underline font-semibold"
                      >
                        Gerar Automático
                      </button>
                    </div>
                    {catalogError && <p className="text-[10px] text-red-600">{catalogError}</p>}
                    
                    <form onSubmit={handleAddCatalogSubmit} className="space-y-2.5">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Título do Serviço/Produto *</label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: Consulta Endocrinologia"
                          value={newCatalogTitle}
                          onChange={(e) => setNewCatalogTitle(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-brand-blue outline-none transition"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Breve Descrição *</label>
                        <textarea
                          required
                          placeholder="Ex: Avaliação metabólica completa para..."
                          value={newCatalogDesc}
                          onChange={(e) => setNewCatalogDesc(e.target.value)}
                          rows={2}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-brand-blue outline-none transition resize-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Preço *</label>
                          <input
                            type="text"
                            required
                            placeholder="R$ 150,00"
                            value={newCatalogPrice}
                            onChange={(e) => setNewCatalogPrice(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-brand-blue outline-none transition"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">URL da Imagem (Opcional)</label>
                          <input
                            type="url"
                            placeholder="https://..."
                            value={newCatalogImage}
                            onChange={(e) => setNewCatalogImage(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-brand-blue outline-none transition"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-brand-blue hover:bg-brand-blue-hover text-white text-xs font-bold py-2 rounded-lg transition flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <Plus className="w-4 h-4" />
                        Adicionar ao Catálogo
                      </button>
                    </form>
                  </div>

                  {/* Active List Preview */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-700">Catálogo Ativo no Aplicativo</h4>
                    <p className="text-[10px] text-slate-400">Estes itens são exibidos para os usuários em seus respectivos painéis.</p>
                    
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {filteredCatalog.map((item) => (
                        <div 
                          key={item.id}
                          className="flex gap-2.5 items-center p-2.5 bg-slate-50 border border-slate-150 rounded-lg hover:shadow-xs transition"
                        >
                          <img 
                            src={item.imageUrl || "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=500&q=80"}
                            alt={item.title}
                            className="w-12 h-12 rounded object-cover border border-slate-200 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div className="flex-1 truncate">
                            <h5 className="text-xs font-bold text-slate-800 truncate">{item.title}</h5>
                            <p className="text-[10px] text-slate-400 truncate mt-0.5">{item.description}</p>
                            <span className="text-[10px] font-semibold text-brand-blue">{item.price}</span>
                          </div>
                          <button
                            onClick={() => onDeleteCatalogItem(item.id)}
                            className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded duration-150 cursor-pointer"
                            title="Remover Item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}

                      {filteredCatalog.length === 0 && (
                        <p className="text-xs italic text-slate-400 text-center py-6">O catálogo está vazio.</p>
                      )}
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* VIEW 3: Full Interpersonal Chat Room */}
            {activeTab === "chat" && (
              <div className="flex-1 flex flex-col md:flex-row gap-4 overflow-hidden max-h-[60vh]">
                
                {/* Chat users list */}
                <div className="w-full md:w-64 border-r border-slate-100 pr-2 overflow-y-auto space-y-1">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
                    Selecionar Paciente
                  </div>
                  {clientsOnly.map((c) => {
                    const isSelected = selectedChatUserId === c.id;
                    const unreadCount = unreadCounts[c.id] || 0;
                    return (
                      <button
                        key={c.id}
                        onClick={() => setSelectedChatUserId(c.id)}
                        className={`w-full text-left p-2.5 rounded-lg text-xs transition-all flex items-center justify-between ${
                          isSelected 
                            ? "bg-brand-blue text-white font-semibold"
                            : "bg-slate-50 hover:bg-slate-100 text-slate-700"
                        }`}
                      >
                        <div className="truncate pr-2">
                          <p className="truncate block font-medium">{c.name}</p>
                          <p className={`text-[9px] truncate ${isSelected ? "text-slate-200" : "text-slate-400"}`}>
                            {c.email}
                          </p>
                        </div>
                        {unreadCount > 0 && !isSelected && (
                          <span className="bg-brand-green text-brand-blue hover:text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center shrink-0">
                            {unreadCount}
                          </span>
                        )}
                      </button>
                    );
                  })}

                  {clientsOnly.length === 0 && (
                    <div className="text-center py-4 text-xs italic text-slate-400">
                      Nenhum outro usuário cadastrado para conversar.
                    </div>
                  )}
                </div>

                {/* Active thread display */}
                <div className="flex-1 flex flex-col bg-slate-50 border border-slate-200/80 rounded-xl overflow-hidden p-3 min-h-[300px]">
                  {selectedChatUser ? (
                    <>
                      {/* Chat target label */}
                      <div className="border-b border-slate-200 pb-2 mb-3 flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-slate-800">{selectedChatUser.name}</h4>
                          <p className="text-[10px] text-slate-400">{selectedChatUser.email}</p>
                        </div>
                        <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded text-slate-600 font-mono">
                          WhatsApp: {selectedChatUser.phone1}
                        </span>
                      </div>

                      {/* Chat scroll feed */}
                      <div className="flex-1 overflow-y-auto space-y-3 mb-3 p-1 max-h-[40vh] bg-slate-50/50 rounded-xl border border-slate-100 p-3">
                        {activeChatMessages.map((m) => {
                          const isAdminSender = m.senderId === "admin";
                          
                          // Parse subject and contents if any
                          const mailMatch = m.text.match(/^Assunto:\s*(.*?)\n\n([\s\S]*)$/);
                          const subjectText = mailMatch ? mailMatch[1] : "Mensagem Geral";
                          const bodyText = mailMatch ? mailMatch[2] : m.text;

                          const senderName = m.senderId === "admin" ? "Coordenação (Você)" : (selectedChatUser.name || "Paciente");

                          return (
                            <div 
                              key={m.id}
                              className={`flex ${isAdminSender ? "justify-end" : "justify-start"} group relative`}
                            >
                              <div className={`max-w-[85%] rounded-xl shadow-2xs border ${
                                isAdminSender 
                                  ? "bg-gradient-to-br from-blue-50 to-indigo-50/60 border-blue-100 text-slate-800"
                                  : "bg-gradient-to-br from-emerald-50/60 to-teal-50/40 border-slate-200 text-slate-855"
                              } p-3 text-xs w-full relative`}>
                                
                                {/* Envelope-like official headers */}
                                <div className="flex items-center justify-between pb-1.5 border-b border-dashed border-slate-200/80 mb-2 select-none">
                                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase truncate">De: {senderName}</span>
                                    <span className="text-[9px] font-semibold text-slate-500 truncate">Assunto: {subjectText}</span>
                                  </div>

                                  {/* Reply hover block */}
                                  <button
                                    type="button"
                                    onClick={() => setReplyTarget(m)}
                                    title="Responder/Citar esta mensagem"
                                    className="opacity-0 group-hover:opacity-100 transition p-1 hover:bg-slate-250/50 rounded text-slate-500 cursor-pointer ml-1"
                                  >
                                    <Reply className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                {/* Quoted Reference display */}
                                {m.replyTo && (
                                  <div className="bg-slate-900/5 border-l-4 border-brand-green p-1.5 rounded-lg mb-2 text-[10px] text-slate-650 block select-none">
                                    <span className="font-extrabold text-[8px] text-brand-green uppercase tracking-wide block">Em resposta a {m.replyTo.senderName}</span>
                                    <p className="truncate italic font-sans">{m.replyTo.text.replace(/^Assunto:.*?\n\n/g, "") || "Mídia"}</p>
                                    {m.replyTo.mediaUrl && (
                                      <span className="text-[8px] text-slate-450 block mt-0.5">📂 Mídia Citada ({m.replyTo.mediaType})</span>
                                    )}
                                  </div>
                                )}

                                <p className="whitespace-pre-wrap leading-relaxed font-sans text-slate-700">{bodyText}</p>
                                
                                {/* Media Attachment rendering */}
                                {m.attachment && (
                                  <div className="mt-2.5 pt-2 border-t border-dashed border-slate-200/50">
                                    {m.attachment.type === 'image' && (
                                      <div 
                                        onClick={() => { setLightboxUrl(m.attachment!.url); handleZoomReset(); }}
                                        className="relative group/img cursor-zoom-in rounded-lg overflow-hidden border border-slate-250 bg-white max-w-xs transition-transform duration-200 hover:scale-101"
                                      >
                                        <img 
                                          src={m.attachment.url} 
                                          alt={m.attachment.name || "Imagem do Portal"} 
                                          className="max-h-48 w-auto object-cover rounded-lg group-hover/img:brightness-95 transition"
                                          referrerPolicy="no-referrer"
                                        />
                                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition flex items-center justify-center text-white text-[9px] font-bold gap-1">
                                          <Search className="w-3.5 h-3.5 text-brand-green" /> Ver em Tela Cheia & Zoom
                                        </div>
                                      </div>
                                    )}

                                    {m.attachment.type === 'video' && (
                                      <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-950 p-0.5 max-w-xs shadow-3xs">
                                        <video 
                                          src={m.attachment.url} 
                                          controls 
                                          className="max-h-48 w-full object-contain rounded-lg" 
                                        />
                                        {m.attachment.name && (
                                          <p className="p-1 px-2 text-[8px] text-slate-400 truncate bg-slate-900 border-t border-slate-800">
                                            📹 {m.attachment.name}
                                          </p>
                                        )}
                                      </div>
                                    )}

                                    {m.attachment.type === 'audio' && (
                                      <div className="bg-slate-100 p-2 rounded-xl border border-slate-200 flex items-center gap-2 max-w-xs">
                                        <div className="p-1.5 bg-brand-blue text-white rounded-lg shrink-0">
                                          <Mic className="w-3.5 h-3.5 text-brand-green" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <audio src={m.attachment.url} controls className="w-full h-8 outline-none" />
                                          <span className="text-[7px] font-extrabold text-slate-400 block tracking-widest mt-1">MENSAGEM DE VOZ</span>
                                        </div>
                                      </div>
                                    )}

                                    {m.attachment.type === 'pdf' && (
                                      <div className="bg-white p-2 border border-slate-250 rounded-xl flex items-center justify-between gap-1 max-w-xs shadow-3xs">
                                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                          <div className="p-1.5 bg-rose-50 text-rose-600 rounded-xl shrink-0">
                                            <FileText className="w-5 h-5 stroke-1.5" />
                                          </div>
                                          <div className="min-w-0 flex-1">
                                            <h5 className="text-[10px] font-bold text-slate-800 truncate leading-tight">{m.attachment.name || "exame.pdf"}</h5>
                                            <span className="text-[8px] text-slate-455 uppercase tracking-widest font-mono">PDF SEGURO</span>
                                          </div>
                                        </div>
                                        <a 
                                          href={m.attachment.url} 
                                          download={m.attachment.name || "documento_coord.pdf"} 
                                          className="bg-brand-blue hover:bg-brand-blue-hover text-white text-[9px] font-bold px-2 py-1 rounded-lg shrink-0 flex items-center gap-0.5 transition cursor-pointer"
                                        >
                                          <Download className="w-2.5 h-2.5 text-brand-green" /> Baixar
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                )}

                                <span className="text-[8px] block text-right mt-1.5 text-slate-400 select-none">
                                  {new Date(m.timestamp).toLocaleDateString("pt-BR")} às {new Date(m.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>
                            </div>
                          );
                        })}

                        {activeChatMessages.length === 0 && (
                          <div className="text-center py-12 text-xs italic text-slate-400">
                            Nenhuma mensagem registrada. Envie um aviso ou instrução para começar a conversar!
                          </div>
                        )}
                      </div>

                      {/* Send Form input with rich attachments capability */}
                      <form onSubmit={handleSendChatMessage} className="p-3 bg-slate-50 rounded-xl border border-slate-100 shadow-3xs flex flex-col gap-2">
                        
                        {/* Quoted Message Reference Banner */}
                        {replyTarget && (
                          <div className="bg-indigo-50 border border-indigo-200 border-b-none p-2 rounded-t-lg flex justify-between items-center text-[10px] select-none animate-in fade-in duration-150">
                            <div className="min-w-0 flex-1 flex items-center gap-1.5 text-slate-650">
                              <Reply className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              <span className="truncate">
                                Citação do Paciente <strong className="text-indigo-600 font-bold">{replyTarget.senderId === currentUser.id ? "Coordenação" : selectedChatUser.name}</strong>: {replyTarget.text.replace(/^Assunto:.*?\n\n/g, "").slice(0, 75)}...
                              </span>
                            </div>
                            <button type="button" onClick={() => setReplyTarget(null)} className="text-slate-400 hover:text-slate-605 p-0.5 cursor-pointer ml-1">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {/* Pending Attachment Draft Banner */}
                        {draftAttachment && (
                          <div className="bg-emerald-50 border border-emerald-200 border-b-none p-2 rounded-t-lg flex justify-between items-center text-[10px] select-none animate-in fade-in duration-150">
                            <div className="flex items-center gap-2 min-w-0">
                              {draftAttachment.type === 'image' && (
                                <img src={draftAttachment.url} className="w-8 h-8 object-cover rounded border border-slate-200" referrerPolicy="no-referrer" />
                              )}
                              {draftAttachment.type === 'video' && (
                                <div className="w-8 h-8 bg-slate-900 rounded flex items-center justify-center text-white font-bold text-[8px]">📹 MP4</div>
                              )}
                              {draftAttachment.type === 'audio' && (
                                <div className="w-8 h-8 bg-brand-blue rounded flex items-center justify-center"><Mic className="w-3.5 h-3.5 text-brand-green" /></div>
                              )}
                              {draftAttachment.type === 'pdf' && (
                                <div className="w-8 h-8 bg-rose-100 rounded flex items-center justify-center text-rose-600"><FileText className="w-4 h-4" /></div>
                              )}
                              <div className="truncate flex-1">
                                <span className="font-extrabold text-emerald-800 uppercase text-[8px] block">Draft pendente ({draftAttachment.type})</span>
                                <span className="text-slate-500 truncate block text-[9px] max-w-md">{draftAttachment.name || "Mídia pronta"}</span>
                              </div>
                            </div>
                            <button type="button" onClick={() => setDraftAttachment(null)} className="text-slate-400 hover:text-slate-605 p-0.5 cursor-pointer ml-1">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {/* Live audio record panel status */}
                        {isRecording && (
                          <div className="bg-rose-50 border border-rose-200 border-b-none p-2 rounded-t-lg flex items-center justify-between gap-2 animate-pulse select-none">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 bg-rose-600 rounded-full animate-ping shrink-0" />
                              <div>
                                <span className="text-[8px] font-bold text-rose-700 uppercase block tracking-wider">GRAVANDO ÁUDIO COORDENAÇÃO...</span>
                                <span className="text-[10px] font-bold font-mono text-slate-655 leading-none">{recordingDuration} segundos lidos</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button 
                                type="button" 
                                onClick={cancelAudioRecording} 
                                className="bg-white hover:bg-slate-100 text-slate-600 text-[9px] font-semibold px-2 py-1 rounded border border-slate-200 cursor-pointer"
                              >
                                <X className="w-3 h-3 text-rose-500 inline mr-0.5" /> Cancelar
                              </button>
                              <button 
                                type="button" 
                                onClick={stopAudioRecording} 
                                className="bg-rose-600 hover:bg-rose-700 text-white text-[9px] font-bold px-2 py-1 rounded flex items-center gap-0.5 cursor-pointer"
                              >
                                <Square className="w-2.5 h-2.5 text-white fill-white shrink-0" /> Finalizar
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Live webcam direct capturing status overlay */}
                        {isCameraOpen && (
                          <div className="bg-slate-900 border border-slate-800 border-b-none text-white p-2 rounded-t-lg flex flex-col gap-1.5 select-none animate-in fade-in duration-150">
                            <div className="relative rounded overflow-hidden bg-black max-w-xs mx-auto aspect-video border border-slate-850">
                              <video ref={cameraVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                              
                              {isRecordingVideo && (
                                <span className="absolute top-1.5 left-1.5 bg-red-650/80 text-white text-[8px] font-mono font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 animate-pulse">
                                  ● COORD - GRAVANDO ({videoDuration}s)
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center justify-between gap-1 max-w-xs mx-auto w-full">
                              <button 
                                type="button" 
                                onClick={closeCamera} 
                                className="bg-white/15 hover:bg-white/25 text-[8px] font-bold px-2 py-1 rounded"
                              >
                                Fechar
                              </button>

                              <div className="flex items-center gap-1">
                                {!isRecordingVideo ? (
                                  <>
                                    <button 
                                      type="button" 
                                      onClick={takePhotoSnapshot} 
                                      className="bg-brand-green hover:bg-emerald-400 text-brand-blue text-[8px] font-bold px-2 py-1 rounded flex items-center gap-0.5 cursor-pointer"
                                    >
                                      <Camera className="w-3 h-3" /> Foto snapshot
                                    </button>
                                    <button 
                                      type="button" 
                                      onClick={startVideoRecording} 
                                      className="bg-rose-600 hover:bg-rose-750 text-white text-[8px] font-bold px-2 py-1 rounded flex items-center gap-0.5 cursor-pointer"
                                    >
                                      <Video className="w-3 h-3 text-white" /> Gravar
                                    </button>
                                  </>
                                ) : (
                                  <button 
                                    type="button" 
                                    onClick={stopVideoRecording} 
                                    className="bg-rose-500 hover:bg-rose-600 text-white text-[8px] font-extrabold px-3 py-1 rounded flex items-center gap-0.5 cursor-pointer animate-pulse"
                                  >
                                    ● Parar & Anexar
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Mail Subject line wrapper */}
                        <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-slate-200/65">
                          <span className="text-[9px] text-slate-400 font-bold uppercase select-none">Assunto:</span>
                          <input 
                            type="text"
                            required
                            value={adminMailSubject}
                            onChange={(e) => setAdminMailSubject(e.target.value)}
                            placeholder="Digite o assunto que aparece no topo do e-mail..."
                            className="flex-1 bg-transparent text-xs text-slate-800 outline-none border-none py-0.5 font-semibold placeholder:font-normal placeholder:text-slate-400"
                          />
                        </div>

                        {/* Interactive message controls line */}
                        <div className="flex gap-1.5 items-center">
                          
                          {/* Audio recorder trigger */}
                          <button
                            type="button"
                            disabled={isRecording}
                            onClick={startAudioRecording}
                            title="Tirar/Gravar áudio do microfone"
                            className="p-1.5 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 rounded-lg border border-slate-200/80 transition shrink-0 cursor-pointer"
                          >
                            <Mic className="w-3.5 h-3.5 text-brand-blue" />
                          </button>

                          {/* camera snapshot/video trigger */}
                          <button
                            type="button"
                            onClick={openCamera}
                            title="Usar webcam (tirar foto ou gravar vídeo)"
                            className="p-1.5 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 rounded-lg border border-slate-200/80 transition shrink-0 cursor-pointer"
                          >
                            <Camera className="w-3.5 h-3.5 text-brand-green" />
                          </button>

                          {/* devices directory files selector */}
                          <label 
                            title="Anexar arquivos de mídia local do dispositivo"
                            className="p-1.5 bg-white hover:bg-slate-55 text-slate-550 hover:text-slate-855 rounded-lg border border-slate-200/80 transition shrink-0 cursor-pointer flex items-center justify-center animate-pulse"
                          >
                            <Paperclip className="w-3.5 h-3.5" />
                            <input 
                              type="file" 
                              accept="image/*,video/*,application/pdf" 
                              className="hidden" 
                              onChange={handleFileChange} 
                            />
                          </label>

                          <input
                            type="text"
                            required={!draftAttachment}
                            placeholder="Digite aqui o seu retorno positivo para este canal..."
                            value={typedMessage}
                            onChange={(e) => setTypedMessage(e.target.value)}
                            className="flex-1 bg-white border border-slate-205 px-3 py-1.5 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand-blue border-slate-200 shrink-0 min-w-0"
                          />

                          <button
                            type="submit"
                            title="Enviar E-mail de Retorno"
                            className="bg-brand-blue hover:bg-brand-blue-hover text-white py-1.5 px-3.5 rounded-xl duration-150 flex flex-col gap-0.5 items-center justify-center shrink-0 cursor-pointer text-[10px] select-none shadow-xs self-stretch"
                          >
                            <Send className="w-3 h-3 text-brand-green" />
                            <span className="text-[7px] font-bold uppercase">Enviar</span>
                          </button>
                        </div>
                      </form>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-white/50 rounded-xl border border-dashed border-slate-200">
                      <MessageSquare className="w-10 h-10 text-slate-300 mb-2 animate-bounce" />
                      <p className="text-xs font-semibold text-slate-500">Selecione uma conversa ao lado</p>
                      <p className="text-[10px] text-slate-400 mt-1 max-w-xs leading-relaxed">
                        Inicie conversações com os pacientes para repassar orientações pós-agendamento ou esclarecer questionários de saúde.
                      </p>
                    </div>
                  )}
                </div>

              </div>
            )}

          </div>
        </section>

      </main>

      {/* MODAL: Dynamic Consultation Questions Setup (Engrenagem click dialog) */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <div className="bg-brand-blue text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-brand-green" />
                <div>
                  <h3 className="text-sm font-bold">Campos do Cadastro de Consulta</h3>
                  <p className="text-[10px] text-slate-300">Escolha o que a pessoa deverá preencher obrigatoriamente</p>
                </div>
              </div>
              <button 
                onClick={() => setShowConfigModal(false)}
                className="text-white/80 hover:text-white text-xs font-bold bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-lg"
              >
                Voltar
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-[11px] text-slate-600 flex items-start gap-2">
                <Info className="w-4 h-4 text-brand-blue shrink-0 mt-0.5" />
                <div>
                  Todas as perguntas adicionadas aqui serão requisitadas eletronicamente na tela do paciente no momento do agendamento. Conforme as regras, elas são de preenchimento <strong>estritamente obrigatório</strong>.
                </div>
              </div>

              {/* Existing questions form builder list */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Perguntas Configuradas:</span>
                <div className="space-y-1.5">
                  {editingQuestions.map((q, index) => (
                    <div 
                      key={q.id}
                      className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-lg text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-brand-blue/10 text-brand-blue font-bold w-5 h-5 rounded-full flex items-center justify-center">
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-bold text-slate-700">{q.label}</p>
                          <p className="text-[9px] text-slate-400 capitalize">Tipo: {q.type === 'textarea' ? 'campo de texto longo' : q.type}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(q.id)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                        title="Remover pergunta"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {editingQuestions.length === 0 && (
                    <p className="text-xs text-slate-400 italic text-center py-4 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                      Nenhuma pergunta configurada. Adicione pelo menos uma pergunta de triagem!
                    </p>
                  )}
                </div>
              </div>

              {/* Add New Question Section */}
              <div className="bg-slate-50/60 p-3.5 rounded-xl border border-slate-200 space-y-3">
                <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Adicionar Novo Campo</span>
                
                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Pergunta/Inquérito: *</label>
                    <input
                      type="text"
                      placeholder="Ex: Qual o principal sintoma?"
                      value={newQuestionLabel}
                      onChange={(e) => setNewQuestionLabel(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-brand-blue"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Tipo de Campo:</label>
                      <select
                        value={newQuestionType}
                        onChange={(e) => setNewQuestionType(e.target.value as any)}
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-brand-blue"
                      >
                        <option value="text">Texto Curto</option>
                        <option value="number">Número</option>
                        <option value="textarea">Texto Longo</option>
                      </select>
                    </div>

                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={handleAddQuestion}
                        className="w-full bg-brand-blue hover:bg-brand-blue-hover text-white text-xs font-bold py-1.5 rounded-lg transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Inserir (+)
                      </button>
                    </div>
                  </div>
                </div>

              </div>

              {/* Active care specialties control list */}
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Profissionais / Especialidades Ativas:</span>
                <p className="text-[10px] text-slate-550 leading-relaxed">
                  Marque abaixo os profissionais que estão atendendo no momento para habilitar o agendamento deles.
                </p>
                
                <div className="grid grid-cols-2 gap-2 mt-2 bg-slate-55 p-3 rounded-2xl border border-slate-200/50">
                  {ALL_SPECIALTIES.map((spec) => {
                    const isSelected = (activeSpecialties || []).includes(spec);
                    return (
                      <button 
                        key={spec}
                        type="button"
                        onClick={() => {
                          const currentList = activeSpecialties || [];
                          if (isSelected) {
                            onUpdateActiveSpecialties(currentList.filter(x => x !== spec));
                          } else {
                            onUpdateActiveSpecialties([...currentList, spec]);
                          }
                        }}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-[11px] font-bold transition-all cursor-pointer select-none text-left ${
                          isSelected 
                            ? "bg-brand-blue/10 border-brand-blue text-brand-blue" 
                            : "bg-white border-slate-200 text-slate-650 hover:bg-slate-50"
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                          isSelected ? "border-brand-blue bg-brand-blue text-white" : "border-slate-300 bg-white"
                        }`}>
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </span>
                        <span className="truncate">{spec}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Unavailable calendar dates control */}
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">⚠️ Calendário - Datas Indisponíveis:</span>
                <p className="text-[10px] text-slate-550 leading-relaxed">
                  Adicione abaixo as datas específicas em que a clínica estará fechada ou sem profissionais disponíveis. Pacientes não conseguirão agendar nessas datas.
                </p>
                
                {/* Add new unavailable date form */}
                <div className="flex gap-2 items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200/50">
                  <input 
                    type="date"
                    id="new-unavailable-date-input"
                    className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 outline-none focus:ring-1 focus:ring-brand-blue font-bold flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById("new-unavailable-date-input") as HTMLInputElement;
                      if (!input || !input.value) {
                        alert("Por favor, selecione uma data.");
                        return;
                      }
                      const dateVal = input.value;
                      if ((unavailableDates || []).includes(dateVal)) {
                        alert("Esta data já foi marcada como indisponível.");
                        return;
                      }
                      onUpdateUnavailableDates([...(unavailableDates || []), dateVal]);
                      input.value = "";
                    }}
                    className="bg-brand-blue hover:bg-brand-blue-hover text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer text-center"
                  >
                    Marcar Indisponível
                  </button>
                </div>

                {/* Listing current unavailable dates */}
                <div className="flex flex-wrap gap-2 mt-2 max-h-40 overflow-y-auto p-1">
                  {(unavailableDates || []).map((dateStr) => {
                    const [year, month, day] = dateStr.split("-");
                    const formatted = `${day}/${month}/${year}`;
                    return (
                      <span 
                        key={dateStr}
                        className="text-[10px] bg-red-50 text-red-800 border border-red-200 rounded-lg px-2 py-1 flex items-center gap-1.5 font-bold animate-in fade-in"
                      >
                        📅 {formatted}
                        <button
                          type="button"
                          onClick={() => {
                            onUpdateUnavailableDates((unavailableDates || []).filter(d => d !== dateStr));
                          }}
                          className="hover:text-red-950 font-black cursor-pointer bg-red-100 px-1 rounded hover:bg-red-200 ml-0.5 text-[9px]"
                        >
                          ✕
                        </button>
                      </span>
                    );
                  })}
                  {(unavailableDates || []).length === 0 && (
                    <p className="text-[10px] italic text-slate-400 py-1">Nenhuma data marcada como indisponível no momento.</p>
                  )}
                </div>
              </div>

            </div>

            {/* Bottom Actions */}
            <div className="bg-slate-50 p-4 border-t border-slate-100 flex gap-2 justify-end">
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-xl text-xs font-semibold text-slate-700 transition"
              >
                Cancelar
              </button>
              <button
                id="btn-save-questions"
                onClick={handleSaveQuestions}
                className="px-5 py-2 bg-brand-green hover:bg-brand-green-hover text-brand-blue font-bold rounded-xl text-xs transition shadow-sm"
              >
                Salvar Cadastro de Consulta
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ==================== INTERACTIVE LIGHTBOX MODAL WITH ZOOM & PAN ==================== */}
      {lightboxUrl && (
        <div 
          className="fixed inset-0 bg-slate-950/95 z-50 flex flex-col items-center justify-center animate-in fade-in"
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Header Controls */}
          <div className="absolute top-0 inset-x-0 p-4 bg-slate-900/45 flex items-center justify-between text-white select-none z-10">
            <span className="text-xs font-bold font-sans flex items-center gap-1.5">
              🔍 Visualizador Interativo CTC <span className="bg-brand-green text-brand-blue text-[9px] font-bold px-1.5 py-0.5 rounded">Zoom: {Math.round(lightboxScale * 100)}%</span>
            </span>
            <div className="flex items-center gap-2">
              <button 
                type="button"
                onClick={handleZoomIn} 
                title="Aumentar Zoom"
                className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-all cursor-pointer"
              >
                <ZoomIn className="w-4 h-4 text-brand-green" />
              </button>
              <button 
                type="button"
                onClick={handleZoomOut} 
                title="Diminuir Zoom"
                className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-all cursor-pointer"
              >
                <ZoomOut className="w-4 h-4 text-brand-green" />
              </button>
              <button 
                type="button"
                onClick={handleZoomReset} 
                title="Tamanho Normal"
                className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-white" />
              </button>
              <button 
                type="button"
                onClick={() => setLightboxUrl(null)} 
                title="Fechar (Esc)"
                className="bg-rose-600/90 hover:bg-rose-700/90 p-2 rounded-lg transition-all ml-2 cursor-pointer"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          {/* Zoom stage container with panning physics support */}
          <div 
            className="w-full h-full flex items-center justify-center overflow-hidden p-6 relative cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUp}
          >
            <div
              style={{
                transform: `translate(${lightboxPos.x}px, ${lightboxPos.y}px) scale(${lightboxScale})`,
                transition: isDraggingLightbox ? 'none' : 'transform 0.15s ease-out'
              }}
              className="max-h-[80vh] max-w-[90vw] flex items-center justify-center select-none"
            >
              <img 
                src={lightboxUrl} 
                alt="Fullscreen Imagem"
                className="object-contain max-h-[80vh] max-w-[90vw] rounded shadow-2xl pointer-events-none" 
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          {/* User Help Info Banner */}
          <p className="absolute bottom-4 text-center text-slate-400 text-[10px] bg-slate-900/80 px-4 py-1.5 rounded-full backdrop-blur-xs font-medium uppercase tracking-wider select-none pointer-events-none">
            💡 Dica: Clique e arraste para mover a imagem e focar nos detalhes.
          </p>
        </div>
      )}
    </div>
  );
}
