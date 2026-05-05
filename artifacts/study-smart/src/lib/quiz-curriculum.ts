export type LevelGroup = "junior_primary" | "senior_primary" | "junior_secondary" | "senior_secondary" | "university";

export const LEVEL_GROUP_INFO: Record<LevelGroup, {
  label: string; short: string; emoji: string; gradient: string;
  description: string; levels: string[]; levelDesc: string;
}> = {
  junior_primary: {
    label: "Junior Primary", short: "Jr Primary", emoji: "🌱",
    gradient: "from-green-400 to-emerald-500",
    description: "Foundation learning for Primary 1–3 (ages 7–9). Builds core literacy, numeracy and science concepts.",
    levels: ["P1","P2","P3"],
    levelDesc: "P1 = Primary 1 (age 7) · P2 = Primary 2 · P3 = Primary 3 (age 9)",
  },
  senior_primary: {
    label: "Senior Primary", short: "Sr Primary", emoji: "🌿",
    gradient: "from-teal-400 to-green-600",
    description: "Intermediate primary learning for Primary 4–6 (ages 10–12). Deepens understanding and exam readiness.",
    levels: ["P4","P5","P6"],
    levelDesc: "P4 = Primary 4 (age 10) · P5 = Primary 5 · P6 = Primary 6 (age 12)",
  },
  junior_secondary: {
    label: "Junior Secondary", short: "Jr Secondary", emoji: "📘",
    gradient: "from-blue-400 to-indigo-500",
    description: "Early secondary education for Secondary 1–3 (ages 13–15). Introduces specialised subjects and analytical thinking.",
    levels: ["S1","S2","S3"],
    levelDesc: "S1 = Secondary 1 (age 13) · S2 = Secondary 2 · S3 = Secondary 3 (age 15)",
  },
  senior_secondary: {
    label: "Senior Secondary", short: "Sr Secondary", emoji: "📗",
    gradient: "from-indigo-500 to-violet-600",
    description: "Upper secondary for Secondary 4–6 (ages 16–18). Rigorous exam preparation and pre-university concepts.",
    levels: ["S4","S5","S6"],
    levelDesc: "S4 = Secondary 4 (age 16) · S5 = Secondary 5 · S6 = Pre-University (age 18)",
  },
  university: {
    label: "University", short: "University", emoji: "🎓",
    gradient: "from-purple-500 to-fuchsia-600",
    description: "Tertiary-level content for undergraduates. Advanced analytical and conceptual questions.",
    levels: ["U1","U2","U3","U4"],
    levelDesc: "U1 = Year 1 up to U4 = Final Year",
  },
};

export const LEVEL_TO_GROUP: Record<string, LevelGroup> = {
  P1:"junior_primary", P2:"junior_primary", P3:"junior_primary",
  P4:"senior_primary",  P5:"senior_primary",  P6:"senior_primary",
  S1:"junior_secondary",S2:"junior_secondary",S3:"junior_secondary",
  S4:"senior_secondary",S5:"senior_secondary",S6:"senior_secondary",
  U1:"university",U2:"university",U3:"university",U4:"university",
};

export const LEVEL_LABELS: Record<string, string> = {
  P1:"Primary 1",P2:"Primary 2",P3:"Primary 3",
  P4:"Primary 4",P5:"Primary 5",P6:"Primary 6",
  S1:"Secondary 1",S2:"Secondary 2",S3:"Secondary 3",
  S4:"Secondary 4",S5:"Secondary 5",S6:"Secondary 6",
  U1:"University Year 1",U2:"University Year 2",U3:"University Year 3",U4:"University Year 4",
};

export type QuizTopic = { id: string; name: string; description: string };
export type QuizSubject = { id: string; name: string; icon: string; color: string; topics: QuizTopic[] };

