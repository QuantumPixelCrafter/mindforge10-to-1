export type GradeGroup = "preschool" | "primary" | "secondary" | "university";

export type Grade = {
  code: string;
  name: string;
  group: GradeGroup;
};

export type CountryDef = {
  code: string;
  name: string;
  flag: string;
  schoolYearStartMonth: number;
  grades: Grade[];
};

function preschool(codes: string[], names: string[]): Grade[] {
  return codes.map((code, i) => ({ code, name: names[i], group: "preschool" as GradeGroup }));
}
function primary(codes: string[], names: string[]): Grade[] {
  return codes.map((code, i) => ({ code, name: names[i], group: "primary" as GradeGroup }));
}
function secondary(codes: string[], names: string[]): Grade[] {
  return codes.map((code, i) => ({ code, name: names[i], group: "secondary" as GradeGroup }));
}
function university(codes: string[], names: string[]): Grade[] {
  return codes.map((code, i) => ({ code, name: names[i], group: "university" as GradeGroup }));
}

const HK_GRADES: Grade[] = [
  ...preschool(["K1","K2","K3"], ["Kindergarten 1 (K1)","Kindergarten 2 (K2)","Kindergarten 3 (K3)"]),
  ...primary(["P1","P2","P3","P4","P5","P6"], ["Primary 1 (P1)","Primary 2 (P2)","Primary 3 (P3)","Primary 4 (P4)","Primary 5 (P5)","Primary 6 (P6)"]),
  ...secondary(["S1","S2","S3","S4","S5","S6"], ["Secondary 1 (S1)","Secondary 2 (S2)","Secondary 3 (S3)","Secondary 4 (S4)","Secondary 5 (S5)","Secondary 6 (S6)"]),
  ...university(["U1","U2","U3","U4"], ["University Year 1","University Year 2","University Year 3","University Year 4"]),
];

const US_GRADES: Grade[] = [
  ...preschool(["PreK"], ["Pre-Kindergarten"]),
  ...primary(["K","G1","G2","G3","G4","G5","G6"], ["Kindergarten","Grade 1","Grade 2","Grade 3","Grade 4","Grade 5","Grade 6"]),
  ...secondary(["G7","G8","G9","G10","G11","G12"], ["Grade 7","Grade 8","Grade 9","Grade 10","Grade 11","Grade 12"]),
  ...university(["C1","C2","C3","C4"], ["College Year 1 (Freshman)","College Year 2 (Sophomore)","College Year 3 (Junior)","College Year 4 (Senior)"]),
];

const UK_GRADES: Grade[] = [
  ...preschool(["Nursery","Reception"], ["Nursery","Reception"]),
  ...primary(["Y1","Y2","Y3","Y4","Y5","Y6"], ["Year 1","Year 2","Year 3","Year 4","Year 5","Year 6"]),
  ...secondary(["Y7","Y8","Y9","Y10","Y11","Y12","Y13"], ["Year 7","Year 8","Year 9","Year 10","Year 11","Year 12","Year 13"]),
  ...university(["U1","U2","U3","U4"], ["University Year 1","University Year 2","University Year 3","University Year 4"]),
];

const AU_GRADES: Grade[] = [
  ...preschool(["Kindy"], ["Kindergarten / Prep / Foundation"]),
  ...primary(["Y1","Y2","Y3","Y4","Y5","Y6"], ["Year 1","Year 2","Year 3","Year 4","Year 5","Year 6"]),
  ...secondary(["Y7","Y8","Y9","Y10","Y11","Y12"], ["Year 7","Year 8","Year 9","Year 10","Year 11","Year 12"]),
  ...university(["U1","U2","U3","U4"], ["University Year 1","University Year 2","University Year 3","University Year 4"]),
];

const CA_GRADES: Grade[] = [
  ...preschool(["JK","SK"], ["Junior Kindergarten (JK)","Senior Kindergarten (SK)"]),
  ...primary(["G1","G2","G3","G4","G5","G6"], ["Grade 1","Grade 2","Grade 3","Grade 4","Grade 5","Grade 6"]),
  ...secondary(["G7","G8","G9","G10","G11","G12"], ["Grade 7","Grade 8","Grade 9","Grade 10","Grade 11","Grade 12"]),
  ...university(["U1","U2","U3","U4"], ["University Year 1","University Year 2","University Year 3","University Year 4"]),
];

