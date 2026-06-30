import React, { useState } from 'react';
import { motion } from 'motion/react';
import { getClassById } from '../data/classes';
import { ClassIcon } from './ClassIcon';
import { ClassModal } from './ClassModal';

interface ClassSelectorProps {
  selectedClassId: string;
  onSelectClass: (classId: string) => void;
  id: string;
  disabled?: boolean;
}

export const ClassSelector: React.FC<ClassSelectorProps> = ({ selectedClassId, onSelectClass, id, disabled }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const selectedClass = getClassById(selectedClassId);
  const hex = selectedClass?.hex ?? '#ffffff';

  return (
    <div id={id} className="relative inline-block w-full">
      <motion.button
        id={`${id}-trigger`}
        type="button"
        whileHover={!disabled ? { scale: 1.06 } : undefined}
        whileTap={!disabled ? { scale: 0.94 } : undefined}
        onClick={() => { if (!disabled) setIsModalOpen(true); }}
        disabled={disabled}
        title={selectedClass?.name}
        className={`tooltip flex w-full items-center justify-center rounded-xl p-1.5 transition-all duration-200 ${
          disabled ? 'select-none opacity-60 cursor-default' : 'cursor-pointer hover:scale-110 active:scale-95'
        }`}
        style={{ background: 'none', border: 'none', boxShadow: 'none' }}
        data-tip={selectedClass?.name ?? '?'}
      >
        <ClassIcon name={selectedClass?.iconName || 'HelpCircle'} size={26} className="md:hidden" />
        <ClassIcon name={selectedClass?.iconName || 'HelpCircle'} size={30} className="hidden md:block" />
      </motion.button>

      <ClassModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectClass={onSelectClass}
        selectedClassId={selectedClassId}
      />
    </div>
  );
};
