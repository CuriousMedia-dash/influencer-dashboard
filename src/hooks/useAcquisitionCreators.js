import { useContext } from "react";
import { AcquisitionCreatorsContext } from "../context/acquisitionCreatorsContextDef";

export function useAcquisitionCreators() {
  const ctx = useContext(AcquisitionCreatorsContext);
  if (!ctx) throw new Error("useAcquisitionCreators must be used within AcquisitionCreatorsProvider");
  return ctx;
}
