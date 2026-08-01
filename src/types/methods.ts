// Tipos compartilhados entre o servidor (queries) e os componentes do módulo
// Métodos & Execução (specs/metodos-execucao).

export interface SimpleOption {
  id: string;
  name: string;
}

export interface MethodSummary {
  id: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  category: string | null;
  status: string;
  version: string;
  authorId: string | null;
  authorName: string | null;
  updatedAt: string;
  createdAt: string;
  productNames: string[];
  playbookCount: number;
}

export interface MethodStageRow {
  id: string;
  name: string;
  sortOrder: number;
  objective: string | null;
  description: string | null;
  expectedResult: string | null;
  successCriteria: string | null;
}

export interface VersionLogRow {
  id: string;
  versionLabel: string;
  status: string;
  changeNote: string | null;
  authorId: string | null;
  createdAt: string;
}

export interface PlaybookLinkRow {
  id: string;
  slug: string;
  name: string;
  status: string;
  type: string;
}

export interface MethodDetail {
  id: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  fullDescription: string | null;
  category: string | null;
  problemSolved: string | null;
  idealClientProfile: string | null;
  expectedResult: string | null;
  principles: string[];
  premises: string[];
  successIndicators: string[];
  risks: string[];
  status: string;
  version: string;
  authorId: string | null;
  authorName: string | null;
  publishedAt: string | null;
  updatedAt: string;
  createdAt: string;
}

export interface PlaybookSummary {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  type: string;
  status: string;
  version: string;
  defaultDurationDays: number | null;
  methodId: string;
  methodName: string;
  productId: string;
  productName: string;
  authorId: string | null;
  authorName: string | null;
  updatedAt: string;
  createdAt: string;
}

export interface PlaybookDetail {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  objective: string | null;
  methodId: string;
  productId: string;
  type: string;
  defaultDurationDays: number | null;
  prerequisites: string[];
  expectedResult: string | null;
  defaultResponsibles: string[];
  requiredDocuments: string[];
  deliverables: string[];
  successCriteria: string[];
  status: string;
  version: string;
  authorId: string | null;
  authorName: string | null;
  publishedAt: string | null;
  updatedAt: string;
  createdAt: string;
}

export interface ResourceRow {
  id: string;
  title: string;
  type: string;
  url: string | null;
  description: string | null;
  methodId: string | null;
  playbookId: string | null;
  updatedAt: string;
}
