export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  version: number;
}

export type NewCategory = Omit<Category, "id" | "createdAt" | "updatedAt" | "version">;
