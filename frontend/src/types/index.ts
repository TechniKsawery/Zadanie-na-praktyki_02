// ==============================================================================
// FRONTEND TYPES & INTERFACES
// ==============================================================================
// Ten plik definiuje interfejsy TypeScript odpowiadające modelom danych
// przesyłanym z backendu. Zapewnia to pełne bezpieczeństwo typów w aplikacji React.

export enum Role {
  ADMIN = 'ADMIN',
  EDITOR = 'EDITOR',
  AUTHOR = 'AUTHOR',
  REVIEWER = 'REVIEWER'
}

export enum ArticleStatus {
  IDEA = 'IDEA',
  DRAFT = 'DRAFT',
  REVIEW = 'REVIEW',
  APPROVED = 'APPROVED',
  SCHEDULED = 'SCHEDULED',
  PUBLISHED = 'PUBLISHED',
  REJECTED = 'REJECTED'
}

export interface User {
  id: number;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
  _count?: {
    authoredArticles: number;
    reviewedArticles: number;
  };
}

export interface Article {
  id: number;
  title: string;
  lead: string;
  content: string;
  status: ArticleStatus;
  authorId: number;
  reviewerId: number | null;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author: {
    id: number;
    name: string;
    email: string;
    role: Role;
  };
  reviewer: {
    id: number;
    name: string;
    email: string;
    role: Role;
  } | null;
  comments?: ArticleComment[];
  history?: ArticleHistory[];
  uploads?: Upload[];
  _count?: {
    comments: number;
  };
}

export interface ArticleComment {
  id: number;
  articleId: number;
  userId: number;
  content: string;
  createdAt: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: Role;
  };
}

export interface ArticleHistory {
  id: number;
  articleId: number;
  userId: number;
  oldStatus: ArticleStatus | null;
  newStatus: ArticleStatus;
  changedAt: string;
  comment: string | null;
  user: {
    id: number;
    name: string;
    email: string;
    role: Role;
  };
}

export interface Notification {
  id: number;
  userId: number;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface Upload {
  id: number;
  articleId: number;
  filename: string;
  filepath: string;
  mimetype: string;
  size: number;
  uploadedAt: string;
}

export interface ActivityLog {
  id: number;
  userId: number | null;
  action: string;
  details: string | null;
  createdAt: string;
  user?: {
    id: number;
    name: string;
    email: string;
    role: Role;
  } | null;
}

export interface DashboardStats {
  counters: {
    users: number;
    articles: number;
    comments: number;
    uploads: number;
  };
  usersByRole: { role: Role; _count: { _all: number } }[];
  articlesByStatus: { status: ArticleStatus; _count: { _all: number } }[];
  topAuthors: (User & { _count: { authoredArticles: number } })[];
  recentLogs: ActivityLog[];
}
