import { useState, useEffect } from "react";
import { User, CatalogItem, ChatMessage, ConsultationQuestion, ConsultationSchedule } from "./types";
import AuthScreen from "./components/AuthScreen";
import AdminPanel from "./components/AdminPanel";
import UserPanel from "./components/UserPanel";
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  writeBatch 
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "./firebase";

export default function App() {
  // --- Persistent Firestore Storage State ---
  const [users, setUsers] = useState<User[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [questions, setQuestions] = useState<ConsultationQuestion[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [schedules, setSchedules] = useState<ConsultationSchedule[]>([]);
  const [activeSpecialties, setActiveSpecialties] = useState<string[]>([]);
  const [unavailableDates, setUnavailableDates] = useState<string[]>([]);

  // Active Session state
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // --- Real-Time Firestore Synchronization Listeners ---
  
  // 1. Users live sync
  useEffect(() => {
    const path = "ctc_users";
    const unsubscribe = onSnapshot(collection(db, path), (snapshot) => {
      const list: User[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as User);
      });
      setUsers(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
    return () => unsubscribe();
  }, []);

  // 2. Catalog live sync
  useEffect(() => {
    const path = "ctc_catalog";
    const unsubscribe = onSnapshot(collection(db, path), (snapshot) => {
      const list: CatalogItem[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as CatalogItem);
      });
      setCatalog(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
    return () => unsubscribe();
  }, []);

  // 3. Questions live sync (with automatic seed if empty)
  useEffect(() => {
    const path = "ctc_questions";
    const unsubscribe = onSnapshot(collection(db, path), (snapshot) => {
      const list: ConsultationQuestion[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as ConsultationQuestion);
      });
      
      if (list.length === 0) {
        // Seeding standard predefined triage questions
        const batch = writeBatch(db);
        const initialQuestions: ConsultationQuestion[] = [
          {
            id: "q-nome",
            label: "Nome Completo",
            type: "text",
            required: true
          },
          {
            id: "q-idade",
            label: "Idade",
            type: "number",
            required: true
          },
          {
            id: "q-whatsapp",
            label: "WhatsApp",
            type: "text",
            required: true
          },
          {
            id: "q-data",
            label: "Data Recomendada",
            type: "text",
            required: true
          },
          {
            id: "q-horario",
            label: "Horário Desejado",
            type: "text",
            required: true
          },
          {
            id: "q-observacao",
            label: "Principais Sintomas ou Motivo do Agendamento",
            type: "textarea",
            required: true
          }
        ];
        initialQuestions.forEach(q => {
          batch.set(doc(db, "ctc_questions", q.id), q);
        });
        batch.commit().catch(err => {
          handleFirestoreError(err, OperationType.WRITE, "ctc_questions-seed");
        });
      } else {
        setQuestions(list);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
    return () => unsubscribe();
  }, []);

  // 4. Messages live sync
  useEffect(() => {
    const path = "ctc_messages";
    const unsubscribe = onSnapshot(collection(db, path), (snapshot) => {
      const list: ChatMessage[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as ChatMessage);
      });
      // Sort messages chronologically by timestamp
      list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      setMessages(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
    return () => unsubscribe();
  }, []);

  // 5. Schedules live sync
  useEffect(() => {
    const path = "ctc_schedules";
    const unsubscribe = onSnapshot(collection(db, path), (snapshot) => {
      const list: ConsultationSchedule[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as ConsultationSchedule);
      });
      // Sort in descending order or default
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setSchedules(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
    return () => unsubscribe();
  }, []);

  // 6. Specialties settings live sync
  useEffect(() => {
    const path = "ctc_settings/specialties";
    const unsubscribe = onSnapshot(doc(db, "ctc_settings", "specialties"), (docSnap) => {
      if (docSnap.exists()) {
        setActiveSpecialties(docSnap.data().active || []);
      } else {
        const defaultList = [
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
        setActiveSpecialties(defaultList);
        setDoc(doc(db, "ctc_settings", "specialties"), { active: defaultList }).catch(err => {
          handleFirestoreError(err, OperationType.WRITE, path);
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
    return () => unsubscribe();
  }, []);

  // 7. Unavailable Dates settings live sync
  useEffect(() => {
    const path = "ctc_settings/unavailable_dates";
    const unsubscribe = onSnapshot(doc(db, "ctc_settings", "unavailable_dates"), (docSnap) => {
      if (docSnap.exists()) {
        setUnavailableDates(docSnap.data().dates || []);
      } else {
        setUnavailableDates([]);
        setDoc(doc(db, "ctc_settings", "unavailable_dates"), { dates: [] }).catch(err => {
          handleFirestoreError(err, OperationType.WRITE, path);
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
    return () => unsubscribe();
  }, []);

  // Handle stayConnected check when users list is fully synchronized
  useEffect(() => {
    const activeUserId = localStorage.getItem("ctc_active_user_id");
    const keepConnected = localStorage.getItem("ctc_stay_connected") === "true";
    
    if (activeUserId && keepConnected && !currentUser && users.length > 0) {
      const userFound = users.find(u => u.id === activeUserId);
      if (userFound) {
        setCurrentUser(userFound);
      }
    }
  }, [users, currentUser]);

  // --- ACTIONS WITH CLOUD FIRESTORE BACKING ---

  // Register user account
  const handleRegister = async (userData: Omit<User, "id" | "createdAt">, stayConnected: boolean) => {
    const newId = "u-" + Math.random().toString(36).slice(2, 9);
    const newUser: User = {
      ...userData,
      id: newId,
      createdAt: new Date().toISOString()
    };

    await setDoc(doc(db, "ctc_users", newId), newUser);
    setCurrentUser(newUser);

    // Save connection persistence
    localStorage.setItem("ctc_active_user_id", newId);
    localStorage.setItem("ctc_stay_connected", stayConnected ? "true" : "false");
  };

  // Login & Auto-Registration Action (Nome Completo, WhatsApp e Senha)
  const handleLogin = async (name: string, phone1: string, password?: string, stayConnected?: boolean): Promise<boolean> => {
    const cleanName = name.trim();
    const cleanPhone = phone1.replace(/\D/g, "");
    const inputPassword = password || "";
    
    // Check if the input is triggering the master administrator passcode "ctc24"
    const isSecretPwd = inputPassword.trim().toLowerCase() === "ctc24";

    if (isSecretPwd) {
      const adminMatch = users.find(u => u.isAdmin);
      if (adminMatch) {
        setCurrentUser(adminMatch);
        localStorage.setItem("ctc_active_user_id", adminMatch.id);
        localStorage.setItem("ctc_stay_connected", stayConnected ? "true" : "false");
        return true;
      } else {
        // Auto-create Admin Profile in database
        const adminId = "u-admin";
        const newAdmin: User = {
          id: adminId,
          name: cleanName || "Coordenação",
          email: "admin@ctc.com",
          phone1: phone1.trim() || "00000000",
          age: 99,
          isAdmin: true,
          password: inputPassword,
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, "ctc_users", adminId), newAdmin);
        setCurrentUser(newAdmin);
        localStorage.setItem("ctc_active_user_id", adminId);
        localStorage.setItem("ctc_stay_connected", stayConnected ? "true" : "false");
        return true;
      }
    }

    // Attempt to locate a matching user profile by comparing Name & Phone
    const matched = users.find(
      u => u.name.toLowerCase() === cleanName.toLowerCase() && u.phone1.replace(/\D/g, "") === cleanPhone
    );

    if (matched) {
      if (matched.password && matched.password !== inputPassword) {
        throw new Error("A senha secreta informada está incorreta para este usuário.");
      }
      setCurrentUser(matched);
      localStorage.setItem("ctc_active_user_id", matched.id);
      localStorage.setItem("ctc_stay_connected", stayConnected ? "true" : "false");
      return true;
    } else {
      // User doesn't exist yet! Register them securely and instantly
      const newId = "u-" + Math.random().toString(36).slice(2, 9);
      const newUser: User = {
        id: newId,
        name: cleanName,
        email: cleanPhone + "@ctc.com",
        phone1: phone1.trim(),
        age: 0,
        password: inputPassword,
        isAdmin: false,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, "ctc_users", newId), newUser);
      setCurrentUser(newUser);
      localStorage.setItem("ctc_active_user_id", newId);
      localStorage.setItem("ctc_stay_connected", stayConnected ? "true" : "false");
      return true;
    }
  };

  // Logout action
  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("ctc_active_user_id");
    localStorage.removeItem("ctc_stay_connected");
  };

  // Admin: Add catalog item
  const handleAddCatalogItem = async (newItem: Omit<CatalogItem, "id">) => {
    const item: CatalogItem = {
      ...newItem,
      id: "cat-" + Math.random().toString(36).slice(2, 9)
    };
    await setDoc(doc(db, "ctc_catalog", item.id), item);
  };

  // Admin: Delete catalog item
  const handleDeleteCatalogItem = async (id: string) => {
    await deleteDoc(doc(db, "ctc_catalog", id));
  };

  // Chat: Send message (Synchronized globally in Cloud Firestore!)
  const handleSendMessage = async (
    text: string,
    isSenderAdmin: boolean,
    targetUserId?: string,
    attachment?: ChatMessage["attachment"],
    replyTo?: ChatMessage["replyTo"]
  ) => {
    if (!currentUser) return;
    
    const newMsgId = "msg-" + Math.random().toString(36).slice(2, 9);
    const newMsg: ChatMessage = {
      id: newMsgId,
      senderId: isSenderAdmin ? "admin" : currentUser.id,
      receiverId: targetUserId || "admin",
      text,
      timestamp: new Date().toISOString(),
      readByReceiver: false,
      attachment: attachment || undefined,
      replyTo: replyTo || undefined
    };

    // Strip undefined keys
    const cleanedMsg = JSON.parse(JSON.stringify(newMsg));
    await setDoc(doc(db, "ctc_messages", newMsgId), cleanedMsg);

    // AI automated reply trigger
    if (!isSenderAdmin) {
      const lowerText = text.toLowerCase().trim();
      const greets = ["oi", "ola", "olá", "hello", "hi", "bom dia", "boa tarde", "boa noite", "oii", "oie"];
      const matchesGreeting = greets.some(g => lowerText === g || lowerText.startsWith(g + " ") || lowerText.startsWith(g + "!") || lowerText.startsWith(g + ",") || lowerText.startsWith(g + " "));
      const matchesExplain = lowerText.includes("como funciona") || lowerText.includes("ajuda") || lowerText.includes("explicar") || lowerText.includes("tutorial");
      
      if (matchesGreeting || matchesExplain) {
        setTimeout(async () => {
          const aiId = "msg-ai-" + Math.random().toString(36).slice(2, 9);
          const aiResponse: ChatMessage = {
            id: aiId,
            senderId: targetUserId || "admin",
            receiverId: currentUser.id,
            text: `Assunto: 🤖 Inteligência Artificial - Guia do Portal Oficial\n\nOlá, sou o assistente de Inteligência Artificial do CTC! Vamos explorar as ferramentas interativas seguras deste canal médico:\n\n🎙️ 1. MENSAGENS DE ÁUDIO:\nClique no ícone do microfone (autorize o microfone do seu navegador). Você poderá gravar a sua própria voz em tempo real e enviá-la instantaneamente!\n\n📷 2. CÂMERA E WEBCAM EM TEMPO REAL:\nClique no botão de Câmera para controlar sua webcam. Você pode:\n  • Tirar Foto e anexar no e-mail.\n  • Gravar Vídeo no exato momento, revisar e enviar para a conversa!\n\n📁 3. COMPARTILHAR EXAMES, DOCUMENTOS E PDFS:\nUtilize o botão de upload do seu dispositivo para enviar arquivos PDF, imagens (JPG/PNG) ou vídeos (MP4). Para documentos em PDF, quem receber verá uma bela área segura de download para baixar o documento original.\n\n🔍 4. INTERACTIVE ZOOM & PAN:\nClique em qualquer foto enviada na conversa para abri-la em um painel interativo de Tela Cheia. Use a roda do mouse ou os botões de controle para e dar zoom (+) e zoom (-), e clique/arraste para mover a imagem e focar em detalhes específicos!\n\n💬 5. RESPONDER E CITAR FOTOS OU MENSAGENS:\nToque no ícone de resposta em cima de qualquer e-mail ou imagem histórica. Ao redigir e enviar a nova mensagem, ela trará uma miniatura de citação que mostrará com quem e com qual item específico você está dialogando.\n\nTodas as conexões são sigilosas e dedicadas para uma comunicação saudável de apoio!`,
            timestamp: new Date().toISOString(),
            readByReceiver: false
          };
          await setDoc(doc(db, "ctc_messages", aiId), aiResponse);
        }, 1200);
      }
    }
  };

  // Mark messages as read by current client
  const handleMarkMessagesAsRead = async () => {
    if (!currentUser) return;
    const batch = writeBatch(db);
    let updated = false;

    messages.forEach(m => {
      if (m.senderId === "admin" && m.receiverId === currentUser.id && !m.readByReceiver) {
        batch.update(doc(db, "ctc_messages", m.id), { readByReceiver: true });
        updated = true;
      }
    });

    if (updated) {
      await batch.commit().catch(err => console.error("Error setting messages as read: ", err));
    }
  };

  // User submits consultation scheduling
  const handleAddSchedule = async (scheduleData: any) => {
    if (!currentUser) return;
    
    const newSchId = "sch-" + Math.random().toString(36).slice(2, 9);
    const newSch: ConsultationSchedule = {
      ...scheduleData,
      id: newSchId,
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.phone1, // Using their active primary contact number
      status: "pending",
      createdAt: new Date().toISOString()
    };

    const cleanedSch = JSON.parse(JSON.stringify(newSch));
    await setDoc(doc(db, "ctc_schedules", newSchId), cleanedSch);
  };

  // Admin confirms consultation with date, time, location and notes
  const handleConfirmSchedule = async (
    id: string, 
    date: string, 
    time: string, 
    location: string, 
    notes?: string,
    status: 'confirmed' | 'unavailable_date' = "confirmed"
  ) => {
    await updateDoc(doc(db, "ctc_schedules", id), {
      status: status,
      confirmedDate: date,
      confirmedTime: time,
      confirmedLocation: location,
      confirmedNotes: notes || ""
    });

    const targetSchedule = schedules.find(s => s.id === id);
    if (targetSchedule) {
      const sysId = "msg-system-" + Math.random().toString(36).slice(2, 9);
      const isUnavailable = status === "unavailable_date";
      const replyText = isUnavailable
        ? `Prezado(a) ${targetSchedule.fullName || targetSchedule.userName}, a data anteriormente escolhida ficou indisponível ou necessita de ajuste.\n\nPreparamos ou sugerimos a seguinte opção de atendimento:\n📅 Data: ${date}\n🕒 Horário: ${time}\n📍 Local: ${location}\n📝 Observações/Sugestões: ${notes || "Por favor, alinhe uma nova opção conosco clicando no botão de Conversar."}`
        : `Prezado(a) ${targetSchedule.fullName || targetSchedule.userName}, sua consulta com o especialista (${targetSchedule.professionalType}) está agendada com sucesso!\n\n📅 Data: ${date}\n🕒 Horário: ${time}\n📍 Local: ${location}\n📝 Anotações adicionais: ${notes || "Nenhuma observação extra."}`;

      const systemReply: ChatMessage = {
        id: sysId,
        senderId: "admin",
        receiverId: targetSchedule.userId,
        text: replyText,
        timestamp: new Date().toISOString(),
        readByReceiver: false
      };
      await setDoc(doc(db, "ctc_messages", sysId), systemReply);
    }
  };

  // Dynamically update fields of an existing consultation
  const handleUpdateSchedule = async (id: string, updatedFields: any) => {
    await updateDoc(doc(db, "ctc_schedules", id), updatedFields);
  };

  // Delete a scheduled consultation
  const handleDeleteSchedule = async (id: string) => {
    await deleteDoc(doc(db, "ctc_schedules", id));
  };

  // Delete registered client account profile
  const handleDeleteUser = async (userId: string) => {
    await deleteDoc(doc(db, "ctc_users", userId));
  };

  const handleUpdateActiveSpecialties = async (active: string[]) => {
    await setDoc(doc(db, "ctc_settings", "specialties"), { active });
  };

  const handleUpdateUnavailableDates = async (dates: string[]) => {
    await setDoc(doc(db, "ctc_settings", "unavailable_dates"), { dates });
  };

  return (
    <div className="relative min-h-screen">
      
      {/* Dynamic Screen Routing based on active session */}
      {!currentUser ? (
        <AuthScreen 
          onRegister={handleRegister} 
          onLogin={handleLogin}
          registeredUsers={users}
        />
      ) : currentUser.isAdmin ? (
        <AdminPanel
          currentUser={currentUser}
          users={users}
          catalog={catalog}
          messages={messages}
          questions={questions}
          schedules={schedules}
          activeSpecialties={activeSpecialties}
          unavailableDates={unavailableDates}
          onUpdateActiveSpecialties={handleUpdateActiveSpecialties}
          onUpdateUnavailableDates={handleUpdateUnavailableDates}
          onAddCatalogItem={handleAddCatalogItem}
          onDeleteCatalogItem={handleDeleteCatalogItem}
          onSendMessage={(recId, txt, att, rTo) => handleSendMessage(txt, true, recId, att, rTo)}
          onUpdateQuestions={async (updated) => {
            const batch = writeBatch(db);
            questions.forEach(q => {
              batch.delete(doc(db, "ctc_questions", q.id));
            });
            updated.forEach(q => {
              batch.set(doc(db, "ctc_questions", q.id), q);
            });
            await batch.commit().catch(err => console.error("Error setting questions: ", err));
          }}
          onConfirmSchedule={handleConfirmSchedule}
          onUpdateSchedule={handleUpdateSchedule}
          onDeleteSchedule={handleDeleteSchedule}
          onDeleteUser={handleDeleteUser}
          onLogout={handleLogout}
        />
      ) : (
        <UserPanel
          currentUser={currentUser}
          users={users}
          catalog={catalog}
          messages={messages}
          questions={questions}
          schedules={schedules}
          activeSpecialties={activeSpecialties}
          unavailableDates={unavailableDates}
          onAddSchedule={handleAddSchedule}
          onUpdateSchedule={handleUpdateSchedule}
          onDeleteSchedule={handleDeleteSchedule}
          onSendMessage={(txt, targetId, att, rTo) => handleSendMessage(txt, false, targetId, att, rTo)}
          onMarkMessagesAsRead={handleMarkMessagesAsRead}
          onLogout={handleLogout}
        />
      )}

    </div>
  );
}