const SG_GRADES: Grade[] = [
  ...preschool(["N1","N2","K1","K2"], ["Nursery 1","Nursery 2","Kindergarten 1 (K1)","Kindergarten 2 (K2)"]),
  ...primary(["P1","P2","P3","P4","P5","P6"], ["Primary 1","Primary 2","Primary 3","Primary 4","Primary 5","Primary 6"]),
  ...secondary(["S1","S2","S3","S4","S5","JC1","JC2"], ["Secondary 1","Secondary 2","Secondary 3","Secondary 4","Secondary 5","Junior College Year 1 (JC1)","Junior College Year 2 (JC2)"]),
  ...university(["U1","U2","U3","U4"], ["University Year 1","University Year 2","University Year 3","University Year 4"]),
];

const JP_GRADES: Grade[] = [
  ...preschool(["Y1","Y2","Y3"], ["Kindergarten Year 1 (年少)","Kindergarten Year 2 (年中)","Kindergarten Year 3 (年長)"]),
  ...primary(["E1","E2","E3","E4","E5","E6"], ["Elementary Year 1 (小1)","Elementary Year 2 (小2)","Elementary Year 3 (小3)","Elementary Year 4 (小4)","Elementary Year 5 (小5)","Elementary Year 6 (小6)"]),
  ...secondary(["M1","M2","M3","H1","H2","H3"], ["Middle School Year 1 (中1)","Middle School Year 2 (中2)","Middle School Year 3 (中3)","High School Year 1 (高1)","High School Year 2 (高2)","High School Year 3 (高3)"]),
  ...university(["U1","U2","U3","U4"], ["University Year 1","University Year 2","University Year 3","University Year 4"]),
];

const KR_GRADES: Grade[] = [
  ...preschool(["K1","K2","K3"], ["Kindergarten Year 1","Kindergarten Year 2","Kindergarten Year 3"]),
  ...primary(["E1","E2","E3","E4","E5","E6"], ["Elementary Grade 1","Elementary Grade 2","Elementary Grade 3","Elementary Grade 4","Elementary Grade 5","Elementary Grade 6"]),
  ...secondary(["M1","M2","M3","H1","H2","H3"], ["Middle School Grade 1","Middle School Grade 2","Middle School Grade 3","High School Grade 1","High School Grade 2","High School Grade 3"]),
  ...university(["U1","U2","U3","U4"], ["University Year 1","University Year 2","University Year 3","University Year 4"]),
];

const CN_GRADES: Grade[] = [
  ...preschool(["PK1","PK2","PK3"], ["Pre-K Year 1 (小班)","Pre-K Year 2 (中班)","Pre-K Year 3 (大班)"]),
  ...primary(["P1","P2","P3","P4","P5","P6"], ["Primary Year 1 (小学1年)","Primary Year 2 (小学2年)","Primary Year 3 (小学3年)","Primary Year 4 (小学4年)","Primary Year 5 (小学5年)","Primary Year 6 (小学6年)"]),
  ...secondary(["J1","J2","J3","S1","S2","S3"], ["Junior Secondary Year 1 (初1)","Junior Secondary Year 2 (初2)","Junior Secondary Year 3 (初3)","Senior Secondary Year 1 (高1)","Senior Secondary Year 2 (高2)","Senior Secondary Year 3 (高3)"]),
  ...university(["U1","U2","U3","U4"], ["University Year 1","University Year 2","University Year 3","University Year 4"]),
];

const MO_GRADES: Grade[] = [
  ...preschool(["K1","K2","K3"], ["Kindergarten 1 (K1)","Kindergarten 2 (K2)","Kindergarten 3 (K3)"]),
  ...primary(["P1","P2","P3","P4","P5","P6"], ["Primary 1 (P1)","Primary 2 (P2)","Primary 3 (P3)","Primary 4 (P4)","Primary 5 (P5)","Primary 6 (P6)"]),
  ...secondary(["S1","S2","S3","S4","S5","S6","S7"], ["Secondary 1","Secondary 2","Secondary 3","Secondary 4","Secondary 5","Secondary 6","Secondary 7"]),
  ...university(["U1","U2","U3","U4"], ["University Year 1","University Year 2","University Year 3","University Year 4"]),
];

