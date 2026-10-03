import * as ENUMS from "./enums";

interface productCategory {
  id?: number; //NOTE - PK
  name: string;
  parent: number;
  recursive: ENUMS.categoryRecursivity;
}

interface serviceCategory {
  id?: number; //NOTE - PK
  name: string;
  parent: number;
  recursive: ENUMS.categoryRecursivity;
  hasSchedule: ENUMS.scheduleStatus;
}

interface breed {
  id?: number; //NOTE - PK
  name: string;
  variation: string;
  species: number; //NOTE - FK @specie id
}

interface city {
  id?: number; //NOTE - PK
  name: string;
  state: number; //NOTE - FK @state id
  ibgeCode: number;
}

interface country {
  id?: number; //NOTE - PK
  name: string;
  namePTBR: string;
  abbreviation: string;
  bacenCode: number;
}

interface customer {
  id?: number; //NOTE - PK
  name: string;
  cnpj: string;
  email: string;
  phone: string;
  address: string;
  city: number; //NOTE - FK @city id
  cep: string;
  contactUser: number; //NOTE - @user id
  discount: number;
  fiscalName: string;
  stateSubscription: string;
  enterpriseSize: number; //NOTE - FK @enterpriseSize id
  enterpriseType: number; //NOTE - FK @enterpriseType id
  enterpriseFiscalFrame: number; //NOTE - FK @enterpriseFiscalFrame id
}

interface enterpriseSize {
  id?: number; //NOTE - PK
  abbreviation: string;
  description: string;
}

interface enterpriseType {
  id?: number; //NOTE - PK
  abbreviation: string;
  description: string;
  validSizes: string;
}

interface fiscalCNAEFrame {
  id?: number; //NOTE - PK
  section: string;
  division: string;
  group: string;
  class: string;
  subclass: string;
  description: string;
}

interface fiscalIPIFrame {
  id?: number; //NOTE - PK
  code: number;
  group: string;
  description: string;
}

interface fiscalISSFrame {
  id?: number; //NOTE - PK
  code: number;
  description: string;
}

interface installment {
  id?: number; //NOTE - PK
  customer: number; //NOTE - FK @customer id
  installmentCode: string;
  dueDate: string;
  value: number;
  status: ENUMS.installmentStatus;
}

//NOTE - The log in DB will be phased out in favor of file logging
interface log {
  id?: number; //NOTE - PK
  user: number; //NOTE - FK @user id
  route: string;
  postData: string;
  sqlOperations: string;
  timestampStart: string;
  timestampEnd: string;
}

interface species {
  id?: number; //NOTE - PK
  name: string;
  variation: string;
  scientific: string;
}

interface state {
  id?: number; //NOTE - PK
  name: string;
  abbreviation: string;
  ibgeCode: number;
  country: number; //NOTE - FK @country id
  callCodes: string;
}

interface unit {
  id?: number; //NOTE - PK
  abbreviation: string;
  description: string;
}

interface user {
  id?: number; //NOTE - PK
  name: string;
  cpf: string;
  email: string;
  phone: string;
  login: string;
  passwordSHA256: string;
  role: number;
  customer: number; //NOTE - FK @customer id
}

interface enterpriseFiscalFrame {
  id?: number; //NOTE - PK
  description: string;
  abbreviation: string;
}

interface animal {
  id?: number; //NOTE - PK
  primaryTutor: number; //NOTE - FK @tutor id
  name: string;
  species: number; //NOTE - FK @species id
  speciesText: string;
  breed: number; //NOTE - FK @breed id
  breedText: string;
  color: string;
  description: string;
  humanFamily: string;
  petFamily: string;
  picture: string;
  customer: number; //NOTE - FK @customer id
  birthDate: string;
}

interface product {
  id?: number; //NOTE - PK
  barcodeGTIN: string;
  name: string;
  description: string;
  unit: number; //NOTE - FK @unit id
  acquisitionCost: number;
  salePrice: number;
  stock: number;
  minimumStock: number;
  profitMargin: number;
  icms: number;
  category: number; //NOTE - FK @productCategory id
  customer: number; //NOTE - FK @customer id
}

interface service {
  id?: number; //NOTE - PK
  name: string;
  description: string;
  expectedTime: number;
  basicCost: number;
  basicFee: number;
  profitMargin: number;
  iss: number;
  icms: number;
  category: number; //NOTE - FK @serviceCategory id
  customer: number; //NOTE - FK @customer id
  fiscalISSFrame: number; //NOTE - @fiscalISSFrame id
  fiscalCNAEFrame: number; //NOTE - @fiscalCNAEFrame id
}

interface tutor {
  id?: number; //NOTE - PK
  name: string;
  cpf: string;
  identity: string;
  email: string;
  phone: string;
  phone2: string;
  address: string;
  postalCode: string;
  city: number; //NOTE - FK @city id
  customer: number; //NOTE - FK @customer id
}

 

interface workerType {
  id?: number; //NOTE - PK
  name: string;
  description: string;
}

interface userRole  {
  id: number;  //NOTE - PK
  name: string;
  description: string;
}


export type {
  animal,
  breed,
  city,
  country,
  customer,
  enterpriseFiscalFrame,
  enterpriseSize,
  enterpriseType,
  fiscalCNAEFrame,
  fiscalIPIFrame,
  fiscalISSFrame,
  installment,
  log,
  product,
  productCategory,
  service,
  serviceCategory,
  species,
  state,
  tutor,
  unit,
  user,
  userRole,
  workerType,
};