const PRIMARY_SUBJECTS: QuizSubject[] = [
  {
    id: "english", name: "English Language", icon: "📝", color: "from-blue-400 to-sky-500",
    topics: [
      { id: "vocabulary", name: "Vocabulary & Word Study", description: "Word meanings, synonyms, antonyms and context clues" },
      { id: "grammar", name: "Grammar & Sentence Structure", description: "Parts of speech, tenses, and sentence patterns" },
      { id: "comprehension", name: "Reading Comprehension", description: "Understanding passages and answering questions" },
      { id: "writing", name: "Creative Writing", description: "Story writing, descriptive techniques, and composition skills" },
      { id: "punctuation", name: "Punctuation & Spelling", description: "Correct usage of punctuation marks and common spelling rules" },
    ],
  },
  {
    id: "maths", name: "Mathematics", icon: "🔢", color: "from-orange-400 to-amber-500",
    topics: [
      { id: "numbers", name: "Numbers & Operations", description: "Whole numbers, addition, subtraction, multiplication and division" },
      { id: "fractions", name: "Fractions & Decimals", description: "Fractions, decimals, and their operations and conversions" },
      { id: "geometry", name: "Measurement & Geometry", description: "Area, perimeter, volume, shapes and angles" },
      { id: "data", name: "Data Analysis & Statistics", description: "Graphs, tables, averages and interpreting data" },
      { id: "word-problems", name: "Problem Solving", description: "Multi-step word problems and mathematical reasoning" },
    ],
  },
  {
    id: "science", name: "Science", icon: "🔬", color: "from-emerald-400 to-teal-500",
    topics: [
      { id: "plants-animals", name: "Plants & Animals", description: "Life cycles, characteristics and adaptations of living things" },
      { id: "materials", name: "Materials & Matter", description: "Properties of materials, states of matter and changes" },
      { id: "forces", name: "Forces & Energy", description: "Push, pull, magnets, light, sound and electricity" },
      { id: "environment", name: "Environment & Ecosystems", description: "Food chains, habitats and environmental conservation" },
      { id: "human-body", name: "Human Biology", description: "Human organ systems, health and hygiene" },
    ],
  },
  {
    id: "social-studies", name: "Social Studies", icon: "🌏", color: "from-rose-400 to-pink-500",
    topics: [
      { id: "community", name: "Our Community", description: "Community helpers, citizenship and national identity" },
      { id: "singapore", name: "Singapore & Its History", description: "Singapore's founding, independence and key historical events" },
      { id: "asia", name: "Our Region — Asia", description: "Neighbouring countries, ASEAN and regional relations" },
      { id: "culture", name: "Culture & Heritage", description: "Races, languages, festivals and multicultural harmony" },
      { id: "global", name: "Global Challenges", description: "Sustainability, world issues and global citizenship" },
    ],
  },
];