const TW_GRADES: Grade[] = [
  ...preschool(["K1","K2"], ["Kindergarten Year 1 (幼小)","Kindergarten Year 2 (幼大)"]),
  ...primary(["P1","P2","P3","P4","P5","P6"], ["Primary Year 1","Primary Year 2","Primary Year 3","Primary Year 4","Primary Year 5","Primary Year 6"]),
  ...secondary(["J1","J2","J3","H1","H2","H3"], ["Junior High Year 1","Junior High Year 2","Junior High Year 3","Senior High Year 1","Senior High Year 2","Senior High Year 3"]),
  ...university(["U1","U2","U3","U4"], ["University Year 1","University Year 2","University Year 3","University Year 4"]),
];

const MY_GRADES: Grade[] = [
  ...preschool(["PreK1","PreK2"], ["Preschool Year 1","Preschool Year 2"]),
  ...primary(["P1","P2","P3","P4","P5","P6"], ["Primary 1","Primary 2","Primary 3","Primary 4","Primary 5","Primary 6"]),
  ...secondary(["F1","F2","F3","F4","F5","F6L","F6U"], ["Form 1","Form 2","Form 3","Form 4","Form 5","Form 6 Lower","Form 6 Upper"]),
  ...university(["U1","U2","U3","U4"], ["University Year 1","University Year 2","University Year 3","University Year 4"]),
];

const PH_GRADES: Grade[] = [
  ...preschool(["Kinder"], ["Kindergarten"]),
  ...primary(["G1","G2","G3","G4","G5","G6"], ["Grade 1","Grade 2","Grade 3","Grade 4","Grade 5","Grade 6"]),
  ...secondary(["G7","G8","G9","G10","G11","G12"], ["Grade 7 (Junior HS)","Grade 8 (Junior HS)","Grade 9 (Junior HS)","Grade 10 (Junior HS)","Grade 11 (Senior HS)","Grade 12 (Senior HS)"]),
  ...university(["C1","C2","C3","C4"], ["College Year 1","College Year 2","College Year 3","College Year 4"]),
];

const IN_GRADES: Grade[] = [
  ...preschool(["Nursery","LKG","UKG"], ["Nursery","LKG (Lower Kindergarten)","UKG (Upper Kindergarten)"]),
  ...primary(["C1","C2","C3","C4","C5"], ["Class 1","Class 2","Class 3","Class 4","Class 5"]),
  ...secondary(["C6","C7","C8","C9","C10","C11","C12"], ["Class 6","Class 7","Class 8","Class 9","Class 10","Class 11","Class 12"]),
  ...university(["U1","U2","U3","U4"], ["University Year 1","University Year 2","University Year 3","University Year 4"]),
];

const IE_GRADES: Grade[] = [
  ...preschool(["JI","SI"], ["Junior Infants","Senior Infants"]),
  ...primary(["1C","2C","3C","4C","5C","6C"], ["1st Class","2nd Class","3rd Class","4th Class","5th Class","6th Class"]),
  ...secondary(["1Y","2Y","3Y","TY","5Y","6Y"], ["1st Year","2nd Year","3rd Year","Transition Year","5th Year","6th Year"]),
  ...university(["U1","U2","U3","U4"], ["University Year 1","University Year 2","University Year 3","University Year 4"]),
];

const NZ_GRADES: Grade[] = [
  ...primary(["Y1","Y2","Y3","Y4","Y5","Y6","Y7","Y8"], ["Year 1","Year 2","Year 3","Year 4","Year 5","Year 6","Year 7","Year 8"]),
  ...secondary(["Y9","Y10","Y11","Y12","Y13"], ["Year 9","Year 10","Year 11","Year 12","Year 13"]),
  ...university(["U1","U2","U3","U4"], ["University Year 1","University Year 2","University Year 3","University Year 4"]),
];

const DE_GRADES: Grade[] = [
  ...preschool(["VK"], ["Vorschule (Pre-school)"]),
  ...primary(["K1","K2","K3","K4"], ["Klasse 1","Klasse 2","Klasse 3","Klasse 4"]),
  ...secondary(["K5","K6","K7","K8","K9","K10","K11","K12","K13"], ["Klasse 5","Klasse 6","Klasse 7","Klasse 8","Klasse 9","Klasse 10","Klasse 11 (Gymnasiale Oberstufe)","Klasse 12","Klasse 13"]),
  ...university(["U1","U2","U3","U4","U5","U6"], ["University Semester 1","University Semester 2","University Semester 3","University Semester 4","University Semester 5","University Semester 6"]),
];

