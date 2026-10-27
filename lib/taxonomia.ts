// Árvore de temas: grande área > especialidade > tema.
// É ela que liga uma questão errada à apostila, à revisão e ao painel.
// Os ids são estáveis: mudar um id quebra o histórico das tentativas.

import type { GrandeArea } from "./tipos";

export type Tema = { id: string; nome: string };
export type Especialidade = { id: string; nome: string; temas: Tema[] };
export type Area = { id: GrandeArea; nome: string; especialidades: Especialidade[] };

const t = (prefixo: string, nomes: Record<string, string>): Tema[] =>
  Object.entries(nomes).map(([slug, nome]) => ({ id: `${prefixo}.${slug}`, nome }));

export const TAXONOMIA: Area[] = [
  {
    id: "clinica",
    nome: "Clínica Médica",
    especialidades: [
      { id: "clinica.cardio", nome: "Cardiologia", temas: t("clinica.cardio", {
        has: "Hipertensão arterial", ic: "Insuficiência cardíaca", sca: "Síndromes coronarianas",
        arritmias: "Arritmias e FA", valvopatias: "Valvopatias", dislipidemia: "Dislipidemia",
      }) },
      { id: "clinica.endocrino", nome: "Endocrinologia", temas: t("clinica.endocrino", {
        dm: "Diabetes mellitus", tireoide: "Tireoide", adrenal: "Adrenal", osso: "Osteoporose e cálcio",
      }) },
      { id: "clinica.pneumo", nome: "Pneumologia", temas: t("clinica.pneumo", {
        asma: "Asma", dpoc: "DPOC", pneumonia: "Pneumonias", tep: "Tromboembolismo pulmonar", tb: "Tuberculose",
      }) },
      { id: "clinica.nefro", nome: "Nefrologia", temas: t("clinica.nefro", {
        lra: "Lesão renal aguda", drc: "Doença renal crônica", glomerulo: "Glomerulopatias",
        eletrolitos: "Distúrbios hidroeletrolíticos", acidobase: "Distúrbios acidobásicos",
      }) },
      { id: "clinica.gastro", nome: "Gastroenterologia e Hepatologia", temas: t("clinica.gastro", {
        hda: "Hemorragia digestiva", cirrose: "Cirrose e complicações", hepatites: "Hepatites virais",
        dii: "Doença inflamatória intestinal", pancreatite: "Pancreatite",
      }) },
      { id: "clinica.infecto", nome: "Infectologia", temas: t("clinica.infecto", {
        hiv: "HIV/aids", sepse: "Sepse", arboviroses: "Arboviroses", endemicas: "Doenças endêmicas e negligenciadas",
        meningite: "Meningites", atb: "Antibioticoterapia",
      }) },
      { id: "clinica.hemato", nome: "Hematologia", temas: t("clinica.hemato", {
        anemias: "Anemias", leucemias: "Leucemias e linfomas", hemostasia: "Hemostasia e trombose",
      }) },
      { id: "clinica.reumato", nome: "Reumatologia", temas: t("clinica.reumato", {
        les: "Lúpus", ar: "Artrite reumatoide", vasculites: "Vasculites", gota: "Gota e artrites",
      }) },
      { id: "clinica.neuro", nome: "Neurologia", temas: t("clinica.neuro", {
        avc: "AVC", cefaleia: "Cefaleias", epilepsia: "Epilepsia", demencias: "Demências",
      }) },
      { id: "clinica.psiq", nome: "Psiquiatria", temas: t("clinica.psiq", {
        humor: "Transtornos do humor", ansiedade: "Ansiedade", psicoses: "Psicoses", substancias: "Uso de substâncias",
      }) },
      { id: "clinica.emergencia", nome: "Emergência e Terapia Intensiva", temas: t("clinica.emergencia", {
        pcr: "PCR e reanimação", choque: "Choque", intoxicacoes: "Intoxicações",
      }) },
    ],
  },
  {
    id: "cirurgia",
    nome: "Cirurgia",
    especialidades: [
      { id: "cirurgia.trauma", nome: "Trauma", temas: t("cirurgia.trauma", {
        atls: "Atendimento inicial (ATLS)", tce: "Trauma cranioencefálico", torax: "Trauma torácico",
        abdome: "Trauma abdominal", queimados: "Queimaduras",
      }) },
      { id: "cirurgia.abdome", nome: "Abdome agudo e aparelho digestivo", temas: t("cirurgia.abdome", {
        apendicite: "Apendicite", obstrucao: "Obstrução intestinal", vias_biliares: "Vias biliares",
        hernias: "Hérnias", colorretal: "Doenças colorretais", esofago_estomago: "Esôfago e estômago",
      }) },
      { id: "cirurgia.periop", nome: "Pré e pós-operatório", temas: t("cirurgia.periop", {
        risco: "Avaliação de risco", complicacoes: "Complicações pós-operatórias", anestesia: "Anestesia",
      }) },
      { id: "cirurgia.uro", nome: "Urologia", temas: t("cirurgia.uro", {
        litiase: "Litíase", hpb: "HPB e próstata", escroto: "Escroto agudo",
      }) },
      { id: "cirurgia.vascular", nome: "Cirurgia vascular", temas: t("cirurgia.vascular", {
        dap: "Doença arterial periférica", aorta: "Aneurisma de aorta", tvp: "Trombose venosa profunda",
      }) },
      { id: "cirurgia.onco", nome: "Oncologia cirúrgica", temas: t("cirurgia.onco", {
        cabeca_pescoco: "Cabeça e pescoço", tireoide: "Nódulo de tireoide", mama: "Câncer de mama",
      }) },
    ],
  },
  {
    id: "go",
    nome: "Ginecologia e Obstetrícia",
    especialidades: [
      { id: "go.obstetricia", nome: "Obstetrícia", temas: t("go.obstetricia", {
        prenatal: "Pré-natal", sangramento1: "Sangramento da 1ª metade", sangramento2: "Sangramento da 2ª metade",
        dheg: "Síndromes hipertensivas", dmg: "Diabetes gestacional", parto: "Parto e puerpério",
        infeccoes: "Infecções na gestação", prematuridade: "Prematuridade e RPMO",
      }) },
      { id: "go.ginecologia", nome: "Ginecologia", temas: t("go.ginecologia", {
        ciclo: "Ciclo menstrual e amenorreias", sua: "Sangramento uterino anormal", ist: "ISTs e vulvovaginites",
        contracepcao: "Contracepção", climaterio: "Climatério", colo: "Câncer de colo e rastreio",
        endometriose: "Endometriose", mama: "Mastologia",
      }) },
    ],
  },
  {
    id: "pediatria",
    nome: "Pediatria",
    especialidades: [
      { id: "pediatria.neonato", nome: "Neonatologia", temas: t("pediatria.neonato", {
        reanimacao: "Reanimação neonatal", ictericia: "Icterícia neonatal", respiratorio: "Distúrbios respiratórios",
        infeccoes: "Infecções congênitas",
      }) },
      { id: "pediatria.puericultura", nome: "Puericultura", temas: t("pediatria.puericultura", {
        crescimento: "Crescimento", desenvolvimento: "Desenvolvimento", aleitamento: "Aleitamento e alimentação",
        vacinacao: "Vacinação",
      }) },
      { id: "pediatria.infecto", nome: "Infectologia pediátrica", temas: t("pediatria.infecto", {
        exantematicas: "Doenças exantemáticas", ivas: "Infecções respiratórias", diarreia: "Diarreia e desidratação",
        itu: "ITU na infância",
      }) },
      { id: "pediatria.emergencia", nome: "Emergências pediátricas", temas: t("pediatria.emergencia", {
        asma: "Asma e sibilância", convulsao: "Convulsão febril", maus_tratos: "Maus-tratos",
      }) },
    ],
  },
  {
    id: "preventiva",
    nome: "Medicina Preventiva e Social",
    especialidades: [
      { id: "preventiva.sus", nome: "SUS e políticas de saúde", temas: t("preventiva.sus", {
        principios: "Princípios e legislação do SUS", aps: "Atenção primária e ESF", financiamento: "Financiamento e gestão",
      }) },
      { id: "preventiva.epidemio", nome: "Epidemiologia", temas: t("preventiva.epidemio", {
        indicadores: "Indicadores de saúde", estudos: "Desenhos de estudo", testes: "Testes diagnósticos",
        bioestatistica: "Bioestatística", vigilancia: "Vigilância e notificação",
      }) },
      { id: "preventiva.trabalho", nome: "Saúde do trabalhador", temas: t("preventiva.trabalho", {
        acidentes: "Acidentes e doenças do trabalho",
      }) },
      { id: "preventiva.etica", nome: "Ética médica", temas: t("preventiva.etica", {
        codigo: "Código de ética e bioética",
      }) },
      { id: "preventiva.rastreamento", nome: "Prevenção e rastreamento", temas: t("preventiva.rastreamento", {
        rastreio: "Rastreamentos e níveis de prevenção",
      }) },
    ],
  },
];

type Caminho = { area: Area; especialidade: Especialidade; tema?: Tema };

const INDICE = new Map<string, Caminho>();
for (const area of TAXONOMIA) {
  for (const especialidade of area.especialidades) {
    INDICE.set(especialidade.id, { area, especialidade });
    for (const tema of especialidade.temas) INDICE.set(tema.id, { area, especialidade, tema });
  }
}

export function caminhoDoTema(id: string): Caminho | undefined {
  return INDICE.get(id);
}

export function nomeDoTema(id: string): string {
  const c = INDICE.get(id);
  if (!c) return id;
  return c.tema ? c.tema.nome : c.especialidade.nome;
}

export function temaExiste(id: string): boolean {
  return INDICE.has(id);
}

export function todosOsTemas(): { id: string; nome: string; area: GrandeArea; especialidade: string }[] {
  return TAXONOMIA.flatMap((a) =>
    a.especialidades.flatMap((e) =>
      e.temas.map((tema) => ({ id: tema.id, nome: tema.nome, area: a.id, especialidade: e.nome })),
    ),
  );
}
