import { useContext } from "react";
import { CreatorsContext } from "../context/creatorsContextDef";

export function useCreators() {
  const ctx = useContext(CreatorsContext);
  if (!ctx) throw new Error("useCreators must be used within CreatorsProvider");
  return ctx;
}
