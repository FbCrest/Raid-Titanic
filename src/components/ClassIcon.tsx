import React from 'react';
import {
  Shield,
  Heart,
  Sparkles,
  Target,
  Flame,
  Skull,
  ShieldAlert,
  Zap,
  Compass,
  FlameKindling,
  Swords,
  HeartPulse,
  Crosshair,
  Wand2,
  Activity,
  Star,
  Users,
  Grid,
  Calendar,
  Clock,
  Trash2,
  RotateCcw,
  Upload,
  Copy,
  Check,
  Edit2,
  ChevronDown,
  Sparkle,
  UserPlus,
  ArrowUpDown,
  Search,
  Eye,
  Settings,
  HelpCircle,
  FileText
} from 'lucide-react';

interface ClassIconProps {
  name: string;
  className?: string;
  size?: number;
}

export const ClassIcon: React.FC<ClassIconProps> = ({ name, className = '', size = 18 }) => {
  // Check if the name is a PNG file (custom icon from icon-phai directory)
  if (name.endsWith('.png')) {
    return (
      <img
        src={`/icon-phai/${name}`}
        alt={name}
        draggable={false}
        className={`object-contain ${className}`}
        style={{ width: size, height: size, objectFit: 'contain' }}
      />
    );
  }

  switch (name) {
    case 'Shield':
      return <Shield className={className} size={size} />;
    case 'Heart':
      return <Heart className={className} size={size} />;
    case 'Sparkles':
      return <Sparkles className={className} size={size} />;
    case 'Target':
      return <Target className={className} size={size} />;
    case 'Flame':
      return <Flame className={className} size={size} />;
    case 'Skull':
      return <Skull className={className} size={size} />;
    case 'ShieldAlert':
      return <ShieldAlert className={className} size={size} />;
    case 'Zap':
      return <Zap className={className} size={size} />;
    case 'Compass':
      return <Compass className={className} size={size} />;
    case 'FlameKindling':
      return <FlameKindling className={className} size={size} />;
    case 'Swords':
      return <Swords className={className} size={size} />;
    case 'HeartPulse':
      return <HeartPulse className={className} size={size} />;
    case 'Crosshair':
      return <Crosshair className={className} size={size} />;
    case 'Wand2':
      return <Wand2 className={className} size={size} />;
    case 'Activity':
      return <Activity className={className} size={size} />;
    case 'Star':
      return <Star className={className} size={size} />;
    case 'Users':
      return <Users className={className} size={size} />;
    case 'Grid':
      return <Grid className={className} size={size} />;
    case 'Calendar':
      return <Calendar className={className} size={size} />;
    case 'Clock':
      return <Clock className={className} size={size} />;
    case 'Trash2':
      return <Trash2 className={className} size={size} />;
    case 'RotateCcw':
      return <RotateCcw className={className} size={size} />;
    case 'Upload':
      return <Upload className={className} size={size} />;
    case 'Copy':
      return <Copy className={className} size={size} />;
    case 'Check':
      return <Check className={className} size={size} />;
    case 'Edit2':
      return <Edit2 className={className} size={size} />;
    case 'ChevronDown':
      return <ChevronDown className={className} size={size} />;
    case 'Sparkle':
      return <Sparkle className={className} size={size} />;
    case 'UserPlus':
      return <UserPlus className={className} size={size} />;
    case 'ArrowUpDown':
      return <ArrowUpDown className={className} size={size} />;
    case 'Search':
      return <Search className={className} size={size} />;
    case 'Eye':
      return <Eye className={className} size={size} />;
    case 'Settings':
      return <Settings className={className} size={size} />;
    case 'FileText':
      return <FileText className={className} size={size} />;
    default:
      return <HelpCircle className={className} size={size} />;
  }
};
