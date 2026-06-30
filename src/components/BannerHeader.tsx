import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Edit2, Upload, RotateCcw, Check, FileText } from 'lucide-react';
import { RaidSettings } from '../types';
import { DateTimePicker } from './DateTimePicker';

const DEFAULT_BANNER = '/bg.gif';

interface BannerHeaderProps {
  settings: RaidSettings;
  onUpdateSettings: (settings: RaidSettings) => void;
  isScreenshotMode?: boolean;
}

export const BannerHeader: React.FC<BannerHeaderProps> = ({ settings, onUpdateSettings, isScreenshotMode = false }) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const descInputRef = useRef<HTMLTextAreaElement>(null);

  const [tempTitle, setTempTitle] = useState(settings.title);
  const [tempDesc, setTempDesc] = useState(settings.description);

  const compressImage = (base64Str: string, maxWidth = 1200): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.75));
        } else {
          resolve(base64Str);
        }
      };
      img.onerror = () => {
        resolve(base64Str);
      };
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const compressed = await compressImage(base64);
        onUpdateSettings({ ...settings, bannerUrl: compressed });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const compressed = await compressImage(base64);
        onUpdateSettings({ ...settings, bannerUrl: compressed });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveTitle = () => {
    if (tempTitle.trim()) {
      onUpdateSettings({ ...settings, title: tempTitle.trim() });
    } else {
      setTempTitle(settings.title);
    }
    setIsEditingTitle(false);
  };

  const handleSaveDesc = () => {
    onUpdateSettings({ ...settings, description: tempDesc.trim() });
    setIsEditingDesc(false);
  };

  const handleResetBanner = () => {
    onUpdateSettings({ ...settings, bannerUrl: null });
  };

  const currentBanner = settings.bannerUrl || DEFAULT_BANNER;

  return (
    <div
      id="raid-banner-header"
      className={`relative w-full overflow-hidden rounded-3xl transition-all duration-300 card-soft ${
        dragActive ? 'ring-2 ring-indigo-400/50 ring-offset-2 ring-offset-[#080a10] scale-[0.995] cursor-copy' : ''
      }`}
      onDragEnter={!isScreenshotMode ? handleDrag : undefined}
      onDragOver={!isScreenshotMode ? handleDrag : undefined}
      onDragLeave={!isScreenshotMode ? handleDrag : undefined}
      onDrop={!isScreenshotMode ? handleDrop : undefined}
    >
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={currentBanner}
          alt="Raid Banner"
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover object-center transition-all duration-700 brightness-[0.5] saturate-[0.8]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#080a10]/90 via-[#080a10]/30 to-[#080a10]/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-950/30 via-transparent to-violet-950/25" />
        {/* Bottom vignette */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#080a10]/60 to-transparent" />
      </div>

      {/* Banner Controls */}
      {!isScreenshotMode && (
        <div className="absolute top-4 right-4 z-20 flex gap-2">
          <button
            id="btn-upload-banner"
            onClick={() => fileInputRef.current?.click()}
            className="glass flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:glass-neon-border cursor-pointer"
            title="Tải ảnh máy tính lên"
          >
            <Upload size={13} />
            <span>Thay ảnh</span>
          </button>
          {settings.bannerUrl && (
            <button
              id="btn-reset-banner"
              onClick={handleResetBanner}
              className="glass flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium text-rose-300 transition hover:glass-neon-border cursor-pointer"
              title="Khôi phục ảnh mặc định"
            >
              <RotateCcw size={13} />
              <span>Mặc định</span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}

      {/* Main Content */}
      <div className={`relative z-10 flex flex-col items-center px-6 md:px-10 text-center transition-all duration-300 ${
        isScreenshotMode ? 'py-4 md:py-5' : 'py-10 md:py-14'
      }`}>
        <motion.div
          initial={{ opacity: 0, scale: 0.88, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.12, ease: [0.34, 1.56, 0.64, 1] }}
          className="mb-3"
        />

        {/* Title */}
        <div className="mb-4 w-full max-w-3xl">
          {isEditingTitle && !isScreenshotMode ? (
            <div className="flex items-center justify-center gap-2">
              <input
                ref={titleInputRef}
                type="text"
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') {
                    setTempTitle(settings.title);
                    setIsEditingTitle(false);
                  }
                }}
                className="input-soft w-full rounded-2xl px-4 py-2 text-center text-xl font-semibold shadow-lg md:text-2xl"
                autoFocus
                placeholder="Nhập tiêu đề phó bản..."
              />
              <button
                onClick={handleSaveTitle}
                className="rounded-xl bg-indigo-500 p-2.5 text-white transition hover:bg-indigo-600"
              >
                <Check size={16} />
              </button>
            </div>
          ) : (
            <h1
              onClick={!isScreenshotMode ? () => {
                setTempTitle(settings.title);
                setIsEditingTitle(true);
              } : undefined}
              className={`group relative inline-flex items-center justify-center gap-2 font-semibold text-white select-none drop-shadow-md cursor-edit ${
                isScreenshotMode ? 'pointer-events-none text-xl md:text-3xl' : 'text-2xl md:text-4xl hover:opacity-90'
              }`}
              title={isScreenshotMode ? undefined : "Click để chỉnh sửa tiêu đề"}
            >
              <span>{settings.title}</span>
              {!isScreenshotMode && (
                <span className="rounded-lg border border-white/20 bg-white/15 p-1 opacity-0 backdrop-blur-sm transition duration-200 group-hover:opacity-100">
                  <Edit2 size={12} className="text-white/80" />
                </span>
              )}
            </h1>
          )}
        </div>

        {/* Date / Time */}
        <div className={`glass glass-neon-border inline-flex items-center justify-center rounded-2xl font-medium text-white transition-all ${
          isScreenshotMode ? 'px-4 py-2 text-xs' : 'px-5 py-2.5 text-xs md:text-sm'
        }`}>
          <DateTimePicker
            value={settings.dateTime}
            onChange={(display) => onUpdateSettings({ ...settings, dateTime: display })}
            isScreenshotMode={isScreenshotMode}
          />
        </div>

        {/* Description */}
        <div className="mt-3 w-full max-w-xl">
          {isEditingDesc && !isScreenshotMode ? (
            <div className="flex flex-col gap-2">
              <textarea
                ref={descInputRef}
                value={tempDesc}
                onChange={(e) => setTempDesc(e.target.value)}
                onBlur={handleSaveDesc}
                className="input-soft w-full resize-none rounded-xl px-4 py-2.5 text-center text-xs leading-relaxed"
                rows={2}
                autoFocus
                placeholder="Nhập ghi chú quan trọng cho team..."
              />
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => setIsEditingDesc(false)}
                  className="btn-secondary px-4 py-1.5 text-xs"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSaveDesc}
                  className="btn-primary px-4 py-1.5 text-xs"
                >
                  Lưu
                </button>
              </div>
            </div>
          ) : (
            <p
              onClick={!isScreenshotMode ? () => {
                setTempDesc(settings.description);
                setIsEditingDesc(true);
              } : undefined}
              className={`group relative inline-flex max-w-xl items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs text-white/80 transition glass cursor-edit ${
                isScreenshotMode ? 'pointer-events-none' : 'hover:glass-neon-border hover:text-white/95'
              }`}
              title={isScreenshotMode ? undefined : "Click để chỉnh sửa ghi chú"}
            >
              <FileText size={11} className="shrink-0 text-white/50" />
              <span className="text-center text-xs italic leading-snug">{settings.description || "Thêm ghi chú phó bản..."}</span>
              {!isScreenshotMode && (
                <Edit2 size={9} className="shrink-0 opacity-0 transition group-hover:opacity-60" />
              )}
            </p>
          )}
        </div>
      </div>

      {/* Drag overlay */}
      <AnimatePresence>
        {dragActive && !isScreenshotMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center rounded-3xl border-2 border-dashed border-indigo-300 bg-indigo-500/20 backdrop-blur-sm"
          >
            <div className="text-center">
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Upload size={40} className="mx-auto mb-3 text-white" />
              </motion.div>
              <p className="text-base font-medium text-white">Thả ảnh vào đây</p>
              <p className="mt-1 text-sm text-white/70">Hỗ trợ mọi định dạng ảnh</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
