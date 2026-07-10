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
  dateTimeFontSize?: number; // extra rem added to base size for date/time line (default 0)
  descFontSize?: number;     // extra rem added to base size for description line (default 0)
  slotFontSize?: number;     // extra rem added to base size for slot member names (default 0)
}
