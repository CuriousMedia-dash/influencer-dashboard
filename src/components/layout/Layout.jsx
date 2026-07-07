import { useState } from "react";
import Header from "./Header";
import ImportCreatorsModal from "../ui/ImportCreatorsModal";

export default function Layout({ children }) {
  const [importOpen, setImportOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-page)" }}>
      <Header onGearClick={() => setImportOpen(true)} />
      <main className="min-w-0 flex-1 overflow-x-hidden p-6">{children}</main>
      <ImportCreatorsModal open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}
