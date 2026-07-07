import { useState } from "react";
import Modal from "../ui/Modal";

/**
 * Small on/off toggle switch (styled checkbox). Used instead of a plain
 * checkbox so "both required" reads clearly as a state to flip on, not a
 * box to tick.
 */
function ToggleRow({ label, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-[9px] border px-3 py-2.5 text-left transition-colors"
      style={{
        borderColor: checked ? "rgba(43,174,102,.35)" : "var(--ln)",
        background: checked ? "rgba(43,174,102,.06)" : "var(--up)",
      }}
    >
      <span className="text-xs font-medium" style={{ color: "var(--ink)" }}>
        {label}
      </span>
      <span
        className="relative inline-flex h-[22px] w-[38px] flex-shrink-0 items-center rounded-full transition-colors"
        style={{ background: checked ? "#2BAE66" : "var(--ln)" }}
      >
        <span
          className="absolute h-[16px] w-[16px] rounded-full bg-white shadow transition-all"
          style={{ left: checked ? 19 : 3 }}
        />
      </span>
    </button>
  );
}

/**
 * Shown when the user clicks "Unlock" (i.e. tries to move a campaign
 * creator link from unlocked -> locked). Both toggles must be switched on —
 * the row only actually locks once both are confirmed.
 */
export default function LockConfirmModal({ open, onClose, onConfirm, creatorName }) {
  const [emailSent, setEmailSent] = useState(false);
  const [approvalReceived, setApprovalReceived] = useState(false);

  const canConfirm = emailSent && approvalReceived;

  function handleClose() {
    setEmailSent(false);
    setApprovalReceived(false);
    onClose();
  }

  function handleConfirm() {
    if (!canConfirm) return;
    onConfirm({ emailSent, approvalReceived });
    setEmailSent(false);
    setApprovalReceived(false);
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Confirm & lock"
      description={
        creatorName
          ? `Both toggles are required to lock ${creatorName}.`
          : "Both toggles are required to lock this creator."
      }
    >
      <div className="mb-4 flex flex-col gap-2">
        <ToggleRow label="Email sent" checked={emailSent} onChange={setEmailSent} />
        <ToggleRow label="Approval received" checked={approvalReceived} onChange={setApprovalReceived} />
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!canConfirm}
          className="flex-1 rounded-[7px] py-2.5 text-xs font-semibold text-white disabled:opacity-50"
          style={{ background: "#2BAE66" }}
        >
          Confirm & lock
        </button>
        <button
          type="button"
          onClick={handleClose}
          className="rounded-[7px] border px-3.5 py-2.5 text-xs"
          style={{ borderColor: "var(--ln)", color: "var(--ink2)" }}
        >
          Cancel
        </button>
      </div>
    </Modal>
  );
}