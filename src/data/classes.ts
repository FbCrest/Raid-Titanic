import { ClassOption } from '../types';

export const CLASS_OPTIONS: ClassOption[] = [
  {
    id: 'thiet-y',
    name: 'Thiết Y',
    category: 'martial_arts',
    iconName: 'thiet-y.png',
    color: 'red',
    hex: '#fad686',
    description: 'Thiết Y'
  },
  {
    id: 'cuu-linh',
    name: 'Cửu Linh',
    category: 'martial_arts',
    iconName: 'cuu-linh.png',
    color: 'amber',
    hex: '#8464a8',
    description: 'Cửu Linh'
  },
  {
    id: 'to-van',
    name: 'Tố Vấn',
    category: 'martial_arts',
    iconName: 'to-van.png',
    color: 'emerald',
    hex: '#e3aca8',
    description: 'Tố Vấn'
  },
  {
    id: 'toai-mong',
    name: 'Toái Mộng',
    category: 'martial_arts',
    iconName: 'toai-mong.png',
    color: 'purple',
    hex: '#95cdd1',
    description: 'Toái Mộng'
  },
  {
    id: 'huyet-ha',
    name: 'Huyết Hà',
    category: 'martial_arts',
    iconName: 'huyet-ha.png',
    color: 'rose',
    hex: '#e9776f',
    description: 'Huyết Hà'
  },
  {
    id: 'than-tuong',
    name: 'Thần Tương',
    category: 'martial_arts',
    iconName: 'than-tuong.png',
    color: 'zinc',
    hex: '#3e6fb6',
    description: 'Thần Tương'
  },
  {
    id: 'long-ngam',
    name: 'Long Ngâm',
    category: 'martial_arts',
    iconName: 'long-ngam.png',
    color: 'violet',
    hex: '#5ab79b',
    description: 'Long Ngâm'
  },
  {
    id: 'huyen-co',
    name: 'Huyền Cơ',
    category: 'martial_arts',
    iconName: 'huyen-co.png',
    color: 'teal',
    hex: '#eee89d',
    description: 'Huyền Cơ'
  },
  {
    id: 'trieu-quang',
    name: 'Triều Quang',
    category: 'martial_arts',
    iconName: 'trieu-quang.png',
    color: 'sky',
    hex: '#97bbdf',
    description: 'Triều Quang'
  },
  {
    id: 'thuong-lang',
    name: 'Thương Lan',
    category: 'martial_arts',
    iconName: 'thuong-lang.png',
    color: 'indigo',
    hex: '#756faf',
    description: 'Thương Lan'
  },
  {
    id: 'hong-am',
    name: 'Hồng Âm',
    category: 'martial_arts',
    iconName: 'hong-am.png',
    color: 'orange',
    hex: '#f7c70b',
    description: 'Hồng Âm'
  }
];

export function getClassById(id: string): ClassOption | undefined {
  return CLASS_OPTIONS.find(opt => opt.id === id);
}

export function getClassColorClasses(color: string): {
  text: string;
  bg: string;
  border: string;
  hover: string;
  accent: string;
} {
  switch (color) {
    case 'amber':
      return {
        text: 'text-amber-300',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/20',
        hover: 'hover:bg-amber-500/15',
        accent: 'bg-amber-500'
      };
    case 'rose':
      return {
        text: 'text-rose-300',
        bg: 'bg-rose-500/10',
        border: 'border-rose-500/20',
        hover: 'hover:bg-rose-500/15',
        accent: 'bg-rose-500'
      };
    case 'sky':
      return {
        text: 'text-sky-300',
        bg: 'bg-sky-500/10',
        border: 'border-sky-500/20',
        hover: 'hover:bg-sky-500/15',
        accent: 'bg-sky-500'
      };
    case 'emerald':
      return {
        text: 'text-emerald-300',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20',
        hover: 'hover:bg-emerald-500/15',
        accent: 'bg-emerald-500'
      };
    case 'orange':
      return {
        text: 'text-orange-300',
        bg: 'bg-orange-500/10',
        border: 'border-orange-500/20',
        hover: 'hover:bg-orange-500/15',
        accent: 'bg-orange-500'
      };
    case 'purple':
      return {
        text: 'text-purple-300',
        bg: 'bg-purple-500/10',
        border: 'border-purple-500/20',
        hover: 'hover:bg-purple-500/15',
        accent: 'bg-purple-500'
      };
    case 'red':
      return {
        text: 'text-red-300',
        bg: 'bg-red-500/10',
        border: 'border-red-500/20',
        hover: 'hover:bg-red-500/15',
        accent: 'bg-red-500'
      };
    case 'zinc':
      return {
        text: 'text-zinc-300',
        bg: 'bg-zinc-500/10',
        border: 'border-zinc-500/20',
        hover: 'hover:bg-zinc-500/15',
        accent: 'bg-zinc-500'
      };
    case 'violet':
      return {
        text: 'text-violet-300',
        bg: 'bg-violet-500/10',
        border: 'border-violet-500/20',
        hover: 'hover:bg-violet-500/15',
        accent: 'bg-violet-500'
      };
    case 'teal':
      return {
        text: 'text-teal-300',
        bg: 'bg-teal-500/10',
        border: 'border-teal-500/20',
        hover: 'hover:bg-teal-500/15',
        accent: 'bg-teal-500'
      };
    case 'indigo':
      return {
        text: 'text-indigo-300',
        bg: 'bg-indigo-500/10',
        border: 'border-indigo-500/20',
        hover: 'hover:bg-indigo-500/15',
        accent: 'bg-indigo-500'
      };
    case 'blue':
      return {
        text: 'text-blue-300',
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/20',
        hover: 'hover:bg-blue-500/15',
        accent: 'bg-blue-500'
      };
    case 'fuchsia':
      return {
        text: 'text-fuchsia-300',
        bg: 'bg-fuchsia-500/10',
        border: 'border-fuchsia-500/20',
        hover: 'hover:bg-fuchsia-500/15',
        accent: 'bg-fuchsia-500'
      };
    case 'pink':
      return {
        text: 'text-pink-300',
        bg: 'bg-pink-500/10',
        border: 'border-pink-500/20',
        hover: 'hover:bg-pink-500/15',
        accent: 'bg-pink-500'
      };
    default:
      return {
        text: 'text-slate-300',
        bg: 'bg-slate-500/10',
        border: 'border-slate-500/20',
        hover: 'hover:bg-slate-500/15',
        accent: 'bg-slate-500'
      };
  }
}
