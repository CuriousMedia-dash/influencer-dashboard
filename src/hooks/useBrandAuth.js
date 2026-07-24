import { useContext } from "react";
import { BrandAuthContext } from "../context/brandAuthContextDef";

export function useBrandAuth() {
  const ctx = useContext(BrandAuthContext);
  if (!ctx) throw new Error("useBrandAuth must be used within BrandAuthProvider");
  return ctx;
}
