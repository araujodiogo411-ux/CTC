import React, { useState, useMemo, useRef, useEffect } from "react";
import { User, CatalogItem, ChatMessage, ConsultationQuestion, ConsultationSchedule } from "../types";
import { 
  Compass, 
  MessageCircle, 
  Calendar, 
  Send, 
  LogOut, 
  CheckCircle, 
  AlertCircle,
  HelpCircle,
  Phone,
  Smile,
  Search,
  Mail,
  User as UserIcon,
  Heart,
  Camera,
  Paperclip,
  Mic,
  X,
  Reply,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Play,
  Square,
  Video,
  Image as ImageIcon,
  FileText
} from "lucide-react";

interface UserPanelProps {
  currentUser: User;
  users: User[];
  catalog: CatalogItem[];
  messages: ChatMessage[];
  questions: ConsultationQuestion[];
  schedules: ConsultationSchedule[];
  activeSpecialties: string[];
  unavailableDates: string[];
  
  onAddSchedule: (scheduleFields: any) => void;
  onUpdateSchedule: (id: string, scheduleFields: any) => void;
  onDeleteSchedule: (id: string) => void;
  onSendMessage: (
    text: string,
    receiverId: string,
    attachment?: ChatMessage["attachment"],
    replyTo?: ChatMessage["replyTo"]
  ) => void;
  onMarkMessagesAsRead: () => void;
  onLogout: () => void;
}

