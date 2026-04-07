import React, { useState, useEffect } from "react";
import { clinicService, authService, getFileUrl, API_BASE_URL } from "../services/api";
import { toast } from "react-hot-toast";
import { 
  Building2, 
  Plus, 
  Pencil, 
  Trash2, 
  X, 
  Save, 
  Loader2, 
  Globe, 
  Image as ImageIcon,
  Phone,
  MapPin
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

const ClinicsManagement = () => {
  const { t, lang, isRtl } = useLanguage();
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClinic, setEditingClinic] = useState(null);
  const [formData, setFormData] = useState({ 
    name: "", 
    subdomain: "", 
    logoUrl: "", 
    clinicImageUrl: "",
    address: "",
    phoneNumber: "",
    isActive: true 
  });
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isAr = lang === "ar";

  useEffect(() => {
    loadClinics();
  }, []);

  const loadClinics = async () => {
    try {
      setLoading(true);
      const res = await clinicService.getAll();
      setClinics(res.data);
    } catch (err) {
      toast.error(isAr ? "فشل تحميل العيادات" : "Failed to load clinics");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const tid = toast.loading(isAr ? "جاري رفع الصورة..." : "Uploading image...");
    try {
      const res = await authService.uploadClinicImage(file);
      setFormData({ ...formData, clinicImageUrl: res.data.imageUrl });
      toast.success(isAr ? "تم رفع الصورة!" : "Image uploaded!", { id: tid });
    } catch (err) {
      toast.error(isAr ? "فشل الرفع" : "Upload failed", { id: tid });
    } finally { setUploading(false); }
  };

  const handleOpenModal = (clinic = null) => {
    if (clinic) {
      setEditingClinic(clinic);
      setFormData({ 
        name: clinic.name, 
        subdomain: clinic.subdomain || "", 
        logoUrl: clinic.logoUrl || "", 
        clinicImageUrl: clinic.clinicImageUrl || "",
        address: clinic.address || "",
        phoneNumber: clinic.phoneNumber || "",
        isActive: clinic.isActive !== false 
      });
    } else {
      setEditingClinic(null);
      setFormData({ 
        name: "", 
        subdomain: "", 
        logoUrl: "", 
        clinicImageUrl: "",
        address: "",
        phoneNumber: "",
        isActive: true 
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingClinic) {
        await clinicService.update(editingClinic.id, { ...formData, id: editingClinic.id });
        toast.success(isAr ? "تم تحديث العيادة بنجاح" : "Clinic updated successfully");
      } else {
        await clinicService.create(formData);
        toast.success(isAr ? "تم إنشاء العيادة بنجاح" : "Clinic created successfully");
      }
      setShowModal(false);
      loadClinics();
    } catch (err) {
      toast.error(isAr ? "حدث خطأ أثناء الحفظ" : "Error saving clinic");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(isAr ? "هل أنت متأكد من حذف هذه العيادة؟" : "Are you sure you want to delete this clinic?")) return;
    try {
      await clinicService.delete(id);
      toast.success(isAr ? "تم حذف العيادة بنجاح" : "Clinic deleted successfully");
      loadClinics();
    } catch (err) {
      toast.error(isAr ? "فشل الحذف" : "Failed to delete");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-on-surface font-headline italic">
            {isAr ? "إدارة العيادات" : "Clinics Management"}
          </h2>
          <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest opacity-60">
            {isAr ? "إضافة وتعديل بيانات العيادات في النظام" : "Add and edit clinic data in the system"}
          </p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="btn-vibrant px-6 py-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest rounded-xl shadow-lg"
        >
          <Plus className="w-4 h-4" />
          {isAr ? "إضافة عيادة" : "Add Clinic"}
        </button>
      </div>

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{t('loading')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clinics.map(clinic => (
            <div key={clinic.id} className="card-premium p-0 group overflow-hidden">
              <div className="h-32 w-full bg-slate-100 relative">
                {clinic.clinicImageUrl ? (
                  <img 
                    src={getFileUrl(clinic.clinicImageUrl)} 
                    alt={clinic.name} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <ImageIcon className="w-10 h-10" />
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleOpenModal(clinic)} className="p-2 bg-white/90 backdrop-blur shadow-sm hover:bg-primary/10 text-primary rounded-lg transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(clinic.id)} className="p-2 bg-white/90 backdrop-blur shadow-sm hover:bg-error/10 text-error rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="p-6 pt-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-outline overflow-hidden shrink-0">
                    {clinic.logoUrl ? (
                      <img src={getFileUrl(clinic.logoUrl)} alt={clinic.name} className="w-full h-full object-cover" />
                    ) : (
                      <Building2 className="w-5 h-5 text-primary/40" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-black text-on-surface truncate">{clinic.name}</h3>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <Globe className="w-3 h-3" />
                      {clinic.subdomain || "no-subdomain"}
                    </div>
                  </div>
                </div>

                {clinic.address && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                    <MapPin className="w-3.5 h-3.5 opacity-60" />
                    <span className="truncate">{clinic.address}</span>
                  </div>
                )}
                
                {clinic.phoneNumber && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
                    <Phone className="w-3.5 h-3.5 opacity-60" />
                    <span>{clinic.phoneNumber}</span>
                  </div>
                )}

                <div className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${clinic.isActive !== false ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                  {clinic.isActive !== false ? (isAr ? "نشط" : "Active") : (isAr ? "غير نشط" : "Inactive")}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-xl bg-surface border border-outline rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-8 lg:p-12">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-3xl font-black text-on-surface font-headline italic">
                  {editingClinic ? (isAr ? "تعديل العيادة" : "Edit Clinic") : (isAr ? "عيادة جديدة" : "New Clinic")}
                </h3>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">{isAr ? "صورة العيادة" : "Clinic Image"}</label>
                    <div className="relative group w-full h-32 rounded-2xl bg-slate-50 border-2 border-dashed border-outline hover:border-primary transition-all overflow-hidden flex items-center justify-center">
                      {formData.clinicImageUrl ? (
                        <>
                          <img 
                            src={getFileUrl(formData.clinicImageUrl)} 
                            alt="Clinic" 
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <label className="cursor-pointer bg-white text-black px-4 py-2 rounded-xl font-bold text-sm shadow-xl hover:scale-105 transition-transform">
                              {isAr ? "تغيير" : "Change"}
                              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                            </label>
                          </div>
                        </>
                      ) : (
                        <label className="cursor-pointer flex flex-col items-center gap-2">
                          <div className="w-10 h-10 rounded-full bg-white shadow flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
                            {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">
                            {isAr ? "رفع صورة" : "Upload Image"}
                          </span>
                          <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                        </label>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">{isAr ? "اسم العيادة" : "Clinic Name"}</label>
                    <div className="relative group">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                      <input 
                        type="text" required
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        className="w-full bg-slate-50 border border-outline rounded-2xl py-4 pl-12 pr-4 font-bold text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                        placeholder="e.g. City Medical Center"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">{isAr ? "النطاق الفرعي" : "Subdomain"}</label>
                    <div className="relative group">
                      <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                      <input 
                        type="text"
                        value={formData.subdomain}
                        onChange={e => setFormData({...formData, subdomain: e.target.value})}
                        className="w-full bg-slate-50 border border-outline rounded-2xl py-4 pl-12 pr-4 font-bold text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                        placeholder="e.g. city-med"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">{isAr ? "رقم الهاتف" : "Phone Number"}</label>
                    <div className="relative group">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                      <input 
                        type="text"
                        value={formData.phoneNumber}
                        onChange={e => setFormData({...formData, phoneNumber: e.target.value})}
                        className="w-full bg-slate-50 border border-outline rounded-2xl py-4 pl-12 pr-4 font-bold text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                        placeholder="+1234567890"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">{isAr ? "العنوان" : "Address"}</label>
                    <div className="relative group">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                      <input 
                        type="text"
                        value={formData.address}
                        onChange={e => setFormData({...formData, address: e.target.value})}
                        className="w-full bg-slate-50 border border-outline rounded-2xl py-4 pl-12 pr-4 font-bold text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                        placeholder="e.g. 123 Main St"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-outline">
                  <input 
                    type="checkbox" id="isActive"
                    checked={formData.isActive}
                    onChange={e => setFormData({...formData, isActive: e.target.checked})}
                    className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="isActive" className="text-sm font-bold text-on-surface select-none">
                    {isAr ? "العيادة نشطة" : "Active Clinic"}
                  </label>
                </div>

                <button 
                  type="submit" disabled={submitting}
                  className="w-full btn-vibrant py-5 flex items-center justify-center gap-3 text-sm font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  {isAr ? "حفظ البيانات" : "Save Changes"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClinicsManagement;
