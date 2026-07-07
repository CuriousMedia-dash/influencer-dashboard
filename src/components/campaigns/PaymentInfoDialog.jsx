import { useState } from "react";
import { Mail } from "lucide-react";
import Modal from "../ui/Modal";
import { openPaymentEmail } from "../../utils/email";
import { useToast } from "../../hooks/useToast";
import { sanitizeIfscInput, isValidIfsc } from "../../utils/format";

const EMPTY_UPI = { type: "upi", upiId: "", scheduledDate: "" };
const EMPTY_BANK = {
  type: "bank",
  accountHolder: "",
  accountNumber: "",
  ifsc: "",
  bankName: "",
  branchAddress: "",
  scheduledDate: "",
};

function Field({ label, value, onChange, placeholder, mono, type = "text", error, maxLength }) {
  return (
    <div className="mb-2.5">
      <label className="mb-1 block text-[11px]" style={{ color: "var(--ink3)" }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className="w-full rounded-[7px] border px-2.5 py-2 text-xs outline-none"
        style={{
          background: "var(--up)",
          borderColor: error ? "#E0524B" : "var(--ln)",
          color: "var(--ink)",
          fontFamily: mono ? "'JetBrains Mono', monospace" : undefined,
        }}
      />
      {error && (
        <p className="mt-1 text-[10.5px]" style={{ color: "#E0524B" }}>
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Dialog for capturing a creator's payment info (UPI or Bank) on a
 * specific campaign↔creator link, with an option to save & immediately
 * open an email draft (mailto:) pre-filled with name, phone, campaign,
 * payment amount and the payment details just entered.
 *
 * NOTE: render this with a `key` tied to the creator/link id (e.g.
 * `key={paymentDialogCreatorId}`) so the form resets cleanly whenever it's
 * opened for a different creator — this component derives its initial
 * state once from props instead of syncing via an effect.
 */
export default function PaymentInfoDialog({
  open,
  onClose,
  creator,
  campaignName,
  amount,
  initialPaymentInfo,
  onSave,
}) {
  const [type, setType] = useState(initialPaymentInfo?.type === "bank" ? "bank" : "upi");
  const [upi, setUpi] = useState(() =>
    initialPaymentInfo?.type === "upi" ? { ...EMPTY_UPI, ...initialPaymentInfo } : EMPTY_UPI
  );
  const [bank, setBank] = useState(() =>
    initialPaymentInfo?.type === "bank" ? { ...EMPTY_BANK, ...initialPaymentInfo } : EMPTY_BANK
  );
  const [emailTo, setEmailTo] = useState("");
  const showToast = useToast();

  const currentInfo = type === "upi" ? upi : bank;
  const ifscError = bank.ifsc && !isValidIfsc(bank.ifsc) ? "IFSC must be 11 characters: 4 letters, then 0, then 6 letters/digits (e.g. HDFC0001234)" : "";
  const isValid =
    type === "upi"
      ? Boolean(upi.upiId.trim())
      : Boolean(
          bank.accountHolder.trim() &&
            bank.accountNumber.trim() &&
            isValidIfsc(bank.ifsc)
        );

  function handleSave() {
    if (!isValid) return;
    onSave(currentInfo);
    onClose();
  }

  async function handleSaveAndEmail() {
    if (!isValid) return;
    onSave(currentInfo);
    const { clipboardCopied } = await openPaymentEmail({
      to: emailTo.trim(),
      creator,
      campaignName,
      amount,
      paymentInfo: currentInfo,
    });
    showToast(
      clipboardCopied
        ? "Email app opened — details also copied to clipboard as backup"
        : "Email app opened with the payment details",
      true
    );
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Payment info"
      description={
        creator?.name
          ? `Enter payment details for ${creator.name}. This is saved for this campaign only.`
          : "Enter payment details for this campaign."
      }
      maxWidth={460}
    >
      <div
        className="mb-3.5 flex gap-1.5 rounded-[10px] border p-1"
        style={{ borderColor: "var(--ln)", background: "var(--up)" }}
      >
        <button
          type="button"
          onClick={() => setType("upi")}
          className="flex-1 rounded-[7px] py-1.5 text-xs font-medium transition-colors"
          style={{
            background: type === "upi" ? "var(--am)" : "transparent",
            color: type === "upi" ? "#fff" : "var(--ink2)",
          }}
        >
          UPI
        </button>
        <button
          type="button"
          onClick={() => setType("bank")}
          className="flex-1 rounded-[7px] py-1.5 text-xs font-medium transition-colors"
          style={{
            background: type === "bank" ? "var(--am)" : "transparent",
            color: type === "bank" ? "#fff" : "var(--ink2)",
          }}
        >
          Bank details
        </button>
      </div>

      {type === "upi" ? (
        <Field
          label="UPI ID"
          value={upi.upiId}
          onChange={(v) => setUpi({ type: "upi", upiId: v })}
          placeholder="creator@upi"
          mono
        />
      ) : (
        <>
          <Field
            label="Account holder name"
            value={bank.accountHolder}
            onChange={(v) => setBank({ ...bank, accountHolder: v })}
            placeholder="As per bank records"
          />
          <Field
            label="Account number"
            value={bank.accountNumber}
            onChange={(v) => setBank({ ...bank, accountNumber: v })}
            placeholder="1234567890"
            mono
          />
          <Field
            label="IFSC code"
            value={bank.ifsc}
            onChange={(v) => setBank({ ...bank, ifsc: sanitizeIfscInput(v) })}
            placeholder="HDFC0001234"
            mono
            maxLength={11}
            error={ifscError}
          />
          <Field
            label="Bank name"
            value={bank.bankName}
            onChange={(v) => setBank({ ...bank, bankName: v })}
            placeholder="e.g. HDFC Bank"
          />
          <Field
            label="Branch address"
            value={bank.branchAddress}
            onChange={(v) => setBank({ ...bank, branchAddress: v })}
            placeholder="Branch address"
          />
        </>
      )}

      <Field
        label="Payment scheduled for (optional)"
        type="date"
        value={currentInfo.scheduledDate || ""}
        onChange={(v) =>
          type === "upi" ? setUpi({ ...upi, scheduledDate: v }) : setBank({ ...bank, scheduledDate: v })
        }
      />

      <div className="mb-1 mt-1 border-t pt-3" style={{ borderColor: "var(--ln)" }}>
        <Field
          label="Forward to email (optional)"
          value={emailTo}
          onChange={setEmailTo}
          placeholder="finance@yourcompany.com"
          mono
        />
        <p className="mb-3 -mt-1.5 text-[11px]" style={{ color: "var(--ink3)" }}>
          Opens your email app with name, phone, campaign, amount &amp; payment
          details pre-filled — nothing is sent automatically.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={!isValid}
          className="flex-1 rounded-[7px] py-2.5 text-xs font-semibold text-white disabled:opacity-40"
          style={{ background: "var(--am)" }}
        >
          Save
        </button>
        <button
          type="button"
          onClick={handleSaveAndEmail}
          disabled={!isValid}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-[7px] py-2.5 text-xs font-semibold text-white disabled:opacity-40"
          style={{ background: "#2BAE66" }}
        >
          <Mail size={13} />
          Save &amp; email
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-[7px] border px-3.5 py-2.5 text-xs"
          style={{ borderColor: "var(--ln)", color: "var(--ink2)" }}
        >
          Cancel
        </button>
      </div>
    </Modal>
  );
}
