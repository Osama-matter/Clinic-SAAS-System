import React from "react";
import { ArrowLeft, Stethoscope } from "lucide-react";
import { useNavigate } from "react-router-dom";

const NotFoundPage = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center text-center p-8">
      <div>
        <Stethoscope className="w-24 h-24 text-primary mx-auto mb-6" />
        <h1 className="text-6xl font-black font-headline text-on-surface mb-4">404</h1>
        <p className="text-xl font-medium text-on-surface-variant mb-8">Oops! The page you're looking for doesn't exist.</p>
        <button 
          onClick={() => navigate("/dashboard")}
          className="inline-flex items-center gap-2 px-8 py-3 bg-primary text-on-primary font-bold rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default NotFoundPage;