const SECONDARY_SUBJECTS: QuizSubject[] = [
  {
    id: "english", name: "English Language", icon: "📝", color: "from-blue-400 to-sky-500",
    topics: [
      { id: "grammar", name: "Grammar & Language Use", description: "Advanced grammar, syntax and language conventions" },
      { id: "comprehension", name: "Reading Comprehension", description: "Inferencing, vocabulary-in-context and comprehension strategies" },
      { id: "essay", name: "Essay & Expository Writing", description: "Argumentative, expository and narrative essay skills" },
      { id: "situational", name: "Situational & Formal Writing", description: "Letters, reports, emails and formal writing formats" },
      { id: "summary", name: "Summary & Synthesis", description: "Summarising and synthesising information from texts" },
    ],
  },
  {
    id: "maths", name: "Mathematics", icon: "🔢", color: "from-orange-400 to-amber-500",
    topics: [
      { id: "algebra", name: "Numbers & Algebra", description: "Indices, algebraic expressions, equations and inequalities" },
      { id: "geometry", name: "Geometry & Measurement", description: "Congruence, similarity, Pythagoras theorem and coordinate geometry" },
      { id: "stats", name: "Statistics & Probability", description: "Data analysis, mean, median, mode and probability" },
      { id: "functions", name: "Functions & Graphs", description: "Linear, quadratic and other functions, graph sketching" },
      { id: "trig", name: "Trigonometry", description: "Trigonometric ratios, sine rule, cosine rule and bearings" },
    ],
  },
  {
    id: "amath", name: "Additional Mathematics", icon: "📐", color: "from-violet-400 to-purple-500",
    topics: [
      { id: "a-algebra", name: "Algebra & Functions", description: "Polynomials, partial fractions, binomial theorem and surds" },
      { id: "differentiation", name: "Differentiation", description: "Rules of differentiation, rates of change and applications" },
      { id: "integration", name: "Integration", description: "Definite and indefinite integrals and their applications" },
      { id: "a-trig", name: "Advanced Trigonometry", description: "Trigonometric identities, equations and proofs" },
      { id: "log-exp", name: "Logarithms & Exponentials", description: "Exponential and logarithmic functions and equations" },
    ],
  },
  {
    id: "biology", name: "Biology", icon: "🧬", color: "from-green-400 to-emerald-500",
    topics: [
      { id: "cells", name: "Cell Biology", description: "Cell structure, organelles, cell division and transport" },
      { id: "nutrition", name: "Nutrition & Digestion", description: "Nutrients, digestion, enzymes and the alimentary canal" },
      { id: "transport", name: "Transport in Living Things", description: "Circulatory system, xylem, phloem and gas exchange" },
      { id: "genetics", name: "Genetics & Inheritance", description: "DNA, genes, chromosomes, Mendelian genetics and mutations" },
      { id: "ecology", name: "Ecology & Environment", description: "Food webs, populations, ecosystems and conservation" },
    ],
  },
  {
    id: "chemistry", name: "Chemistry", icon: "⚗️", color: "from-teal-400 to-cyan-500",
    topics: [
      { id: "atomic", name: "Atomic Structure", description: "Atomic model, electron configuration, periodic table and trends" },
      { id: "bonding", name: "Chemical Bonding", description: "Ionic, covalent and metallic bonding and structures" },
      { id: "reactions", name: "Acids, Bases & Salts", description: "pH, neutralisation, salt preparation and titration" },
      { id: "organic", name: "Organic Chemistry", description: "Alkanes, alkenes, alcohols, carboxylic acids and reactions" },
      { id: "electro", name: "Electrochemistry", description: "Redox reactions, electrolysis and the reactivity series" },
    ],
  },
  {
    id: "physics", name: "Physics", icon: "⚡", color: "from-amber-400 to-yellow-500",
    topics: [
      { id: "kinematics", name: "Kinematics & Dynamics", description: "Speed, velocity, acceleration, Newton's laws and momentum" },
      { id: "waves", name: "Waves & Optics", description: "Wave properties, light, reflection, refraction and lenses" },
      { id: "thermal", name: "Thermal Physics", description: "Temperature, heat transfer, specific heat and gas laws" },
      { id: "electricity", name: "Electricity & Magnetism", description: "Circuits, Ohm's law, magnetism and electromagnetic induction" },
      { id: "modern", name: "Modern Physics", description: "Radioactivity, nuclear reactions and atomic physics" },
    ],
  },
  {
    id: "history", name: "History", icon: "🏛️", color: "from-stone-400 to-amber-600",
    topics: [
      { id: "ww2", name: "World War II", description: "Causes, key events, turning points and consequences of WWII" },
      { id: "cold-war", name: "The Cold War", description: "Superpower rivalry, proxy wars and the fall of the USSR" },
      { id: "decolonisation", name: "Decolonisation in Asia", description: "Independence movements across Southeast Asia" },
      { id: "sg-history", name: "Singapore's History", description: "Singapore's journey from colony to independent nation" },
      { id: "un", name: "The United Nations", description: "Formation, structure, aims and effectiveness of the UN" },
    ],
  },
  {
    id: "geography", name: "Geography", icon: "🌍", color: "from-cyan-400 to-sky-500",
    topics: [
      { id: "landscapes", name: "Physical Landscapes", description: "Rivers, coasts, weathering and geomorphic processes" },
      { id: "climate", name: "Climate & Weather", description: "Climate systems, weather phenomena and climate change" },
      { id: "population", name: "Population & Settlement", description: "Population growth, migration and urbanisation" },
      { id: "economic", name: "Economic Development", description: "Industries, globalisation and development indicators" },
      { id: "sustainability", name: "Environmental Sustainability", description: "Ecosystems, resource management and sustainability" },
    ],
  },
  {
    id: "economics", name: "Economics", icon: "📈", color: "from-lime-400 to-green-500",
    topics: [
      { id: "demand-supply", name: "Demand & Supply", description: "Market forces, price determination and elasticity" },
      { id: "markets", name: "Market Structures", description: "Perfect competition, monopoly, oligopoly and market failure" },
      { id: "national-income", name: "National Income", description: "GDP, economic growth, unemployment and inflation" },
      { id: "trade", name: "International Trade", description: "Comparative advantage, trade barriers and balance of payments" },
      { id: "policy", name: "Economic Policies", description: "Fiscal, monetary and supply-side policies" },
    ],
  },
  {
    id: "literature", name: "Literature in English", icon: "📖", color: "from-pink-400 to-rose-500",
    topics: [
      { id: "poetry", name: "Poetry Analysis", description: "Poetic forms, devices, imagery and thematic analysis" },
      { id: "prose", name: "Prose & Fiction", description: "Character, plot, theme and narrative techniques in novels" },
      { id: "drama", name: "Drama & Theatre", description: "Dramatic conventions, stage directions and performance" },
      { id: "techniques", name: "Literary Techniques", description: "Figurative language, tone, mood and authorial intent" },
      { id: "unseen", name: "Unseen Text Analysis", description: "Close reading and response to unfamiliar literary texts" },
    ],
  },
];