const FR_GRADES: Grade[] = [
  ...preschool(["PS","MS","GS"], ["Petite Section (PS)","Moyenne Section (MS)","Grande Section (GS)"]),
  ...primary(["CP","CE1","CE2","CM1","CM2"], ["CP","CE1","CE2","CM1","CM2"]),
  ...secondary(["6e","5e","4e","3e","2nde","1ere","Terminale"], ["6ème (Collège)","5ème","4ème","3ème","2nde (Lycée)","1ère","Terminale"]),
  ...university(["L1","L2","L3","M1","M2"], ["Licence 1","Licence 2","Licence 3","Master 1","Master 2"]),
];

const ES_GRADES: Grade[] = [
  ...preschool(["EI1","EI2","EI3"], ["Educación Infantil 1","Educación Infantil 2","Educación Infantil 3"]),
  ...primary(["EP1","EP2","EP3","EP4","EP5","EP6"], ["Primaria 1","Primaria 2","Primaria 3","Primaria 4","Primaria 5","Primaria 6"]),
  ...secondary(["ESO1","ESO2","ESO3","ESO4","Bach1","Bach2"], ["ESO 1","ESO 2","ESO 3","ESO 4","Bachillerato 1","Bachillerato 2"]),
  ...university(["U1","U2","U3","U4"], ["Universidad Año 1","Universidad Año 2","Universidad Año 3","Universidad Año 4"]),
];

const IT_GRADES: Grade[] = [
  ...preschool(["SI1","SI2","SI3"], ["Scuola dell'Infanzia 1","Scuola dell'Infanzia 2","Scuola dell'Infanzia 3"]),
  ...primary(["SP1","SP2","SP3","SP4","SP5"], ["Primaria 1","Primaria 2","Primaria 3","Primaria 4","Primaria 5"]),
  ...secondary(["SM1","SM2","SM3","SS1","SS2","SS3","SS4","SS5"], ["Scuola Media 1","Scuola Media 2","Scuola Media 3","Superiore 1","Superiore 2","Superiore 3","Superiore 4","Superiore 5"]),
  ...university(["U1","U2","U3","U4"], ["University Year 1","University Year 2","University Year 3","University Year 4"]),
];

const RU_GRADES: Grade[] = [
  ...primary(["K1","K2","K3","K4"], ["Класс 1","Класс 2","Класс 3","Класс 4"]),
  ...secondary(["K5","K6","K7","K8","K9","K10","K11"], ["Класс 5","Класс 6","Класс 7","Класс 8","Класс 9","Класс 10","Класс 11"]),
  ...university(["U1","U2","U3","U4"], ["University Year 1","University Year 2","University Year 3","University Year 4"]),
];

const BR_GRADES: Grade[] = [
  ...preschool(["EI1","EI2","EI3"], ["Educação Infantil 1","Educação Infantil 2","Educação Infantil 3"]),
  ...primary(["EF1","EF2","EF3","EF4","EF5","EF6","EF7","EF8","EF9"], ["1º Ano (Fundamental)","2º Ano","3º Ano","4º Ano","5º Ano","6º Ano","7º Ano","8º Ano","9º Ano"]),
  ...secondary(["EM1","EM2","EM3"], ["1ª Série (Ensino Médio)","2ª Série","3ª Série"]),
  ...university(["U1","U2","U3","U4"], ["University Year 1","University Year 2","University Year 3","University Year 4"]),
];

const ZA_GRADES: Grade[] = [
  ...preschool(["GR","R"], ["Grade R (Pre-school)","Grade R"]),
  ...primary(["G1","G2","G3","G4","G5","G6","G7"], ["Grade 1","Grade 2","Grade 3","Grade 4","Grade 5","Grade 6","Grade 7"]),
  ...secondary(["G8","G9","G10","G11","G12"], ["Grade 8","Grade 9","Grade 10","Grade 11","Grade 12 (Matric)"]),
  ...university(["U1","U2","U3","U4"], ["University Year 1","University Year 2","University Year 3","University Year 4"]),
];

const ID_GRADES: Grade[] = [
  ...preschool(["TK1","TK2"], ["Taman Kanak-Kanak A","Taman Kanak-Kanak B"]),
  ...primary(["SD1","SD2","SD3","SD4","SD5","SD6"], ["SD Kelas 1","SD Kelas 2","SD Kelas 3","SD Kelas 4","SD Kelas 5","SD Kelas 6"]),
  ...secondary(["SMP1","SMP2","SMP3","SMA1","SMA2","SMA3"], ["SMP Kelas 7","SMP Kelas 8","SMP Kelas 9","SMA Kelas 10","SMA Kelas 11","SMA Kelas 12"]),
  ...university(["U1","U2","U3","U4"], ["University Year 1","University Year 2","University Year 3","University Year 4"]),
];

