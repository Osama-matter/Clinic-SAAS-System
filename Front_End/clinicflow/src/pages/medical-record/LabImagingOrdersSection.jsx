import React from "react";
import { Plus, Trash2, X, Beaker, ImageIcon } from "lucide-react";
import { getFileUrl } from "../../services/api";

const LabImagingOrdersSection = ({
    visitData,
    addLabOrderRow, updateLabOrder, removeLabOrder,
    addImagingRow, updateImaging, removeImaging,
    handleFileChange,
}) => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-8 border-t border-outline">
        {/* Lab Orders */}
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Beaker className="w-4 h-4" /> Lab Orders
                </h3>
                <button
                    type="button"
                    onClick={addLabOrderRow}
                    className="text-emerald-600 bg-emerald-50 hover:bg-emerald-100 p-1.5 rounded-lg transition-colors"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>
            <div className="space-y-3">
                {visitData.labOrders.map((lab, index) => (
                    <div
                        key={index}
                        className="flex gap-2 items-center bg-surface-alt p-2 pr-3 rounded-xl border border-outline"
                    >
                        <input
                            type="text"
                            placeholder="Test Name (e.g. CBC)"
                            value={lab.testName}
                            onChange={(e) => updateLabOrder(index, "testName", e.target.value)}
                            className="w-full p-2 bg-surface text-on-surface rounded-lg text-sm font-bold border border-outline outline-none focus:border-primary"
                        />
                        <button
                            type="button"
                            onClick={() => removeLabOrder(index)}
                            className="p-2 text-red-500 hover:text-red-600 transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}
                {visitData.labOrders.length === 0 && (
                    <p className="text-xs font-bold text-on-surface-variant py-2 italic">
                        No labs ordered at this moment.
                    </p>
                )}
            </div>
        </div>

        {/* Imaging Orders */}
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-black text-on-surface-variant uppercase tracking-widest flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" /> Imaging Orders
                </h3>
                <button
                    type="button"
                    onClick={addImagingRow}
                    className="text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 p-1.5 rounded-lg transition-colors"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>
            <div className="space-y-4">
                {visitData.imagingOrders.map((img, index) => (
                    <div
                        key={index}
                        className="bg-surface-alt p-4 rounded-2xl border border-outline relative group/row"
                    >
                        <button
                            type="button"
                            onClick={() => removeImaging(index)}
                            className="absolute -top-2 -right-2 p-1.5 bg-red-50 text-red-500 rounded-lg border border-red-100 opacity-0 group-hover/row:opacity-100 transition-all shadow-sm z-10"
                        >
                            <X className="w-3 h-3" />
                        </button>
                        <div className="flex gap-3">
                            <input
                                type="text"
                                placeholder="Type (e.g. MRI)"
                                value={img.imagingType}
                                onChange={(e) => updateImaging(index, "imagingType", e.target.value)}
                                className="w-1/2 p-2 bg-surface text-on-surface rounded-lg text-sm font-bold border border-outline outline-none focus:border-primary"
                            />
                            <input
                                type="text"
                                placeholder="Body Part"
                                value={img.bodyPart}
                                onChange={(e) => updateImaging(index, "bodyPart", e.target.value)}
                                className="w-1/2 p-2 bg-surface text-on-surface rounded-lg text-sm font-bold border border-outline outline-none focus:border-primary"
                            />
                        </div>
                        <div className="mt-3">
                            <label className="flex items-center justify-center gap-2 w-full cursor-pointer rounded-xl border border-dashed border-outline bg-surface px-4 py-3 text-xs font-bold text-on-surface-variant hover:border-primary/40 hover:bg-primary/5 transition-all">
                                <ImageIcon className="w-4 h-4" />
                                {img.imageUrl || img.imageData ? "Replace attachment" : "Attach image"}
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => handleFileChange(index, e.target.files?.[0])}
                                />
                            </label>
                            {(img.imageUrl || img.imageData) && (
                                <div className="mt-3 overflow-hidden rounded-xl border border-outline bg-surface">
                                    <img
                                        src={img.imageUrl ? getFileUrl(img.imageUrl) : img.imageData}
                                        alt="Imaging attachment"
                                        className="h-32 w-full object-cover"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {visitData.imagingOrders.length === 0 && (
                    <p className="text-xs font-bold text-on-surface-variant py-2 italic opacity-50">
                        No imaging attachments.
                    </p>
                )}
            </div>
        </div>
    </div>
);

export default LabImagingOrdersSection;