export default function UserPanel({
  currentUser,
  users,
  catalog,
  messages,
  questions,
  schedules,
  activeSpecialties,
  unavailableDates,
  onAddSchedule,
  onUpdateSchedule,
  onDeleteSchedule,
  onSendMessage,
  onMarkMessagesAsRead,
  onLogout,
}: UserPanelProps) {
  // Navigation / sub-states
  const [showChat, setShowChat] = useState(false);
  const [userTypedMessage, setUserTypedMessage] = useState("");
  const [mailSubject, setMailSubject] = useState("Mensagem de Apoio e Otimismo");
  const [catalogSearch, setCatalogSearch] = useState("");

  // ==================== RICH CHAT MEDIA & AUDIO STATES ====================
  // Audio recorder
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const audioIntervalRef = useRef<any>(null);

  // Camera video/photo capture
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const cameraMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const cameraVideoChunks = useRef<Blob[]>([]);
  const cameraIntervalRef = useRef<any>(null);

  // Attachment drafts and quote targets
  const [draftAttachment, setDraftAttachment] = useState<{
    type: 'image' | 'video' | 'audio' | 'pdf';
    url: string; // Base64 or Blob URL
    name?: string;
  } | null>(null);
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);

  // Interactive Zoom & Pan Lightbox state
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxScale, setLightboxScale] = useState(1);
  const [lightboxPos, setLightboxPos] = useState({ x: 0, y: 0 });
  const [isDraggingLightbox, setIsDraggingLightbox] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Clean streams on component unmount
  useEffect(() => {
    return () => {
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (cameraIntervalRef.current) clearInterval(cameraIntervalRef.current);
    };
  }, []);
  // ========================================================================
  
  // Custom contacts calculation
  const contacts = useMemo(() => {
    const list = [{ id: "admin", name: "Coordenação de Apoio (Admin)", email: "suporte@ctc.com", isAdmin: true }];
    users.forEach(u => {
      if (u.id !== currentUser.id) {
        list.push({
          id: u.id,
          name: u.name,
          email: u.email,
          isAdmin: u.isAdmin
        });
      }
    });
    // Deduplicate by id just in case
    const unique: typeof list = [];
    const seen = new Set();
    list.forEach(item => {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        unique.push(item);
      }
    });
    return unique;
  }, [users, currentUser.id]);

  // Selected receiver
  const [selectedReceiverId, setSelectedReceiverId] = useState<string>("admin");

  const selectedContact = useMemo(() => {
    return contacts.find(c => c.id === selectedReceiverId) || contacts[0] || { id: "admin", name: "Coordenação de Apoio (Admin)", email: "suporte@ctc.com" };
  }, [contacts, selectedReceiverId]);

  // Structured form state for consultation booking
  const [formResponses, setFormResponses] = useState<any>({
    fullName: "",
    cep: "",
    street: "",
    number: "",
    neighborhood: "",
    city: "",
    state: "",
    complement: "",
    rg: "",
    cpf: "",
    voterCard: "",
    voterZone: "",
    voterSection: "",
    age: "",
    symptoms: "",
    reason: "",
    whatsapp: "",
    professionalType: "",
    confirmedDate: "",
    confirmedTime: ""
  });

  const [cepLoading, setCepLoading] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [formError, setFormError] = useState("");
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Synchronize whatsapp on currentUser changes
  useEffect(() => {
    if (currentUser) {
      setFormResponses((prev: any) => ({
        ...prev,
        whatsapp: currentUser.phone1 || prev.whatsapp || ""
      }));
    }
  }, [currentUser]);

  const handleInputChange = (field: string, value: string) => {
    setFormResponses((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCepLookup = async (cepVal: string) => {
    const cleanCep = cepVal.replace(/\D/g, "");
    if (cleanCep.length === 8) {
      setCepLoading(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await res.json();
        if (data && !data.erro) {
          setFormResponses((prev: any) => ({
            ...prev,
            street: data.logradouro || "",
            neighborhood: data.bairro || "",
            city: data.localidade || "",
            state: data.uf || ""
          }));
        }
      } catch (err) {
        console.error("ViaCEP lookup helper failure:", err);
      } finally {
        setCepLoading(false);
      }
    }
  };

  // Chat logic - specific to selected recipient
  const myMessages = useMemo(() => {
    return messages
      .filter((m) => 
        (m.senderId === currentUser.id && m.receiverId === selectedReceiverId) ||
        (m.senderId === selectedReceiverId && m.receiverId === currentUser.id)
      )
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [messages, currentUser.id, selectedReceiverId]);

  const hasUnreadAdminMessage = useMemo(() => {
    return messages.some(
      (m) => m.senderId === "admin" && m.receiverId === currentUser.id && !m.readByReceiver
    );
  }, [messages, currentUser.id]);

  const handleOpenChat = () => {
    const whatsappNum = "81995839376";
    const text = encodeURIComponent(`Olá, sou o(a) paciente ${currentUser.name} e gostaria de alinhar detalhes sobre o agendamento da minha consulta.`);
    window.open(`https://wa.me/55${whatsappNum}?text=${text}`, "_blank");
    onMarkMessagesAsRead();
  };

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
            name: `Áudio Gravado (${recordingDuration}s)`
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
      audioRecorderRef.current.onstop = null; // ignore final block
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
      alert("Para capturar fotos ou gravar vídeos, autorize e permita o acesso à câmera e microfone.");
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
        name: `Foto Instantânea (${new Date().toLocaleTimeString('pt-BR')})`
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
          name: `Vídeo da Câmera (${videoDuration}s)`
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

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userTypedMessage.trim() && !draftAttachment) return;
    
    const formattedText = `Assunto: ${mailSubject.trim() || "Mensagem de Apoio e Otimismo"}\n\n${userTypedMessage.trim()}`;
    
    const attachmentArg = draftAttachment ? {
      type: draftAttachment.type,
      url: draftAttachment.url,
      name: draftAttachment.name
    } : undefined;

    const replyToArg = replyTarget ? {
      id: replyTarget.id,
      text: replyTarget.text,
      senderName: replyTarget.senderId === currentUser.id ? currentUser.name : (contacts.find(c => c.id === replyTarget.senderId)?.name || "Coordenação"),
      mediaUrl: replyTarget.attachment?.url,
      mediaType: replyTarget.attachment?.type
    } : undefined;

    onSendMessage(formattedText, selectedReceiverId, attachmentArg, replyToArg);
    
    setUserTypedMessage("");
    setDraftAttachment(null);
    setReplyTarget(null);
  };

  // Submit structured consultation form
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSubmissionSuccess(false);

    // Required fields check: "pessoa vai ter que escrever obrigatoriamente, não pode pular nada, ok?"
    const requiredKeys = [
      { key: "fullName", label: "Nome Completo" },
      { key: "cep", label: "CEP" },
      { key: "street", label: "Rua" },
      { key: "number", label: "Número" },
      { key: "neighborhood", label: "Bairro" },
      { key: "city", label: "Cidade" },
      { key: "state", label: "Estado" },
      { key: "rg", label: "RG" },
      { key: "cpf", label: "CPF" },
      { key: "voterCard", label: "Título de Eleitor" },
      { key: "voterZone", label: "Zona Eleitoral" },
      { key: "voterSection", label: "Seção Eleitoral" },
      { key: "age", label: "Idade" },
      { key: "symptoms", label: "Sintomas" },
      { key: "reason", label: "Motivo do Agendamento" },
      { key: "whatsapp", label: "WhatsApp" },
      { key: "professionalType", label: "Tipo de Profissional" },
      { key: "confirmedDate", label: "Data da Consulta" },
      { key: "confirmedTime", label: "Horário da Consulta" }
    ];

    const missing = requiredKeys.find(field => {
      const val = formResponses[field.key];
      return !val || !String(val).trim();
    });

    if (missing) {
      setFormError(`Por favor, preencha o campo obrigatório: ${missing.label}`);
      return;
    }

    if ((unavailableDates || []).includes(formResponses.confirmedDate)) {
      setFormError("A data escolhida está indisponível para agendamento. Por favor, selecione outro dia.");
      return;
    }

    const payload = {
      ...formResponses,
      age: parseInt(formResponses.age) || 0
    };

    if (editingScheduleId) {
      onUpdateSchedule(editingScheduleId, payload);
      setEditingScheduleId(null);
    } else {
      onAddSchedule(payload);
    }
    setSubmissionSuccess(true);
    
    // Reset Form state: Pre-fill WhatsApp automatically
    setFormResponses({
      fullName: "",
      cep: "",
      street: "",
      number: "",
      neighborhood: "",
      city: "",
      state: "",
      complement: "",
      rg: "",
      cpf: "",
      voterCard: "",
      voterZone: "",
      voterSection: "",
      age: "",
      symptoms: "",
      reason: "",
      whatsapp: currentUser.phone1 || "",
      professionalType: "",
      confirmedDate: "",
      confirmedTime: ""
    });
    
    // Auto clear success message after 5 seconds
    setTimeout(() => {
      setSubmissionSuccess(false);
    }, 6000);
  };

  // Filter Catalog base on query
  const filteredCatalog = useMemo(() => {
    const q = catalogSearch.toLowerCase().trim();
    if (!q) return catalog;
    return catalog.filter(
      (c) => 
        c.title.toLowerCase().includes(q) || 
        c.description.toLowerCase().includes(q)
    );
  }, [catalog, catalogSearch]);

  const mySchedules = useMemo(() => {
    return schedules.filter((s) => s.userId === currentUser.id);
  }, [schedules, currentUser.id]);

  return (
    <div className="min-h-screen bg-[#F3F7FA] flex flex-col">
      
      {/* Visual top bar header with brand representation */}
      <header className="bg-brand-blue text-white shadow-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-2.5">
            <div className="p-1 bg-white rounded-lg shadow-sm">
              <img 
                src="https://i.ibb.co/F4fT9dtd/Copilot-20260522-174622.png" 
                alt="CTC Logomarca" 
                className="h-8.5 w-auto object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <span className="text-[9px] bg-brand-green text-brand-blue font-bold px-1.5 py-0.5 rounded-full select-none">
                ÁREA DO PACIENTE
              </span>
              <h1 className="text-sm font-bold text-slate-100 flex items-center gap-1">
                Central de Agendamentos
              </h1>
            </div>
          </div>

          {/* Connected Action items */}
          <div className="flex items-center gap-3">
            
            {/* Interactive Chat button with Green pulsing dot indicator if active unread message */}
            <button
              id="btn-user-chat"
              onClick={handleOpenChat}
              className="relative p-2 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white rounded-xl transition flex items-center gap-1.5 text-xs font-semibold px-3 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 text-brand-green" />
              <span className="hidden sm:inline">Conversas</span>
              
              {/* Green Notification Dot: "aparecer uma bolinha verde, entendeu?" */}
              {hasUnreadAdminMessage && (
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-brand-green border-2 border-white"></span>
                </span>
              )}
            </button>

            <div className="text-right hidden md:block">
              <p className="text-xs font-bold text-slate-200">Olá, {currentUser.name}</p>
              <p className="text-[10px] text-slate-400">Idade: {currentUser.age} anos</p>
            </div>

            <button
              id="btn-user-logout"
              onClick={onLogout}
              className="p-2 bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 rounded-xl transition cursor-pointer"
              title="Sair do Portal"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Patient Content Layout */}
      <main className="max-w-7xl mx-auto w-full px-4 py-6 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Catalog mini block + Chat display panel */}
        <section className="lg:col-span-4 space-y-6 flex flex-col">
          
          {/* Mini Bloquinho de Catálogo: "mini bloquinho mostrando se o administrador colocou algum catálogo" */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-4 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-brand-blue" />
                <div>
                  <h3 className="text-xs font-bold text-slate-800">Catálogo de Serviços</h3>
                  <p className="text-[9px] text-slate-400 font-medium">Novidades e ofertas de consultas</p>
                </div>
              </div>
            </div>

            {/* mini catalog quick search */}
            <div className="relative mb-3.5">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input 
                type="text"
                placeholder="Pesquisar catálogo..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] outline-none focus:bg-white focus:ring-1 focus:ring-brand-blue"
              />
            </div>

            {/* compact visual shelf */}
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {filteredCatalog.map((item) => (
                <div 
                  key={item.id}
                  className="bg-slate-50 hover:bg-slate-100 p-2 rounded-xl flex items-center gap-2.5 border border-slate-150 transition group-hover:scale-102"
                >
                  <img 
                    src={item.imageUrl || "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=500&q=80"}
                    alt={item.title}
                    className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 truncate">
                    <h4 className="text-[11px] font-bold text-slate-800 truncate">{item.title}</h4>
                    <p className="text-[9px] text-slate-500 truncate">{item.description}</p>
                    <span className="text-[10px] font-bold text-brand-blue">{item.price}</span>
                  </div>
                </div>
              ))}

              {filteredCatalog.length === 0 && (
                <p className="text-[10px] italic text-slate-400 text-center py-4">Nenhum serviço no catálogo.</p>
              )}
            </div>
          </div>

          {/* Histórico Simplificado de Solitações do Usuário */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex-1">
            <div className="text-xs font-bold text-slate-800 mb-2.5 flex items-center gap-1.5 border-b pb-2">
              <CheckCircle className="w-4 h-4 text-brand-green" />
              Minhas Consultas Solicitadas
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1 text-xs">
              {mySchedules.map((sch) => (
                <div key={sch.id} className="p-3.5 rounded-2xl border bg-slate-50 border-slate-200/80 hover:border-slate-300 transition flex flex-col gap-1">
                  <div className="flex items-center justify-between mb-1 border-b border-slate-200/40 pb-1">
                    <span className="font-bold text-slate-800 text-[10.5px]">Protocolo #{sch.id.slice(-4)}</span>
                    {sch.status === "confirmed" ? (
                      <span className="text-[9px] font-bold text-emerald-800 bg-emerald-150 px-2 py-0.5 rounded-md">
                        Confirmado
                      </span>
                    ) : sch.status === "unavailable_date" ? (
                      <span className="text-[9px] font-bold text-red-850 bg-red-150 px-2 py-0.5 rounded-md">
                        Data Indisponível
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold text-amber-850 bg-amber-150 px-2 py-0.5 rounded-md">
                        Aguardando Coordenação
                      </span>
                    )}
                  </div>
                  
                  <div className="text-[10px] text-slate-650 space-y-0.5">
                    <p>🧑‍⚕️ <strong className="text-slate-700">Especialidade:</strong> {sch.professionalType}</p>
                    <p>👤 <strong className="text-slate-700">Paciente:</strong> {sch.fullName}</p>
                    {sch.confirmedDate && (
                      <p className="font-semibold text-slate-850">📅 <strong>Data Solicitada:</strong> {sch.confirmedDate} às {sch.confirmedTime}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-200/40">
                    <button
                      onClick={() => {
                        setFormResponses(sch);
                        setEditingScheduleId(sch.id);
                        // Scroll layout to the form
                        const formElem = document.getElementById("btn-agenda-consulta")?.closest("form");
                        if (formElem) {
                          formElem.scrollIntoView({ behavior: "smooth" });
                        }
                      }}
                      className="text-brand-blue hover:text-brand-blue/80 text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      Editar Dados
                    </button>
                    {confirmDeleteId === sch.id ? (
                      <div className="flex items-center gap-1.5 animate-in fade-in zoom-in-95">
                        <span className="text-[9px] text-red-600 font-bold">Confirmar?</span>
                        <button
                          onClick={() => {
                            onDeleteSchedule(sch.id);
                            setConfirmDeleteId(null);
                          }}
                          className="bg-red-650 hover:bg-red-800 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded transition cursor-pointer"
                        >
                          Sim
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-slate-500 hover:text-slate-700 text-[9px] font-bold px-1.5 py-0.5 border rounded bg-white transition cursor-pointer"
                        >
                          Não
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(sch.id)}
                        className="text-rose-600 hover:text-rose-800 text-[10px] font-bold transition cursor-pointer"
                      >
                        Excluir
                      </button>
                    )}
                  </div>

                  {sch.status === "confirmed" ? (
                    <div className="mt-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2 text-slate-850 animate-in fade-in slide-in-from-top-1">
                      <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-[10px]">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>CONSULTA CONFIRMADA</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-700 bg-white/75 p-2 rounded-lg border border-emerald-100">
                        <div>
                          <span className="block text-[8px] uppercase tracking-wider text-slate-400 font-medium">Data</span>
                          <span className="font-extrabold text-emerald-800">{sch.confirmedDate || "Alinhando..."}</span>
                        </div>
                        <div>
                          <span className="block text-[8px] uppercase tracking-wider text-slate-400 font-medium">Horário</span>
                          <span className="font-extrabold text-emerald-800">{sch.confirmedTime || "Alinhando..."}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="block text-[8px] uppercase tracking-wider text-slate-400 font-medium">Local</span>
                          <span className="font-bold text-slate-800 block text-[9.5px] leading-snug">{sch.confirmedLocation || "Rua Farias de Brito 389 - Santa Mônica"}</span>
                        </div>
                      </div>
                      {sch.confirmedNotes && (
                        <div className="text-[10px] text-emerald-850 bg-emerald-50 border-t border-emerald-200/55 pt-1.5 italic font-mono uppercase tracking-tight text-[9px]">
                          <span className="font-bold not-italic">Observações:</span> {sch.confirmedNotes}
                        </div>
                      )}
                    </div>
                  ) : sch.status === "unavailable_date" ? (
                    <div className="mt-3 p-3 bg-rose-50 rounded-xl border border-rose-200 space-y-2 text-slate-850 animate-in fade-in slide-in-from-top-1">
                      <div className="flex items-center gap-1.5 text-rose-850 font-bold text-[10px]">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>⚠️ DATA OU HORÁRIO INDISPONÍVEL</span>
                      </div>
                      <p className="text-[9.5px] text-rose-800 leading-normal font-medium">
                        Ops! A data original que você escolheu ficou indisponível. Para não prejudicar seu atendimento, a coordenação sugeriu a seguinte alternativa. Se estiver de acordo, ótimo! Caso contrário, sinta-se à vontade para nos chamar no WhatsApp no botão de conversas acima!
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-700 bg-white/75 p-2 rounded-lg border border-rose-100">
                        <div>
                          <span className="block text-[8px] uppercase tracking-wider text-slate-450 font-medium">Opção de Data</span>
                          <span className="font-extrabold text-rose-900">{sch.confirmedDate || "Alinhando..."}</span>
                        </div>
                        <div>
                          <span className="block text-[8px] uppercase tracking-wider text-slate-450 font-medium">Horário</span>
                          <span className="font-extrabold text-rose-900">{sch.confirmedTime || "Alinhando..."}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="block text-[8px] uppercase tracking-wider text-slate-450 font-medium">Local Proposto</span>
                          <span className="font-bold text-slate-800 block text-[9.5px] leading-snug">{sch.confirmedLocation || "Rua Farias de Brito 389 - Santa Mônica"}</span>
                        </div>
                      </div>
                      {sch.confirmedNotes && (
                        <div className="text-[10px] text-rose-900 bg-rose-50 border-t border-rose-200/55 pt-1.5 italic">
                          <span className="font-bold not-italic text-rose-950">Justificativa/Recomendações:</span> {sch.confirmedNotes}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-[10px] text-amber-800 bg-amber-50 rounded-lg p-2 border border-amber-200/40 mt-1.5">
                      ⏳ Triagem de apoio enviada. Aguarde o posicionador de data, hora e local da coordenação em tempo real aqui!
                    </p>
                  )}
                </div>
              ))}

              {mySchedules.length === 0 && (
                <p className="text-[10px] italic text-slate-400 text-center py-6">
                  Preencha o formulário ao lado para agendar sua primeira consulta.
                </p>
              )}
            </div>
          </div>

        </section>

        {/* Right Column: Chat Room Window when active OR default landing with dynamic registration check list */}
        <section className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Active Chat Conversation Overlay/Box */}
          {showChat && (
            <div id="chat-box" className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 relative">
              
              {/* Header Bar */}
              <div className="bg-brand-blue text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-brand-green rounded-full animate-pulse shrink-0"></div>
                  <div>
                    <h3 className="text-xs font-bold">Canal Seguro de Mensagens & E-mails</h3>
                    <p className="text-[10px] text-slate-300">Escreva e troque e-mails positivos de incentivo no portal oficial</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowChat(false)}
                  className="bg-white/10 hover:bg-white/25 text-[10px] font-semibold text-white px-3 py-1 rounded-lg transition"
                >
                  Minimizar Mensagens
                </button>
              </div>

              {/* Split Content View: Sidebar on Left, Feed on Right */}
              <div className="grid grid-cols-1 md:grid-cols-12 border-t border-slate-100 flex-1 min-h-[350px]">
                
                {/* Users List Sidebar (Col Span 4) */}
                <div className="md:col-span-4 border-r border-slate-100 bg-slate-50/50 p-3 max-h-[440px] overflow-y-auto">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                    <UserIcon className="w-3 h-3" />
                    PESSOAS CADASTRADAS
                  </h4>
                  <div className="space-y-1">
                    {contacts.map((c) => {
                      const isSelected = c.id === selectedReceiverId;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSelectedReceiverId(c.id);
                          }}
                          className={`w-full text-left p-2.5 rounded-xl transition flex items-center gap-2 border select-none ${
                            isSelected 
                              ? "bg-slate-100 border-slate-200 text-brand-blue font-semibold shadow-xs" 
                              : "bg-transparent border-transparent hover:bg-slate-100/60 text-slate-600"
                          }`}
                        >
                          <div className={`p-1.5 rounded-lg shrink-0 ${isSelected ? "bg-brand-blue text-white" : "bg-slate-200 text-slate-500"}`}>
                            {c.isAdmin ? (
                              <Mail className="w-3.5 h-3.5 text-brand-green" />
                            ) : (
                              <UserIcon className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div className="truncate flex-1">
                            <h5 className="text-[11px] truncate leading-tight">{c.name}</h5>
                            <span className="text-[9px] text-slate-400 block truncate">{c.email}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Active message and positive mail box Feed (Col Span 8) */}
                <div className="md:col-span-8 flex flex-col bg-white max-h-[440px] overflow-hidden">
                  
                  {/* Selected Contact Sub Header */}
                  <div className="bg-slate-50/40 p-2 text-[10px] text-slate-500 font-medium px-4 border-b border-slate-100 flex items-center justify-between">
                    <span>Para: <strong className="text-slate-700 font-bold">{selectedContact.name}</strong> ({selectedContact.email})</span>
                    <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-0.5 whitespace-nowrap select-none">
                      <Heart className="w-2.5 h-2.5 text-brand-green fill-brand-green animate-pulse" /> E-mail Positivo Ativo
                    </span>
                  </div>

                  {/* Mail/Chat Feed list */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/20 max-h-[260px] min-h-[220px]">
                    {myMessages.map((m) => {
                      const isMe = m.senderId === currentUser.id;
                      
                      // Check match for Subject and text content
                      const mailMatch = m.text.match(/^Assunto:\s*(.*?)\n\n([\s\S]*)$/);
                      const subjectText = mailMatch ? mailMatch[1] : "Mensagem de Apoio Geral";
                      const bodyText = mailMatch ? mailMatch[2] : m.text;

                      const senderName = isMe ? currentUser.name : (contacts.find(c => c.id === m.senderId)?.name || "Suporte");

                      return (
                        <div 
                          key={m.id}
                          className={`flex ${isMe ? "justify-end" : "justify-start"} group relative`}
                        >
                          {/* Envelope Layout */}
                          <div className={`max-w-[90%] rounded-xl shadow-2xs border ${
                            isMe 
                              ? "bg-gradient-to-br from-blue-50 to-indigo-50/60 border-blue-100"
                              : "bg-gradient-to-br from-emerald-50/60 to-teal-50/40 border-slate-200"
                          } p-3 text-xs w-full relative`}>
                            
                            {/* Envelope Header info */}
                            <div className="flex items-center justify-between pb-1.5 border-b border-dashed border-slate-200/80 mb-2">
                              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                <Mail className={`w-3.5 h-3.5 shrink-0 ${isMe ? "text-brand-blue" : "text-brand-green"}`} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-[9px] text-slate-400 uppercase tracking-tight">De: <span className="font-bold text-slate-700">{senderName}</span></p>
                                  <h4 className="text-[11px] font-bold text-slate-800 truncate leading-none mt-0.5">
                                    {subjectText}
                                  </h4>
                                </div>
                              </div>

                              {/* Hover Reply Button */}
                              <button
                                type="button"
                                onClick={() => setReplyTarget(m)}
                                title="Citar/Responder esta mensagem"
                                className="opacity-0 group-hover:opacity-100 transition p-1 hover:bg-slate-200/60 rounded text-slate-500 cursor-pointer"
                              >
                                <Reply className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Reply Reference Box */}
                            {m.replyTo && (
                              <div className="bg-slate-900/5 border-l-4 border-brand-green p-1.5 rounded-lg mb-2 text-[10px] text-slate-650 block select-none">
                                <span className="font-extrabold text-[8px] text-brand-green uppercase tracking-wide block">Em resposta a {m.replyTo.senderName}</span>
                                <p className="truncate italic font-sans">{m.replyTo.text.replace(/^Assunto:.*?\n\n/g, "") || "Mídia"}</p>
                                {m.replyTo.mediaUrl && (
                                  <span className="text-[8px] text-slate-400 block mt-0.5">📁 Mídia Anexa ({m.replyTo.mediaType})</span>
                                )}
                              </div>
                            )}

                            {/* Core message text copy */}
                            <p className="whitespace-pre-wrap text-[11px] text-slate-700 leading-relaxed font-sans">{bodyText}</p>
                            
                            {/* Message Media Attachment */}
                            {m.attachment && (
                              <div className="mt-2.5 pt-2 border-t border-dashed border-slate-200/50">
                                {m.attachment.type === 'image' && (
                                  <div 
                                    onClick={() => { setLightboxUrl(m.attachment!.url); handleZoomReset(); }}
                                    className="relative group/img cursor-zoom-in rounded-lg overflow-hidden border border-slate-250 bg-slate-50/50 max-w-xs transition-transform duration-200 hover:scale-101"
                                  >
                                    <img 
                                      src={m.attachment.url} 
                                      alt={m.attachment.name || "Imagem do Chat"} 
                                      className="max-h-52 w-auto object-cover rounded-lg group-hover/img:brightness-95 transition"
                                      referrerPolicy="no-referrer"
                                    />
                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition flex items-center justify-center text-white text-[9px] font-bold gap-1">
                                      <Search className="w-3.5 h-3.5 text-brand-green" /> Clique para Zoom e Mover
                                    </div>
                                  </div>
                                )}

                                {m.attachment.type === 'video' && (
                                  <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-950 p-0.5 max-w-xs shadow-3xs">
                                    <video 
                                      src={m.attachment.url} 
                                      controls 
                                      className="max-h-52 w-full object-contain rounded-lg" 
                                    />
                                    {m.attachment.name && (
                                      <p className="p-1 px-2 text-[9px] text-slate-400 truncate bg-slate-900 border-t border-slate-800">
                                        📹 {m.attachment.name}
                                      </p>
                                    )}
                                  </div>
                                )}

                                {m.attachment.type === 'audio' && (
                                  <div className="bg-slate-100 p-2.5 rounded-xl border border-slate-200 flex items-center gap-2 max-w-xs">
                                    <div className="p-1.5 bg-brand-blue text-white rounded-lg shrink-0">
                                      <Mic className="w-4 h-4 text-brand-green" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <audio src={m.attachment.url} controls className="w-full h-8 outline-none" />
                                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mt-1">MENSAGEM DE VOZ</span>
                                    </div>
                                  </div>
                                )}

                                {m.attachment.type === 'pdf' && (
                                  <div className="bg-white p-2 border border-slate-200 rounded-xl flex items-center justify-between gap-1 max-w-xs shadow-3xs">
                                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                      <div className="p-1.5 bg-rose-50 text-rose-600 rounded-xl shrink-0">
                                        <FileText className="w-5 h-5 stroke-1.5" />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <h5 className="text-[10px] font-bold text-slate-800 truncate leading-tight">{m.attachment.name || "exame.pdf"}</h5>
                                        <span className="text-[8px] text-slate-450 uppercase tracking-widest font-mono">PDF SEGURO</span>
                                      </div>
                                    </div>
                                    <a 
                                      href={m.attachment.url} 
                                      download={m.attachment.name || "exame_portal_ctc.pdf"} 
                                      className="bg-brand-blue hover:bg-brand-blue-hover text-white text-[9px] font-bold px-2 py-1 bg-gradient-to-r rounded-lg shrink-0 flex items-center gap-0.5 transition cursor-pointer"
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

                    {myMessages.length === 0 && (
                      <div className="text-center py-8 text-xs text-slate-400 italic flex flex-col items-center justify-center gap-1.5 min-h-[160px]">
                        <Mail className="w-8 h-8 text-slate-300 stroke-1" />
                        Sem mensagens anteriores nesta caixa de entrada.
                        <p className="text-[10px] text-slate-400 not-italic">
                          Escreva e envie a primeira mensagem de e-mail de apoio para {selectedContact.name}!
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Mail Composer box form with Rich media states */}
                  <form onSubmit={handleSendReply} className="p-3 bg-white border-t border-slate-100 flex flex-col">
                    
                    {/* Quoted Message Reference Banner */}
                    {replyTarget && (
                      <div className="bg-indigo-50 border border-indigo-200 border-b-none p-2 rounded-t-xl flex justify-between items-center text-[10px] select-none animate-in fade-in duration-200">
                        <div className="min-w-0 flex-1 flex items-center gap-1.5 text-slate-600">
                          <Reply className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span className="truncate">
                            Respondendo a <strong className="text-indigo-600 font-bold">{replyTarget.senderId === currentUser.id ? "Mim" : (contacts.find(c => c.id === replyTarget.senderId)?.name || "Suporte")}</strong>: {replyTarget.text.replace(/^Assunto:.*?\n\n/g, "").slice(0, 75)}...
                          </span>
                        </div>
                        <button type="button" onClick={() => setReplyTarget(null)} className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer ml-1">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Pending Attachment Draft Banner */}
                    {draftAttachment && (
                      <div className="bg-emerald-50 border border-emerald-200 border-b-none p-2 rounded-t-xl flex justify-between items-center text-[10px] select-none animate-in fade-in duration-200">
                        <div className="flex items-center gap-2 min-w-0">
                          {draftAttachment.type === 'image' && (
                            <img src={draftAttachment.url} className="w-8 h-8 object-cover rounded border border-slate-200" referrerPolicy="no-referrer" />
                          )}
                          {draftAttachment.type === 'video' && (
                            <div className="w-8 h-8 bg-slate-900 rounded flex items-center justify-center text-white font-bold text-[8px]">📹 MP4</div>
                          )}
                          {draftAttachment.type === 'audio' && (
                            <div className="w-8 h-8 bg-brand-blue rounded flex items-center justify-center"><Mic className="w-4 h-4 text-brand-green" /></div>
                          )}
                          {draftAttachment.type === 'pdf' && (
                            <div className="w-8 h-8 bg-rose-100 rounded flex items-center justify-center text-rose-600"><FileText className="w-4 h-4" /></div>
                          )}
                          <div className="truncate flex-1">
                            <span className="font-extrabold text-emerald-800 uppercase text-[8px] tracking-wider block">Draft pronto ({draftAttachment.type})</span>
                            <span className="text-slate-500 truncate block text-[9px] max-w-xs">{draftAttachment.name || "Mídia pendente"}</span>
                          </div>
                        </div>
                        <button type="button" onClick={() => setDraftAttachment(null)} className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer ml-1">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Microphone active recording indicator */}
                    {isRecording && (
                      <div className="bg-rose-50 border border-rose-200 border-b-none p-2 rounded-t-xl flex items-center justify-between gap-3 animate-pulse select-none">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-rose-600 rounded-full animate-ping shrink-0"></div>
                          <div>
                            <span className="text-[9px] font-bold text-rose-700 uppercase tracking-widest block">GRAVANDO ÁUDIO...</span>
                            <span className="text-[11px] font-bold font-mono text-slate-600 leading-none">{recordingDuration} segundos</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button 
                            type="button" 
                            onClick={cancelAudioRecording} 
                            className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-semibold px-2 py-1 rounded-md flex items-center gap-0.5 cursor-pointer"
                          >
                            <X className="w-3 h-3 text-rose-500" /> Cancelar
                          </button>
                          <button 
                            type="button" 
                            onClick={stopAudioRecording} 
                            className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1 shadow-xs cursor-pointer text-nowrap"
                          >
                            <Square className="w-2.5 h-2.5 text-white fill-white shrink-0" /> Finalizar
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Webcam direct Capture Frame box */}
                    {isCameraOpen && (
                      <div className="bg-slate-900 border border-slate-800 border-b-none text-white p-2.5 rounded-t-xl flex flex-col gap-2 select-none">
                        <div className="relative rounded overflow-hidden bg-black max-w-xs mx-auto aspect-video border border-slate-800">
                          <video ref={cameraVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                          
                          {isRecordingVideo && (
                            <span className="absolute top-1.5 left-1.5 bg-red-600/80 text-white text-[8px] font-mono font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 animate-pulse">
                              ● PORTÁTIL ({videoDuration}s)
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between gap-2 max-w-xs mx-auto w-full">
                          <button 
                            type="button" 
                            onClick={closeCamera} 
                            className="bg-white/10 hover:bg-white/20 text-[9px] font-bold px-2 py-1 rounded"
                          >
                            Fechar
                          </button>

                          <div className="flex items-center gap-1">
                            {!isRecordingVideo ? (
                              <>
                                <button 
                                  type="button" 
                                  onClick={takePhotoSnapshot} 
                                  className="bg-brand-green hover:bg-emerald-400 text-brand-blue text-[9px] font-bold px-2 py-1 rounded flex items-center gap-0.5 cursor-pointer"
                                >
                                  <Camera className="w-3 h-3" /> Foto
                                </button>
                                <button 
                                  type="button" 
                                  onClick={startVideoRecording} 
                                  className="bg-rose-600 hover:bg-rose-700 text-white text-[9px] font-bold px-2 py-1 rounded flex items-center gap-0.5 cursor-pointer"
                                >
                                  <Video className="w-3 h-3 text-white" /> Vídeo
                                </button>
                              </>
                            ) : (
                              <button 
                                type="button" 
                                onClick={stopVideoRecording} 
                                className="bg-rose-500 hover:bg-rose-600 text-white text-[9px] font-extrabold px-3 py-1 rounded flex items-center gap-1 animate-bounce cursor-pointer"
                              >
                                ● Parar & Salvar
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Mail Subject line wrapper */}
                    <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200/65 mb-2">
                      <span className="text-[9px] text-slate-400 font-bold uppercase select-none">Assunto:</span>
                      <input 
                        type="text"
                        required
                        value={mailSubject}
                        onChange={(e) => setMailSubject(e.target.value)}
                        placeholder="Digite o título positivo do e-mail..."
                        className="flex-1 bg-transparent text-xs text-slate-850 outline-none border-none py-0.5 font-semibold placeholder:font-normal placeholder:text-slate-400"
                      />
                    </div>

                    {/* Content text and triggers action bar */}
                    <div className="flex gap-2 items-center">
                      
                      {/* mic record trigger */}
                      <button
                        type="button"
                        disabled={isRecording}
                        onClick={startAudioRecording}
                        title="Permitir e gravar mensagem de voz"
                        className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg border border-slate-250 transition shrink-0 cursor-pointer"
                      >
                        <Mic className="w-4 h-4 text-brand-blue" />
                      </button>

                      {/* live web-camera capture trigger */}
                      <button
                        type="button"
                        onClick={openCamera}
                        title="Tirar foto ou gravar vídeo no momento"
                        className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg border border-slate-250 transition shrink-0 cursor-pointer"
                      >
                        <Camera className="w-4 h-4 text-brand-green" />
                      </button>

                      {/* Storage Attachments input wrapper */}
                      <label 
                        title="Anexar arquivo do armazenamento (Foto, Vídeo ou PDF)"
                        className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-550 hover:text-slate-850 rounded-lg border border-slate-250 transition shrink-0 cursor-pointer flex items-center justify-center"
                      >
                        <Paperclip className="w-4 h-4" />
                        <input 
                          type="file" 
                          accept="image/*,video/*,application/pdf" 
                          className="hidden" 
                          onChange={handleFileChange} 
                        />
                      </label>

                      <textarea
                        required={!draftAttachment}
                        rows={1}
                        placeholder="Deseje melhoras, estimule o progresso ou mande mensagens positivas..."
                        value={userTypedMessage}
                        onChange={(e) => setUserTypedMessage(e.target.value)}
                        className="flex-1 bg-slate-50 px-3 py-1.5 rounded-xl text-xs outline-none focus:bg-white focus:ring-1 focus:ring-brand-blue border border-slate-250 resize-none transition leading-normal self-center"
                      />

                      <button
                        type="submit"
                        title="Enviar Mensagem de Apoio"
                        className="bg-brand-blue hover:bg-brand-blue-hover text-white px-3 py-1 bg-gradient-to-br rounded-xl duration-150 flex flex-col gap-0.5 items-center justify-center shrink-0 shadow-xs cursor-pointer select-none self-stretch"
                      >
                        <Send className="w-3.5 h-3.5 text-brand-green" />
                        <span className="text-[8px] font-bold uppercase">Enviar</span>
                      </button>

                    </div>
                  </form>

                </div>

              </div>
            </div>
          )}

          {/* Cadastro de Consulta Forms - Structured & Integrated with ViaCEP and Active Specialists */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
            <div className="border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-brand-green" />
                <div>
                  <h2 className="text-sm font-bold text-slate-800">
                    {editingScheduleId ? "Alterar Informações do Agendamento" : "Agendar Nova Consulta"}
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    {editingScheduleId 
                      ? "Modifique os dados nos campos abaixo e clique em Salvar Alterações." 
                      : "Preencha a ficha clínica obrigatória abaixo para realizar a solicitação de agendamento."}
                  </p>
                </div>
              </div>
            </div>

            {submissionSuccess && (
              <div className="mb-4 bg-emerald-50 border border-emerald-300 p-4 rounded-xl flex gap-2.5 animate-in fade-in slide-in-from-top-4">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-emerald-800">Agendamento Solicitado!</h4>
                  <p className="text-[11px] text-emerald-700 leading-relaxed mt-0.5">
                    Seu agendamento foi encaminhado com sucesso e está na fila do administrador. 
                    Nossa equipe irá revisar suas informações e entrar em contato em breve via WhatsApp 
                    (<span className="font-semibold">{currentUser.phone1}</span>) ou através do chat interno deste aplicativo para definir ou confirmar as datas!
                  </p>
                </div>
              </div>
            )}

            {formError && (
              <div className="mb-4 bg-red-50 border border-red-200 p-3 rounded-xl text-xs font-semibold text-red-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-6">
              
              {/* Informações Pessoais Section */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-1">1. Informações Pessoais</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Nome completo */}
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">Nome Completo <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="Seu nome completo"
                      value={formResponses.fullName || ""}
                      onChange={(e) => handleInputChange("fullName", e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-1 focus:ring-brand-blue outline-none transition"
                    />
                  </div>

                  {/* Idade */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">Idade <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      required
                      min="0"
                      max="120"
                      placeholder="Ex: 35"
                      value={formResponses.age || ""}
                      onChange={(e) => handleInputChange("age", e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-1 focus:ring-brand-blue outline-none transition"
                    />
                  </div>

                  {/* RG */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">RG <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 12.345.678-9"
                      value={formResponses.rg || ""}
                      onChange={(e) => handleInputChange("rg", e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-1 focus:ring-brand-blue outline-none transition"
                    />
                  </div>

                  {/* CPF */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">CPF <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 123.456.789-00"
                      value={formResponses.cpf || ""}
                      onChange={(e) => handleInputChange("cpf", e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-1 focus:ring-brand-blue outline-none transition"
                    />
                  </div>

                  {/* WhatsApp (Auto-filled) */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">WhatsApp de Contato <span className="text-emerald-600 font-extrabold">(Automático)</span></label>
                    <div className="relative">
                      <input
                        type="text"
                        disabled
                        placeholder="WhatsApp"
                        value={formResponses.whatsapp || ""}
                        className="w-full px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs cursor-not-allowed outline-none font-bold text-slate-650"
                      />
                      <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Título de Eleitor */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">Título de Eleitor <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="Número do título"
                      value={formResponses.voterCard || ""}
                      onChange={(e) => handleInputChange("voterCard", e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-1 focus:ring-brand-blue outline-none transition"
                    />
                  </div>

                  {/* Zona */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">Zona <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 123"
                      value={formResponses.voterZone || ""}
                      onChange={(e) => handleInputChange("voterZone", e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-1 focus:ring-brand-blue outline-none transition"
                    />
                  </div>

                  {/* Seção */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">Seção <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 4567"
                      value={formResponses.voterSection || ""}
                      onChange={(e) => handleInputChange("voterSection", e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-1 focus:ring-brand-blue outline-none transition"
                    />
                  </div>
                </div>
              </div>

              {/* Endereço Residencial Section */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-1">2. Endereço Residencial</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* CEP */}
                  <div className="space-y-1 relative">
                    <label className="text-xs font-bold text-slate-700 block">CEP <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        maxLength={9}
                        placeholder="Ex: 12345678"
                        value={formResponses.cep || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleInputChange("cep", val);
                          handleCepLookup(val);
                        }}
                        onBlur={(e) => handleCepLookup(e.target.value)}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-1 focus:ring-brand-blue outline-none transition"
                      />
                      {cepLoading && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex h-4 w-4 shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-blue opacity-75 animate-duration-1000"></span>
                          <span className="relative inline-flex rounded-full h-4 w-4 bg-brand-blue"></span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Rua */}
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">Rua / Logradouro <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="Preenchido automaticamente pelo CEP"
                      value={formResponses.street || ""}
                      onChange={(e) => handleInputChange("street", e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-1 focus:ring-brand-blue outline-none transition"
                    />
                  </div>

                  {/* Número */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">Número/S/N <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 154"
                      value={formResponses.number || ""}
                      onChange={(e) => handleInputChange("number", e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-1 focus:ring-brand-blue outline-none transition"
                    />
                  </div>

                  {/* Bairro */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">Bairro <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="Bairro"
                      value={formResponses.neighborhood || ""}
                      onChange={(e) => handleInputChange("neighborhood", e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-1 focus:ring-brand-blue outline-none transition"
                    />
                  </div>

                  {/* Cidade */}
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">Cidade <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="Cidade"
                      value={formResponses.city || ""}
                      onChange={(e) => handleInputChange("city", e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-1 focus:ring-brand-blue outline-none transition"
                    />
                  </div>

                  {/* Estado */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">Estado <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="UF"
                      value={formResponses.state || ""}
                      onChange={(e) => handleInputChange("state", e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-1 focus:ring-brand-blue outline-none transition"
                    />
                  </div>

                  {/* Complemento */}
                  <div className="md:col-span-4 space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">Complemento <span className="text-slate-400 font-normal">(Opcional)</span></label>
                    <input
                      type="text"
                      placeholder="Ex: Apto 402, bloco B, fundos..."
                      value={formResponses.complement || ""}
                      onChange={(e) => handleInputChange("complement", e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-1 focus:ring-brand-blue outline-none transition"
                    />
                  </div>
                </div>
              </div>

              {/* Informações da Consulta Section */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-1">3. Especialidade & Triagem</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Profissional */}
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">Selecione o Profissional Desejado <span className="text-red-500">*</span></label>
                    {activeSpecialties.length === 0 ? (
                      <div className="text-xs bg-amber-50 border border-amber-200 text-amber-800 font-medium p-3.5 rounded-xl">
                        Nenhum profissional de saúde está marcado como disponível no momento. Entre em contato direto com a coordenação via chat interno para realizar seu suporte off-line.
                      </div>
                    ) : (
                      <select
                        required
                        value={formResponses.professionalType || ""}
                        onChange={(e) => handleInputChange("professionalType", e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-1 focus:ring-brand-blue outline-none transition cursor-pointer font-bold text-slate-800"
                      >
                        <option value="">-- Escolha o Profissional Disponível --</option>
                        {activeSpecialties.map((spec) => (
                           <option key={spec} value={spec}>{spec}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Date and Time Picking Panel */}
                  <div className="md:col-span-2 space-y-4 pt-3 border-t border-slate-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* Date selection input */}
                      <div className="space-y-1.5 font-sans">
                        <label className="text-xs font-bold text-slate-700 block">
                          📅 Data da Consulta <span className="text-red-500">*</span>
                        </label>
                        <span className="text-[10px] text-slate-400 block leading-tight">Escolha o dia ideal para seu atendimento médico.</span>
                        <input
                          type="date"
                          required
                          min={new Date().toISOString().split("T")[0]}
                          value={formResponses.confirmedDate || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            if ((unavailableDates || []).includes(val)) {
                              alert("Esta data está indisponível para agendamento na clínica. Por favor, escolha outra data.");
                              handleInputChange("confirmedDate", "");
                            } else {
                              handleInputChange("confirmedDate", val);
                            }
                          }}
                          className={`w-full mt-1.5 px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs focus:bg-white focus:ring-1 focus:ring-brand-blue outline-none transition font-semibold ${
                            (unavailableDates || []).includes(formResponses.confirmedDate)
                              ? "border-red-400 text-red-650 ring-1 ring-red-300"
                              : "border-slate-200 text-slate-800"
                          }`}
                        />
                        {(unavailableDates || []).includes(formResponses.confirmedDate) && (
                          <p className="text-[10.5px] text-red-600 font-bold mt-1 animate-pulse">
                            ⚠️ Atenção: Esta data está indisponível na clínica!
                          </p>
                        )}
                      </div>

                      {/* Time selection input */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 block">
                          🕒 Horário da Consulta <span className="text-red-500">*</span>
                        </label>
                        <span className="text-[10px] text-slate-400 block leading-tight">Selecione uma hora disponível listada abaixo.</span>
                        
                        <div className="mt-2 space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                          {/* Morning */}
                          <div>
                            <span className="text-[9px] font-black text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded uppercase tracking-wider">☀️ Manhã</span>
                            <div className="grid grid-cols-4 gap-1.5 mt-1">
                              {["08:00", "09:00", "10:00", "11:00"].map((time) => {
                                const isSelected = formResponses.confirmedTime === time;
                                return (
                                  <button
                                    key={time}
                                    type="button"
                                    onClick={() => handleInputChange("confirmedTime", time)}
                                    className={`py-1.5 text-[11px] font-extrabold rounded-lg border transition-all text-center cursor-pointer ${
                                      isSelected
                                        ? "bg-brand-blue border-brand-blue text-white shadow-xs scale-[1.03]"
                                        : "bg-white hover:bg-slate-55 border-slate-200 text-slate-700 hover:border-slate-300"
                                    }`}
                                  >
                                    {time}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Afternoon */}
                          <div className="pt-1.5">
                            <span className="text-[9px] font-black text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded uppercase tracking-wider">🌤️ Tarde</span>
                            <div className="grid grid-cols-4 gap-1.5 mt-1">
                              {["13:00", "14:00", "15:00", "16:00"].map((time) => {
                                const isSelected = formResponses.confirmedTime === time;
                                return (
                                  <button
                                    key={time}
                                    type="button"
                                    onClick={() => handleInputChange("confirmedTime", time)}
                                    className={`py-1.5 text-[11px] font-extrabold rounded-lg border transition-all text-center cursor-pointer ${
                                      isSelected
                                        ? "bg-brand-blue border-brand-blue text-white shadow-xs scale-[1.03]"
                                        : "bg-white hover:bg-slate-55 border-slate-200 text-slate-700 hover:border-slate-300"
                                    }`}
                                  >
                                    {time.replace("13:00", "13:00 (13h)").replace("14:00", "14:00 (14h)").replace("15:00", "15:00 (15h)").replace("16:00", "16:00 (16h)")}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Sintomas */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">Descreva seus Sintomas <span className="text-red-500">*</span></label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Fale detalhadamente sobre o que você está sentindo..."
                      value={formResponses.symptoms || ""}
                      onChange={(e) => handleInputChange("symptoms", e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-1 focus:ring-brand-blue outline-none transition resize-none"
                    />
                  </div>

                  {/* Motivo do agendamento */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">Qual o Motivo do Agendamento? <span className="text-red-500">*</span></label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Fale o motivo de agendar esta consulta com este profissional..."
                      value={formResponses.reason || ""}
                      onChange={(e) => handleInputChange("reason", e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-1 focus:ring-brand-blue outline-none transition resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Notice text */}
              <p className="text-[10px] text-slate-400 leading-relaxed max-w-lg mt-2">
                * Asseguramos o sigilo clínico absoluto no encaminhamento e tratamento de todas as informações inseridas na CTC.
              </p>

              {/* Submit / Action buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  id="btn-agenda-consulta"
                  className="w-full md:w-auto bg-brand-green hover:bg-brand-green-hover text-brand-blue font-extrabold py-3 px-8 rounded-xl shadow-md cursor-pointer transition hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-2 text-sm"
                >
                  <Calendar className="w-4 h-4" />
                  <span>{editingScheduleId ? "Salvar Alterações" : "Solicitar Agendamento de Consulta"}</span>
                </button>
                {editingScheduleId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingScheduleId(null);
                      setFormResponses({
                        fullName: "",
                        cep: "",
                        street: "",
                        number: "",
                        neighborhood: "",
                        city: "",
                        state: "",
                        complement: "",
                        rg: "",
                        cpf: "",
                        voterCard: "",
                        voterZone: "",
                        voterSection: "",
                        age: "",
                        symptoms: "",
                        reason: "",
                        whatsapp: currentUser.phone1 || "",
                        professionalType: ""
                      });
                    }}
                    className="w-full md:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-6 rounded-xl transition cursor-pointer text-sm"
                  >
                    Cancelar Edição
                  </button>
                )}
              </div>

            </form>
          </div>

        </section>

      </main>

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