const SE_GRADES: Grade[] = [
  ...preschool(["FK"], ["Förskoleklass (Pre-school class)"]),
  ...primary(["A1","A2","A3","A4","A5","A6","A7","A8","A9"], ["År 1","År 2","År 3","År 4","År 5","År 6","År 7","År 8","År 9"]),
  ...secondary(["GY1","GY2","GY3"], ["Gymnasiet År 1","Gymnasiet År 2","Gymnasiet År 3"]),
  ...university(["U1","U2","U3","U4"], ["University Year 1","University Year 2","University Year 3","University Year 4"]),
];

const PL_GRADES: Grade[] = [
  ...primary(["K1","K2","K3","K4","K5","K6","K7","K8"], ["Klasa 1","Klasa 2","Klasa 3","Klasa 4","Klasa 5","Klasa 6","Klasa 7","Klasa 8"]),
  ...secondary(["L1","L2","L3","L4"], ["Liceum/Technikum Klasa 1","Liceum/Technikum Klasa 2","Liceum/Technikum Klasa 3","Liceum/Technikum Klasa 4"]),
  ...university(["U1","U2","U3"], ["University Year 1","University Year 2","University Year 3"]),
];

export const COUNTRIES: CountryDef[] = [
  { code: "AR", name: "Argentina", flag: "🇦🇷", schoolYearStartMonth: 3, grades: ES_GRADES },
  { code: "AU", name: "Australia", flag: "🇦🇺", schoolYearStartMonth: 2, grades: AU_GRADES },
  { code: "AT", name: "Austria", flag: "🇦🇹", schoolYearStartMonth: 9, grades: DE_GRADES },
  { code: "BD", name: "Bangladesh", flag: "🇧🇩", schoolYearStartMonth: 1, grades: UK_GRADES },
  { code: "BE", name: "Belgium", flag: "🇧🇪", schoolYearStartMonth: 9, grades: FR_GRADES },
  { code: "BR", name: "Brazil", flag: "🇧🇷", schoolYearStartMonth: 2, grades: BR_GRADES },
  { code: "CA", name: "Canada", flag: "🇨🇦", schoolYearStartMonth: 9, grades: CA_GRADES },
  { code: "CL", name: "Chile", flag: "🇨🇱", schoolYearStartMonth: 3, grades: ES_GRADES },
  { code: "CN", name: "China (Mainland)", flag: "🇨🇳", schoolYearStartMonth: 9, grades: CN_GRADES },
  { code: "CO", name: "Colombia", flag: "🇨🇴", schoolYearStartMonth: 1, grades: ES_GRADES },
  { code: "DK", name: "Denmark", flag: "🇩🇰", schoolYearStartMonth: 8, grades: SE_GRADES },
  { code: "EG", name: "Egypt", flag: "🇪🇬", schoolYearStartMonth: 9, grades: US_GRADES },
  { code: "FI", name: "Finland", flag: "🇫🇮", schoolYearStartMonth: 8, grades: SE_GRADES },
  { code: "FR", name: "France", flag: "🇫🇷", schoolYearStartMonth: 9, grades: FR_GRADES },
  { code: "DE", name: "Germany", flag: "🇩🇪", schoolYearStartMonth: 9, grades: DE_GRADES },
  { code: "GH", name: "Ghana", flag: "🇬🇭", schoolYearStartMonth: 9, grades: UK_GRADES },
  { code: "GR", name: "Greece", flag: "🇬🇷", schoolYearStartMonth: 9, grades: RU_GRADES },
  { code: "HK", name: "Hong Kong SAR", flag: "🇭🇰", schoolYearStartMonth: 9, grades: HK_GRADES },
  { code: "IN", name: "India", flag: "🇮🇳", schoolYearStartMonth: 6, grades: IN_GRADES },
  { code: "ID", name: "Indonesia", flag: "🇮🇩", schoolYearStartMonth: 7, grades: ID_GRADES },
  { code: "IE", name: "Ireland", flag: "🇮🇪", schoolYearStartMonth: 9, grades: IE_GRADES },
  { code: "IT", name: "Italy", flag: "🇮🇹", schoolYearStartMonth: 9, grades: IT_GRADES },
  { code: "JP", name: "Japan", flag: "🇯🇵", schoolYearStartMonth: 4, grades: JP_GRADES },
  { code: "KE", name: "Kenya", flag: "🇰🇪", schoolYearStartMonth: 1, grades: UK_GRADES },
  { code: "MO", name: "Macau SAR", flag: "🇲🇴", schoolYearStartMonth: 9, grades: MO_GRADES },
  { code: "MY", name: "Malaysia", flag: "🇲🇾", schoolYearStartMonth: 1, grades: MY_GRADES },
  { code: "MX", name: "Mexico", flag: "🇲🇽", schoolYearStartMonth: 9, grades: ES_GRADES },
  { code: "NL", name: "Netherlands", flag: "🇳🇱", schoolYearStartMonth: 9, grades: DE_GRADES },
  { code: "NZ", name: "New Zealand", flag: "🇳🇿", schoolYearStartMonth: 2, grades: NZ_GRADES },
  { code: "NG", name: "Nigeria", flag: "🇳🇬", schoolYearStartMonth: 9, grades: UK_GRADES },
  { code: "NO", name: "Norway", flag: "🇳🇴", schoolYearStartMonth: 8, grades: SE_GRADES },
  { code: "PK", name: "Pakistan", flag: "🇵🇰", schoolYearStartMonth: 4, grades: UK_GRADES },
  { code: "PH", name: "Philippines", flag: "🇵🇭", schoolYearStartMonth: 6, grades: PH_GRADES },
  { code: "PL", name: "Poland", flag: "🇵🇱", schoolYearStartMonth: 9, grades: PL_GRADES },
  { code: "PT", name: "Portugal", flag: "🇵🇹", schoolYearStartMonth: 9, grades: ES_GRADES },
  { code: "RU", name: "Russia", flag: "🇷🇺", schoolYearStartMonth: 9, grades: RU_GRADES },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦", schoolYearStartMonth: 9, grades: US_GRADES },
  { code: "SG", name: "Singapore", flag: "🇸🇬", schoolYearStartMonth: 1, grades: SG_GRADES },
  { code: "ZA", name: "South Africa", flag: "🇿🇦", schoolYearStartMonth: 1, grades: ZA_GRADES },
  { code: "KR", name: "South Korea", flag: "🇰🇷", schoolYearStartMonth: 3, grades: KR_GRADES },
  { code: "ES", name: "Spain", flag: "🇪🇸", schoolYearStartMonth: 9, grades: ES_GRADES },
  { code: "LK", name: "Sri Lanka", flag: "🇱🇰", schoolYearStartMonth: 1, grades: UK_GRADES },
  { code: "SE", name: "Sweden", flag: "🇸🇪", schoolYearStartMonth: 8, grades: SE_GRADES },
  { code: "CH", name: "Switzerland", flag: "🇨🇭", schoolYearStartMonth: 9, grades: DE_GRADES },
  { code: "TW", name: "Taiwan", flag: "🇹🇼", schoolYearStartMonth: 9, grades: TW_GRADES },
  { code: "TH", name: "Thailand", flag: "🇹🇭", schoolYearStartMonth: 5, grades: US_GRADES },
  { code: "TR", name: "Turkey", flag: "🇹🇷", schoolYearStartMonth: 9, grades: RU_GRADES },
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪", schoolYearStartMonth: 9, grades: US_GRADES },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", schoolYearStartMonth: 9, grades: UK_GRADES },
  { code: "US", name: "United States", flag: "🇺🇸", schoolYearStartMonth: 9, grades: US_GRADES },
  { code: "VN", name: "Vietnam", flag: "🇻🇳", schoolYearStartMonth: 9, grades: CN_GRADES },
];

export function searchCountries(query: string): CountryDef[] {
  if (!query.trim()) return COUNTRIES;
  const q = query.toLowerCase();
  return COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
  );
}

export function getCountry(code: string): CountryDef | undefined {
  return COUNTRIES.find(c => c.code === code);
}

export function getGradeName(countryCode: string, gradeIndex: number): string {
  const country = getCountry(countryCode);
  if (!country) return "Unknown";
  return country.grades[gradeIndex]?.name ?? "Unknown";
}

export function currentSchoolYear(startMonth: number): number {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return month >= startMonth ? year : year - 1;
}

export const GROUP_LABELS: Record<GradeGroup, string> = {
  preschool: "Pre-school / Kindergarten",
  primary: "Primary / Elementary",
  secondary: "Secondary / High School",
  university: "University / College",
};
