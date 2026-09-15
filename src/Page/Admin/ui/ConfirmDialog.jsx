export default function ConfirmDialog({
  title,
  message,
  confirmLabel = "delete()",
  busy,
  onCancel,
  onConfirm,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-lg border border-[#1E293B] bg-[#0F172B] overflow-hidden">
        <div className="h-10 flex items-center px-4 bg-[#0b1220] border-b border-[#1E293B]">
          <p className="text-[11px] text-[#68768C]">confirm.sh</p>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div>
            <p className="text-white text-[14px]">{title}</p>
            <p className="text-[#90A1B9] text-[12px] mt-1.5 leading-6">
              {message}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 text-[12px] py-2 rounded-md border border-[#314158] text-[#90A1B9] hover:border-[#90A1B9] hover:text-white duration-150"
            >
              cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={busy}
              className="flex-1 text-[12px] py-2 rounded-md border border-[#FF6B6B] text-[#FF6B6B] hover:bg-[#FF6B6B14] duration-150 disabled:opacity-50"
            >
              {busy ? "..." : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
