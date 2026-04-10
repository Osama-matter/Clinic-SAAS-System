import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { clinicService, getFileUrl } from "../services/api";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock3,
  Copy,
  Eye,
  ImagePlus,
  Loader2,
  MapPin,
  Palette,
  Phone,
  Save,
  Sparkles,
  Stethoscope,
  UserRound,
} from "lucide-react";

const tabs = [
  { id: "general", label: "General" },
  { id: "media", label: "Media" },
  { id: "booking", label: "Booking" },
];

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const normalizeServicesText = (value) => {
  if (!value) return "";
  if (Array.isArray(value)) return value.join("\n");
  if (typeof value !== "string") return "";

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter(Boolean).join("\n");
    }
  } catch {
    // fall through to the raw string
  }

  return value;
};

const ClinicPageSettingsPage = () => {
  const { user } = useAuth();
  const { lang, isRtl } = useLanguage();
  const isAr = lang === "ar";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [clinic, setClinic] = useState(null);
  const [form, setForm] = useState({
    name: "",
    subdomain: "",
    logoUrl: "",
    clinicImageUrl: "",
    address: "",
    phoneNumber: "",
    primaryColor: "#2563eb",
    doctorName: "",
    specialty: "",
    description: "",
    doctorImageUrl: "",
    workingHours: "",
    servicesText: "",
    isPublicPageEnabled: true,
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await clinicService.getAll();
        const tenantId = user?.tenantId || localStorage.getItem("clinicflow_tenantId");
        const current = (res.data || []).find((item) => String(item.id) === String(tenantId));
        setClinic(current || null);
        setForm({
          name: current?.name || "",
          subdomain: current?.subdomain || "",
          logoUrl: current?.logoUrl || "",
          clinicImageUrl: current?.clinicImageUrl || "",
          address: current?.address || "",
          phoneNumber: current?.phoneNumber || "",
          primaryColor: current?.primaryColor || "#2563eb",
          doctorName: current?.doctorName || "",
          specialty: current?.specialty || "",
          description: current?.description || "",
          doctorImageUrl: current?.doctorImageUrl || "",
          workingHours: current?.workingHours || "",
          servicesText: normalizeServicesText(current?.services),
          isPublicPageEnabled: current?.isPublicPageEnabled ?? true,
        });
      } catch (err) {
        toast.error(isAr ? "تعذر تحميل إعدادات الصفحة." : "Failed to load page settings.");
      } finally {
        setLoading(false);
      }
    };

    if (user?.tenantId || localStorage.getItem("clinicflow_tenantId")) {
      load();
    } else {
      setLoading(false);
    }
  }, [user?.tenantId, isAr]);

  const landingLink = useMemo(() => {
    const slug = form.subdomain || clinic?.subdomain || "";
    if (!slug) return "";
    return `${window.location.origin}/clinic/${encodeURIComponent(slug)}`;
  }, [clinic?.subdomain, form.subdomain]);

  const bookingLink = useMemo(() => {
    const slug = form.subdomain || clinic?.subdomain || "";
    if (!slug) return "";
    return `${window.location.origin}/book-guest?clinic=${encodeURIComponent(slug)}`;
  }, [clinic?.subdomain, form.subdomain]);

  const previewServices = useMemo(
    () =>
      form.servicesText
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean),
    [form.servicesText]
  );

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleColorChange = (value) => handleChange("primaryColor", value);

  const handleFileChange = async (field, file) => {
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      handleChange(field, dataUrl);
    } catch {
      toast.error(isAr ? "تعذر قراءة الملف." : "Could not read the file.");
    }
  };

  const copyLink = async () => {
    if (!landingLink) return;
    try {
      await navigator.clipboard.writeText(landingLink);
      toast.success(isAr ? "تم نسخ رابط الصفحة العامة" : "Landing page link copied");
    } catch {
      toast.error(isAr ? "تعذر نسخ الرابط" : "Could not copy link");
    }
  };

  const save = async () => {
    setSaving(true);
    const tid = toast.loading(isAr ? "جارٍ حفظ التحديثات..." : "Saving changes...");
    try {
      const payload = {
        name: form.name,
        subdomain: form.subdomain,
        logoUrl: form.logoUrl,
        clinicImageUrl: form.clinicImageUrl,
        address: form.address,
        phoneNumber: form.phoneNumber,
        primaryColor: form.primaryColor,
        doctorName: form.doctorName,
        specialty: form.specialty,
        description: form.description,
        doctorImageUrl: form.doctorImageUrl,
        workingHours: form.workingHours,
        services: previewServices,
        isPublicPageEnabled: form.isPublicPageEnabled,
      };

      const res = await clinicService.updateMyPage(payload);
      const updated = res.data;
      setClinic(updated);
      setForm((prev) => ({
        ...prev,
        name: updated.name || prev.name,
        subdomain: updated.subdomain || prev.subdomain,
        logoUrl: updated.logoUrl || prev.logoUrl,
        clinicImageUrl: updated.clinicImageUrl || prev.clinicImageUrl,
        address: updated.address || prev.address,
        phoneNumber: updated.phoneNumber || prev.phoneNumber,
        primaryColor: updated.primaryColor || prev.primaryColor,
        doctorName: updated.doctorName || prev.doctorName,
        specialty: updated.specialty || prev.specialty,
        description: updated.description || prev.description,
        doctorImageUrl: updated.doctorImageUrl || prev.doctorImageUrl,
        workingHours: updated.workingHours || prev.workingHours,
        servicesText: normalizeServicesText(updated.services) || prev.servicesText,
        isPublicPageEnabled: updated.isPublicPageEnabled ?? prev.isPublicPageEnabled,
      }));
      toast.success(isAr ? "تم حفظ الصفحة بنجاح" : "Public page updated", { id: tid });
    } catch (err) {
      toast.error(err.response?.data?.message || (isAr ? "فشل حفظ التغييرات" : "Failed to save changes"), { id: tid });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout title={isAr ? "إعدادات الصفحة العامة" : "Clinic Page Settings"}>
      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]" dir={isRtl ? "rtl" : "ltr"}>
        <div className="space-y-6">
          <div className="rounded-[2.5rem] border border-outline bg-surface p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                  {isAr ? "الصفحة العامة" : "Public page"}
                </p>
                <h1 className="mt-2 text-3xl sm:text-4xl font-black text-on-surface font-headline">
                  {isAr ? "إدارة صفحة العيادة" : "Manage your clinic landing page"}
                </h1>
              </div>
              <button
                onClick={copyLink}
                disabled={!landingLink}
                className="inline-flex items-center gap-2 rounded-2xl border border-outline bg-surface-alt px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-on-surface-variant disabled:opacity-50"
              >
                <Copy className="w-4 h-4" />
                {isAr ? "نسخ رابط الصفحة" : "Copy landing link"}
              </button>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.16em] transition-all ${
                    activeTab === tab.id
                      ? "bg-primary text-white shadow-lg shadow-primary/20"
                      : "bg-surface-alt text-on-surface-variant border border-outline"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="rounded-[2.5rem] border border-outline bg-surface p-8 shadow-sm">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="mt-4 text-sm font-bold text-slate-500">{isAr ? "جارٍ تحميل البيانات..." : "Loading..."}</p>
            </div>
          ) : (
            <div className="rounded-[2.5rem] border border-outline bg-surface p-6 sm:p-8 shadow-sm">
              {activeTab === "general" && (
                <div className="grid gap-5 sm:grid-cols-2">
                  {[
                    { field: "name", label: isAr ? "اسم العيادة" : "Clinic name", icon: <Building2 className="w-4 h-4" /> },
                    { field: "subdomain", label: isAr ? "الاسم المختصر" : "Subdomain", icon: <Sparkles className="w-4 h-4" /> },
                    { field: "doctorName", label: isAr ? "اسم الطبيب" : "Doctor name", icon: <UserRound className="w-4 h-4" /> },
                    { field: "specialty", label: isAr ? "التخصص" : "Specialty", icon: <Stethoscope className="w-4 h-4" /> },
                    { field: "phoneNumber", label: isAr ? "الهاتف" : "Phone", icon: <Phone className="w-4 h-4" /> },
                    { field: "address", label: isAr ? "العنوان" : "Address", icon: <MapPin className="w-4 h-4" /> },
                  ].map((item) => (
                    <label key={item.field} className={`space-y-2 ${item.field === "description" ? "sm:col-span-2" : ""}`}>
                      <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                        {item.label}
                      </span>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">
                          {item.icon}
                        </div>
                        <input
                          value={form[item.field]}
                          onChange={(e) => handleChange(item.field, e.target.value)}
                          className="w-full rounded-2xl border border-outline bg-surface-alt py-4 pl-11 pr-4 text-sm font-bold text-on-surface outline-none focus:border-primary"
                        />
                      </div>
                    </label>
                  ))}

                  <label className="sm:col-span-2 space-y-2">
                    <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                      {isAr ? "الوصف" : "Description"}
                    </span>
                    <textarea
                      rows={5}
                      value={form.description}
                      onChange={(e) => handleChange("description", e.target.value)}
                      className="w-full rounded-2xl border border-outline bg-surface-alt p-4 text-sm font-medium text-on-surface outline-none focus:border-primary"
                    />
                  </label>
                </div>
              )}

              {activeTab === "media" && (
                <div className="grid gap-5 sm:grid-cols-2">
                  {[
                    { field: "logoUrl", label: isAr ? "اللوجو" : "Logo" },
                    { field: "clinicImageUrl", label: isAr ? "صورة العيادة" : "Clinic image" },
                    { field: "doctorImageUrl", label: isAr ? "صورة الطبيب" : "Doctor image" },
                  ].map((item) => (
                    <div key={item.field} className="rounded-[1.75rem] border border-outline bg-surface-alt p-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-black text-on-surface">{item.label}</h3>
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-outline bg-white px-3 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-on-surface-variant">
                          <ImagePlus className="h-4 w-4" />
                          {isAr ? "رفع" : "Upload"}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleFileChange(item.field, e.target.files?.[0])}
                          />
                        </label>
                      </div>

                      <input
                        value={form[item.field]}
                        onChange={(e) => handleChange(item.field, e.target.value)}
                        placeholder="https://..."
                        className="w-full rounded-2xl border border-outline bg-white px-4 py-3 text-sm font-medium text-on-surface outline-none focus:border-primary"
                      />

                      <div className="overflow-hidden rounded-2xl border border-outline bg-white">
                        {form[item.field] ? (
                          <img
                            src={getFileUrl(form[item.field])}
                            alt={item.label}
                            className="h-44 w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-44 items-center justify-center text-slate-300">
                            <ImagePlus className="h-10 w-10" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "booking" && (
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="sm:col-span-2 space-y-2">
                    <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                      {isAr ? "ساعات العمل" : "Working hours"}
                    </span>
                    <input
                      value={form.workingHours}
                      onChange={(e) => handleChange("workingHours", e.target.value)}
                      placeholder={isAr ? "مثال: السبت - الخميس 10ص - 8م" : "e.g. Sat-Thu 10 AM - 8 PM"}
                      className="w-full rounded-2xl border border-outline bg-surface-alt px-4 py-4 text-sm font-medium text-on-surface outline-none focus:border-primary"
                    />
                  </label>

                  <label className="sm:col-span-2 space-y-2">
                    <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                      {isAr ? "الخدمات" : "Services"}
                    </span>
                    <textarea
                      rows={7}
                      value={form.servicesText}
                      onChange={(e) => handleChange("servicesText", e.target.value)}
                      placeholder={isAr ? "اكتب خدمة في كل سطر" : "Write one service per line"}
                      className="w-full rounded-2xl border border-outline bg-surface-alt p-4 text-sm font-medium text-on-surface outline-none focus:border-primary"
                    />
                  </label>

                  <div className="sm:col-span-2 rounded-[1.75rem] border border-outline bg-surface-alt p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{isAr ? "رابط الصفحة" : "Landing page link"}</p>
                        <p className="mt-1 break-all text-sm font-bold text-on-surface">{landingLink || "-"}</p>
                      </div>
                      <button
                        onClick={copyLink}
                        disabled={!landingLink}
                        className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-white disabled:opacity-50"
                      >
                        <Copy className="h-4 w-4" />
                        {isAr ? "نسخ" : "Copy"}
                      </button>
                    </div>
                  </div>

                  <label className="sm:col-span-2 flex items-center justify-between rounded-[1.75rem] border border-outline bg-surface-alt p-5">
                    <div>
                      <p className="text-sm font-black text-on-surface">{isAr ? "تفعيل الصفحة العامة" : "Enable public page"}</p>
                      <p className="mt-1 text-xs font-medium text-slate-500">
                        {isAr ? "إذا أوقفتها فلن تظهر الصفحة للمرضى." : "When disabled, patients will not see the public page."}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleChange("isPublicPageEnabled", !form.isPublicPageEnabled)}
                      className={`relative inline-flex h-8 w-14 items-center rounded-full transition-all ${form.isPublicPageEnabled ? "bg-primary" : "bg-slate-300"}`}
                    >
                      <span
                        className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${form.isPublicPageEnabled ? "translate-x-7" : "translate-x-1"}`}
                      />
                    </button>
                  </label>
                </div>
              )}

              <div className="mt-8 flex items-center justify-end">
                <button
                  onClick={save}
                  disabled={saving || loading}
                  className="inline-flex items-center gap-3 rounded-2xl bg-primary px-6 py-4 text-xs font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-primary/20 disabled:opacity-60"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {isAr ? "حفظ التغييرات" : "Save changes"}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="sticky top-6 rounded-[2.5rem] border border-outline bg-surface p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Eye className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                  {isAr ? "معاينة مباشرة" : "Live preview"}
                </p>
                <h2 className="text-xl font-black text-on-surface">{form.doctorName || form.name || clinic?.name || "-"}</h2>
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-lg">
              <div className="h-32" style={{ background: `linear-gradient(135deg, ${form.primaryColor}22, rgba(15, 23, 42, 0.04))` }} />
              <div className="px-5 pb-5">
                <div className="-mt-10 inline-flex h-20 w-20 items-center justify-center overflow-hidden rounded-[1.5rem] border-4 border-white bg-slate-100 shadow-xl">
                  {form.doctorImageUrl ? (
                    <img src={getFileUrl(form.doctorImageUrl)} alt={form.doctorName || form.name} className="h-full w-full object-cover" />
                  ) : (
                    <UserRound className="h-9 w-9 text-slate-300" />
                  )}
                </div>

                <h3 className="mt-4 text-2xl font-black text-slate-900">{form.doctorName || form.name || "-"}</h3>
                <p className="mt-1 text-sm font-bold" style={{ color: form.primaryColor }}>
                  {form.specialty || (isAr ? "التخصص غير محدد" : "No specialty")}
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {form.description || (isAr ? "الوصف سيظهر هنا بعد التعديل." : "The description will appear here once updated.")}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {previewServices.slice(0, 4).map((service, index) => (
                    <span
                      key={`${service}-${index}`}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-700"
                    >
                      {service}
                    </span>
                  ))}
                </div>

                <div className="mt-5 space-y-3 rounded-[1.5rem] bg-slate-950 p-4 text-white">
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-blue-300" />
                    <span className="text-sm font-medium">{form.phoneNumber || "-"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-blue-300" />
                    <span className="text-sm font-medium">{form.address || "-"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock3 className="h-4 w-4 text-blue-300" />
                    <span className="text-sm font-medium">{form.workingHours || "-"}</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => window.open(landingLink, "_blank", "noopener,noreferrer")}
              disabled={!landingLink}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-outline bg-surface-alt px-5 py-4 text-xs font-black uppercase tracking-[0.18em] text-on-surface disabled:opacity-50"
            >
              <ArrowRight className="h-4 w-4" />
              {isAr ? "فتح الصفحة العامة" : "Open landing page"}
            </button>
            <button
              onClick={() => window.open(bookingLink, "_blank", "noopener,noreferrer")}
              disabled={!bookingLink}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-outline bg-white px-5 py-4 text-xs font-black uppercase tracking-[0.18em] text-on-surface-variant disabled:opacity-50"
            >
              <ArrowRight className="h-4 w-4" />
              {isAr ? "فتح رابط الحجز" : "Open booking link"}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ClinicPageSettingsPage;


