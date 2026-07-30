import { useState } from "react";
import Header from "./Header";
import ImportCreatorsModal from "../ui/ImportCreatorsModal";
import ImportAcquisitionCreatorsModal from "../acquisition/ImportAcquisitionCreatorsModal";

export default function Layout({ children, activeModule, onModuleChange }) {
  const [importOpen, setImportOpen] = useState(false);
  const [acquisitionImportOpen, setAcquisitionImportOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-page)" }}>
      <Header
        onGearClick={() => setImportOpen(true)}
        onAcquisitionUploadClick={() => setAcquisitionImportOpen(true)}
        activeModule={activeModule}
        onModuleChange={onModuleChange}
      />
      <main className="min-w-0 flex-1 overflow-x-hidden p-6">{children}</main>
      {activeModule !== "acquisition" && <ImportCreatorsModal open={importOpen} onClose={() => setImportOpen(false)} />}
      {activeModule === "acquisition" && (
        <ImportAcquisitionCreatorsModal open={acquisitionImportOpen} onClose={() => setAcquisitionImportOpen(false)} />
      )}
    </div>
  );
}
