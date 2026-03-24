import React from 'react';

function ConfirmDialog({
  isOpen, onClose, onConfirm,
  title = 'Best\u00e4tigung', message = 'M\u00f6chten Sie fortfahren?',
  confirmText = 'Best\u00e4tigen', cancelText = 'Abbrechen',
  variant = 'danger'
}) {
  if (!isOpen) return null;

  const variants = {
    danger: {
      icon: (<svg className="w-6 h-6 text-[#B85C5C]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>),
      iconBg: 'bg-[#B85C5C]/10', confirmBtn: 'bg-[#B85C5C] hover:bg-[#A04A4A] text-white', titleColor: 'text-[#B85C5C]'
    },
    warning: {
      icon: (<svg className="w-6 h-6 text-[#B5A68C]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>),
      iconBg: 'bg-[#B5A68C]/10', confirmBtn: 'bg-[#B5A68C] hover:bg-[#A49578] text-white', titleColor: 'text-[#5C4F3D]'
    },
    info: {
      icon: (<svg className="w-6 h-6 text-[#7C8B6F]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>),
      iconBg: 'bg-[#7C8B6F]/10', confirmBtn: 'bg-[#7C8B6F] hover:bg-[#6B7A5E] text-white', titleColor: 'text-[#7C8B6F]'
    }
  };

  const style = variants[variant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#2C2418]/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-[20px] p-5 md:p-6 max-w-sm md:max-w-md w-full border border-[#E8E0D4] shadow-2xl animate-scale-in">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 ${style.iconBg} rounded-[12px] flex items-center justify-center flex-shrink-0`}>{style.icon}</div>
          <div className="flex-1">
            <h3 className={`text-[18px] font-semibold ${style.titleColor} mb-2`}>{title}</h3>
            <p className="text-[#8C7E6A] text-[14px] leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-3.5 md:py-3 min-h-[44px] border border-[#E8E0D4] text-[#8C7E6A] hover:border-[#B5A68C] hover:text-[#5C4F3D] rounded-[12px] transition-all font-medium active:bg-[#F5F0E8]">{cancelText}</button>
          <button onClick={() => { onConfirm(); onClose(); }} className={`flex-1 px-4 py-3.5 md:py-3 min-h-[44px] rounded-[12px] transition-all font-bold active:opacity-80 ${style.confirmBtn}`}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
