export interface Member {
  id: number;
  name: string;
  classId: string;
  group: 1 | 2;
}

export type ClassCategory = 'martial_arts' | 'fantasy';

export interface ClassOption {
  id: string;
  name: string;
  category: ClassCategory;
  iconName: string;
  color: string;
  hex: string;
  description: string;
}

export interface RaidSettings {
  title: string;
  dateTime: string;
  bannerUrl: string | null;
  description: string;
}
