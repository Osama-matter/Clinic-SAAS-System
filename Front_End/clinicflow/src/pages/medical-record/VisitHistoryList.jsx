import React from "react";
import {
    Activity, FileText, FileSearch, Pill, Trash2, Edit,
    ImageIcon
} from "lucide-react";
import DiagnosisPill from "./DiagnosisPill";

const VisitHistoryList = ({ visits, loadingChart, openFullChart, openEditVisit, handleDeleteVisit }) => (
    <div className="space-y-6 animate-fade-in">
        {visits.length === 0 ? (
            <div className="bg-surface-alt border border-outline p-16 text-center rounded-[3rem] text-slate-400 font-bold flex flex-col items-center gap-4">
                <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center shadow-sm">
                    <FileText className="w-8 h-8 text-primary opacity-50" />
                </div>
                No visit logs recorded in the system.
            </div>
        ) : (
            visits.map((v) => (
                <div
                    key={v.id}
                    className="bg-surface border border-outline p-6 lg:p-8 rounded-[2rem] flex flex-col lg:flex-row gap-6 shadow-sm hover:border-primary/30 transition-all group"
                >
                    <div className="flex-1">
                        <div className="flex items-center gap-4 border-b border-outline pb-4 mb-4">
                            <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center text-primary font-black">
                                {new Date(v.visitDate).getDate()}
                            </div>
                            <div className="flex-1">
                                <h3 className="font-black text-xl text-on-surface group-hover:text-primary transition-colors">
                                    {new Date(v.visitDate).toLocaleDateString()} -{" "}
                                    {v.visitType === 1
                                        ? "Initial"
                                        : v.visitType === 2
                                            ? "Follow-Up"
                                            : v.visitType === 3
                                                ? "Emergency"
                                                : "Routine"}
                                </h3>
                                <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-widest text-[10px]">
                                    Doc ID: {v.doctorId.substring(0, 8)}
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm font-medium">
                            <div className="bg-surface-alt p-4 rounded-2xl border border-outline/50">
                                <strong className="block text-primary uppercase text-[10px] tracking-widest font-black mb-2 flex items-center gap-2">
                                    <Activity className="w-3 h-3" /> Complaint
                                </strong>
                                <p className="line-clamp-2">{v.symptoms || "None recorded"}</p>
                            </div>
                            <div className="bg-surface-alt p-4 rounded-2xl border border-outline/50">
                                <strong className="block text-primary uppercase text-[10px] tracking-widest font-black mb-2 flex items-center gap-2">
                                    <FileSearch className="w-3 h-3" /> Diagnoses
                                </strong>
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                    {v.diagnoses?.map((d, i) => <DiagnosisPill key={i} diagnosis={d} />)}
                                    {(!v.diagnoses || v.diagnoses.length === 0) && (
                                        <p className="text-xs italic opacity-40">N/A</p>
                                    )}
                                </div>
                            </div>
                            <div className="bg-surface-alt p-4 rounded-2xl border border-outline/50">
                                <strong className="block text-primary uppercase text-[10px] tracking-widest font-black mb-2 flex items-center gap-2">
                                    <Pill className="w-3 h-3" /> Prescriptions
                                </strong>
                                <p className="text-xs font-bold text-on-surface truncate">
                                    {v.prescriptions?.map((p) => p.medicationName).join(", ") || "N/A"}
                                </p>
                            </div>
                            <div className="bg-surface-alt p-4 rounded-2xl border border-outline/50">
                                <strong className="block text-primary uppercase text-[10px] tracking-widest font-black mb-2 flex items-center gap-2">
                                    <ImageIcon className="w-3 h-3" /> Attachments
                                </strong>
                                <p className="text-[10px] opacity-70 font-black uppercase text-indigo-600">
                                    {v.imagingOrders?.some((io) => io.imageUrl || io.imageData) ? (
                                        <span className="flex items-center gap-1">
                                            <ImageIcon className="w-3 h-3" /> Images Attached
                                        </span>
                                    ) : (
                                        "No attachments"
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-3">
                        <button
                            onClick={() => openFullChart(v.id)}
                            disabled={loadingChart}
                            className="flex-1 lg:flex-none text-primary bg-primary/5 hover:bg-primary/10 px-5 py-4 rounded-2xl font-black text-[13px] transition-all flex items-center justify-center gap-2 border border-primary/10 disabled:opacity-50"
                        >
                            <FileText className="w-4 h-4" /> {loadingChart ? "Loading..." : "Chart"}
                        </button>
                        <button
                            onClick={() => openEditVisit(v.id)}
                            disabled={loadingChart}
                            className="flex-1 lg:flex-none text-blue-600 bg-blue-50 hover:bg-blue-100 px-5 py-4 rounded-2xl font-black text-[13px] transition-all flex items-center justify-center gap-2 border border-blue-100 disabled:opacity-50"
                        >
                            <Edit className="w-4 h-4" /> Edit
                        </button>
                        <button
                            onClick={() => handleDeleteVisit(v.id)}
                            className="flex-1 lg:flex-none text-red-500 bg-red-50 hover:bg-red-100 px-5 py-4 rounded-2xl font-black text-[13px] transition-all flex items-center justify-center border border-red-100"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ))
        )}
    </div>
);

export default VisitHistoryList;
