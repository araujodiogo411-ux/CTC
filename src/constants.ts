import { CatalogItem, ConsultationQuestion } from "./types";

export const DEFAULT_CATALOG: CatalogItem[] = [];

export const DEFAULT_QUESTIONS: ConsultationQuestion[] = [
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
    id: "q-observacao",
    label: "Principais Sintomas ou Motivo do Agendamento",
    type: "textarea",
    required: true
  }
];
