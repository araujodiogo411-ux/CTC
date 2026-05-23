export interface User {
  id: string;
  email: string;
  password?: string;
  name: string;
  age: number;
  phone1: string;
  phone2?: string;
  isAdmin: boolean;
  createdAt: string;
}

export interface CatalogItem {
  id: string;
  title: string;
  description: string;
  price: string;
  imageUrl?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string; // 'admin' or userId
  receiverId: string; // 'admin' or userId
  text: string;
  timestamp: string;
  readByReceiver: boolean;
  attachment?: {
    type: 'image' | 'video' | 'audio' | 'pdf';
    url: string; // Base64 or Blob URL
    name?: string;
    duration?: number; // for custom audio player state
  };
  replyTo?: {
    id: string;
    text: string;
    senderName: string;
    mediaUrl?: string;
    mediaType?: string;
  };
}

export interface ConsultationQuestion {
  id: string;
  label: string;
  type: 'text' | 'number' | 'textarea';
  required: boolean;
}

export interface ConsultationSchedule {
  id: string;
  userId: string;
  userName: string;
  userEmail: string; // phone of the user
  
  // Specific required structured scheduling details
  fullName: string;
  cep: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  complement?: string;
  rg: string;
  cpf: string;
  voterCard: string;
  voterZone: string;
  voterSection: string;
  age: number;
  symptoms: string;
  reason: string;
  whatsapp: string;
  professionalType: string;

  // Admin response
  status: 'pending' | 'confirmed' | 'unavailable_date';
  confirmedDate?: string;
  confirmedTime?: string;
  confirmedLocation?: string;
  confirmedNotes?: string;
  createdAt: string;
}

export const ALL_SPECIALTIES = [
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
] as const;

export type Specialty = typeof ALL_SPECIALTIES[number];
