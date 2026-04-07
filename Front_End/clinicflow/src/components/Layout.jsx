import React from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { useLanguage } from "../context/LanguageContext";

const Layout = ({ children, title = "ClinicFlow", showSidebar = true }) => {
  const { isRtl } = useLanguage();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  
  return (
    <div className="relative flex h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100" dir={isRtl ? "rtl" : "ltr"}>
      {/* Overlay for mobile */}
      {isSidebarOpen && showSidebar && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] lg:hidden transition-all duration-300 opacity-100"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {showSidebar && <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />}
      
      <div className="flex-1 flex flex-col min-w-0 relative h-full">
        {/* Abstract background blur for the main area */}
        <div className="absolute top-0 right-0 w-64 md:w-96 h-64 md:h-96 bg-primary/5 blur-[80px] md:blur-[120px] -translate-y-1/2 translate-x-1/2 pointer-events-none z-0" />
        
        <TopBar title={title} onMenuClick={showSidebar ? () => setIsSidebarOpen(true) : null} hideUserActions={!showSidebar} />
        <main className="custom-scrollbar relative z-30 flex-1 overflow-x-hidden overflow-y-auto px-3 pb-20 pt-6 sm:px-4 md:pt-10 lg:px-10">
          <div className="max-w-[1400px] mx-auto animate-fade-in w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