const CURRICULUM: Record<LevelGroup, QuizSubject[]> = {
  junior_primary: PRIMARY_SUBJECTS,
  senior_primary: PRIMARY_SUBJECTS,
  junior_secondary: SECONDARY_SUBJECTS,
  senior_secondary: SECONDARY_SUBJECTS,
  university: [
    {
      id: "calculus", name: "Calculus & Analysis", icon: "∫", color: "from-indigo-400 to-violet-500",
      topics: [
        { id: "limits", name: "Limits & Continuity", description: "Limits, continuity, L'Hôpital's rule and epsilon-delta definitions" },
        { id: "differentiation", name: "Differentiation", description: "Derivatives, chain rule, implicit differentiation and applications" },
        { id: "integration", name: "Integration Techniques", description: "Integration by parts, substitution, partial fractions and applications" },
        { id: "multivar", name: "Multivariable Calculus", description: "Partial derivatives, gradients, double integrals and vector fields" },
        { id: "series", name: "Series & Sequences", description: "Convergence tests, power series, Taylor and Maclaurin series" },
      ],
    },
    {
      id: "statistics", name: "Statistics & Probability", icon: "📊", color: "from-sky-400 to-blue-500",
      topics: [
        { id: "probability", name: "Probability Theory", description: "Axioms, conditional probability, Bayes' theorem and independence" },
        { id: "distributions", name: "Probability Distributions", description: "Binomial, Poisson, normal, exponential and other distributions" },
        { id: "inference", name: "Statistical Inference", description: "Hypothesis testing, confidence intervals and p-values" },
        { id: "regression", name: "Regression & Correlation", description: "Linear regression, correlation, ANOVA and model evaluation" },
        { id: "bayesian", name: "Bayesian Statistics", description: "Prior and posterior distributions, Bayesian inference and MCMC" },
      ],
    },
    {
      id: "cs", name: "Computer Science", icon: "💻", color: "from-slate-400 to-gray-600",
      topics: [
        { id: "data-structures", name: "Data Structures", description: "Arrays, linked lists, trees, graphs, heaps and hash tables" },
        { id: "algorithms", name: "Algorithms & Complexity", description: "Sorting, searching, Big-O notation and algorithm design strategies" },
        { id: "oop", name: "Object-Oriented Programming", description: "Classes, inheritance, polymorphism, encapsulation and design patterns" },
        { id: "databases", name: "Databases & SQL", description: "Relational databases, SQL, normalisation and transactions" },
        { id: "os", name: "Operating Systems", description: "Processes, threads, memory management, scheduling and file systems" },
      ],
    },
    {
      id: "economics", name: "Economics", icon: "📈", color: "from-lime-400 to-green-500",
      topics: [
        { id: "micro", name: "Microeconomics", description: "Consumer theory, production, market structures and welfare" },
        { id: "macro", name: "Macroeconomics", description: "GDP, inflation, unemployment, fiscal and monetary policy" },
        { id: "intl", name: "International Economics", description: "Trade theory, exchange rates, balance of payments and globalisation" },
        { id: "game-theory", name: "Game Theory", description: "Nash equilibrium, dominant strategies and strategic interaction" },
        { id: "development", name: "Development Economics", description: "Poverty, inequality, growth models and development strategies" },
      ],
    },
    {
      id: "psychology", name: "Psychology", icon: "🧠", color: "from-fuchsia-400 to-pink-500",
      topics: [
        { id: "cognitive", name: "Cognitive Psychology", description: "Memory, attention, perception, decision-making and problem solving" },
        { id: "social", name: "Social Psychology", description: "Conformity, attitudes, prejudice, persuasion and group dynamics" },
        { id: "developmental", name: "Developmental Psychology", description: "Lifespan development, attachment, Piaget and Erikson's theories" },
        { id: "abnormal", name: "Abnormal Psychology", description: "Mental disorders, diagnosis (DSM), aetiology and treatment" },
        { id: "research", name: "Research Methods", description: "Experimental design, validity, reliability and statistical analysis" },
      ],
    },
    {
      id: "philosophy", name: "Philosophy", icon: "🤔", color: "from-stone-400 to-amber-600",
      topics: [
        { id: "ethics", name: "Ethics & Moral Philosophy", description: "Consequentialism, deontology, virtue ethics and applied ethics" },
        { id: "epistemology", name: "Epistemology", description: "Knowledge, belief, justification, scepticism and truth theories" },
        { id: "logic", name: "Logic & Critical Thinking", description: "Formal logic, argument analysis, fallacies and informal reasoning" },
        { id: "metaphysics", name: "Metaphysics", description: "Reality, existence, identity, causation and philosophy of mind" },
        { id: "phil-science", name: "Philosophy of Science", description: "Scientific method, falsificationism, paradigms and realism" },
      ],
    },
    {
      id: "biology", name: "Biology", icon: "🧬", color: "from-green-400 to-emerald-500",
      topics: [
        { id: "molecular", name: "Molecular Biology", description: "DNA replication, transcription, translation and gene expression" },
        { id: "cell-sig", name: "Cell Signaling", description: "Signal transduction pathways, receptors and second messengers" },
        { id: "genomics", name: "Genetics & Genomics", description: "Mendelian genetics, linkage, epigenetics and CRISPR" },
        { id: "ecology-u", name: "Ecology & Conservation", description: "Population dynamics, community ecology and conservation biology" },
        { id: "neuro", name: "Neurobiology", description: "Neural communication, brain structure, synaptic plasticity and behaviour" },
      ],
    },
    {
      id: "chemistry", name: "Chemistry", icon: "⚗️", color: "from-teal-400 to-cyan-500",
      topics: [
        { id: "organic", name: "Organic Reaction Mechanisms", description: "Nucleophilic substitution, addition, elimination and aromatic chemistry" },
        { id: "quantum", name: "Quantum Chemistry", description: "Wave functions, molecular orbital theory and spectroscopy" },
        { id: "analytical", name: "Analytical Chemistry", description: "Chromatography, spectroscopy, titrations and error analysis" },
        { id: "biochemistry", name: "Biochemistry", description: "Enzymes, metabolism, bioenergetics and biomolecules" },
        { id: "materials", name: "Materials Science", description: "Crystal structures, polymers, semiconductors and nanomaterials" },
      ],
    },
    {
      id: "physics", name: "Physics", icon: "⚡", color: "from-amber-400 to-yellow-500",
      topics: [
        { id: "mechanics", name: "Classical Mechanics", description: "Lagrangian, Hamiltonian mechanics, oscillations and chaos" },
        { id: "electro", name: "Electrodynamics", description: "Maxwell's equations, electromagnetic waves and radiation" },
        { id: "quantum", name: "Quantum Mechanics", description: "Schrödinger equation, operators, uncertainty and quantum states" },
        { id: "stat-mech", name: "Statistical Mechanics", description: "Entropy, partition functions, thermodynamic ensembles" },
        { id: "relativity", name: "Special & General Relativity", description: "Lorentz transformations, spacetime and general relativity" },
      ],
    },
    {
      id: "engineering", name: "Engineering", icon: "⚙️", color: "from-gray-400 to-zinc-500",
      topics: [
        { id: "statics", name: "Statics & Dynamics", description: "Free body diagrams, equilibrium, kinematics and kinetics" },
        { id: "fluid", name: "Fluid Mechanics", description: "Bernoulli's equation, viscosity, turbulence and pipe flow" },
        { id: "thermo", name: "Thermodynamics", description: "Laws of thermodynamics, cycles, entropy and energy systems" },
        { id: "circuits", name: "Circuit Analysis", description: "Kirchhoff's laws, AC/DC circuits, filters and power systems" },
        { id: "signals", name: "Signals & Systems", description: "Fourier transforms, Laplace transforms and system analysis" },
      ],
    },
    {
      id: "business", name: "Business Studies", icon: "💼", color: "from-rose-400 to-orange-500",
      topics: [
        { id: "accounting", name: "Financial Accounting", description: "Financial statements, ratio analysis, IFRS and auditing" },
        { id: "marketing", name: "Marketing Strategy", description: "Market segmentation, the 4Ps, branding and digital marketing" },
        { id: "strategy", name: "Strategic Management", description: "Porter's frameworks, competitive advantage and strategy formulation" },
        { id: "operations", name: "Operations Management", description: "Supply chains, lean production, quality management and scheduling" },
        { id: "ethics-biz", name: "Business Ethics & CSR", description: "Corporate governance, stakeholder theory and ethical decision-making" },
      ],
    },
  ],
};

export function getSubjectsForGroup(group: LevelGroup): QuizSubject[] {
  return CURRICULUM[group];
}

export function getSubjectById(group: LevelGroup, subjectId: string): QuizSubject | undefined {
  return CURRICULUM[group].find(s => s.id === subjectId);
}

export const DIFFICULTY_LABELS = [
  { value: "easy",     label: "Easy",   emoji: "🌟", desc: "Basic recall and simple understanding" },
  { value: "normal",   label: "Normal", emoji: "⭐⭐", desc: "Understanding and application" },
  { value: "difficult",label: "Hard",   emoji: "🔥", desc: "Analysis, synthesis and evaluation" },
] as const;

export type Difficulty = "easy" | "normal" | "difficult";

export const LEVEL_GROUP_SECTIONS = [
  {
    label: "Primary School",
    groups: ["junior_primary", "senior_primary"] as LevelGroup[],
  },
  {
    label: "Secondary School",
    groups: ["junior_secondary", "senior_secondary"] as LevelGroup[],
  },
  {
    label: "University",
    groups: ["university"] as LevelGroup[],
  },
] as const;
