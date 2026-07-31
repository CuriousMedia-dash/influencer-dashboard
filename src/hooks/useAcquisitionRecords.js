import { useContext } from "react";
import { AcquisitionRecordsContext } from "../context/acquisitionRecordsContextDef";

// usage: const { items, addRecord, updateRecord, ... } = useAcquisitionRecords("creators" | "influencers");
export function useAcquisitionRecords(kind) {
  const ctx = useContext(AcquisitionRecordsContext);
  if (!ctx) throw new Error("useAcquisitionRecords must be used within AcquisitionRecordsProvider");
  return ctx[kind];
}
