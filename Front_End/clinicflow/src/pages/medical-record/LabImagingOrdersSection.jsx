import React from "react";
import { Plus, Trash2, X, Beaker, ImageIcon } from "lucide-react";
import { getFileUrl } from "../../services/api";
import LabAutoComplete from "./LabAutoComplete";

const LabImagingOrdersSection = ({
    visitData,
    addLabOrderRow, updateLabOrder, removeLabOrder,
    addImagingRow, updateImaging, removeImaging,
    handleFileChange,
}) => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-6 border-t border-border/30">
        {/* Lab Orders */}
        <div className="relative z-50">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Beaker className="h-4 w-4 text-emerald-400" />
                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Lab Orders</h3>
                </div>
                <button
                    type="button"
                    onClick={addLabOrderRow}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-500/30
                        bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                >
                    <Plus className="h-3.5 w-3.5" />
                </button>
            </div>
            <div className="space-y-2">
                {visitData.labOrders.map((lab, index) => (
                    <div key={index}
                        className="flex gap-2 items-center rounded-lg border border-border/30 bg-secondary/30 p-2">
                        <LabAutoComplete
                            value={lab.testName}
                            onChange={(val) => updateLabOrder(index, "testName", val)}
                        />
                        <button
                            type="button"
                            onClick={() => removeLabOrder(index)}
                            className="p-1.5 rounded-md text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    </div>
                ))}
                {visitData.labOrders.length === 0 && (
                    <p className="text-xs italic text-muted-foreground/50 py-2">No labs ordered at this moment.</p>
                )}
            </div>
        </div>

        {/* Imaging Orders */}
        <div className="relative z-40">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-info" />
                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Imaging Orders</h3>
                </div>
                <button
                    type="button"
                    onClick={addImagingRow}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-info/30
                        bg-info/10 text-info hover:bg-info/20 transition-colors"
                >
                    <Plus className="h-3.5 w-3.5" />
                </button>
            </div>
            <div className="space-y-3">
                {visitData.imagingOrders.map((img, index) => (
                    <div key={index}
                        className="group/row relative rounded-lg border border-border/30 bg-secondary/30 p-3">
                        <button
                            type="button"
                            onClick={() => removeImaging(index)}
                            className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded border border-destructive/30
                                bg-destructive/10 text-destructive opacity-0 group-hover/row:opacity-100 transition-all shadow-sm z-10"
                        >
                            <X className="h-3 w-3" />
                        </button>
                        <div className="flex gap-2 mb-3">
                            <input
                                type="text"
                                placeholder="Type (e.g. MRI)"
                                value={img.imagingType}
                                className="w-1/2 rounded-md border-0 !border-transparent bg-surface-alt px-2.5 py-1.5 text-sm text-foreground outline-none focus:ring-0 focus:outline-none transition-all shadow-none"
                            />
                            <input
                                type="text"
                                placeholder="Body Part"
                                value={img.bodyPart}
                                className="w-1/2 rounded-md border-0 !border-transparent bg-surface-alt px-2.5 py-1.5 text-sm text-foreground outline-none focus:ring-0 focus:outline-none transition-all shadow-none"
                            />
                        </div>
                        <label className="flex items-center justify-center gap-2 w-full cursor-pointer rounded-lg border border-dashed border-border/30
                            bg-card/30 px-3 py-2.5 text-xs font-medium text-muted-foreground
                            hover:border-primary/30 hover:bg-primary/5 hover:text-primary transition-all">
                            <ImageIcon className="h-3.5 w-3.5" />
                            {img.imageUrl || img.imageData ? "Replace attachment" : "Attach image"}
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleFileChange(index, e.target.files?.[0])}
                            />
                        </label>
                        {(img.imageUrl || img.imageData) && (
                            <div className="mt-2 overflow-hidden rounded-lg border border-border/30">
                                <img
                                    src={img.imageUrl ? getFileUrl(img.imageUrl) : img.imageData}
                                    alt="Imaging attachment"
                                    className="h-28 w-full object-cover"
                                />
                            </div>
                        )}
                    </div>
                ))}
                {visitData.imagingOrders.length === 0 && (
                    <p className="text-xs italic text-muted-foreground/50 py-2">No imaging attachments.</p>
                )}
            </div>
        </div>
    </div>
);

export default LabImagingOrdersSection;