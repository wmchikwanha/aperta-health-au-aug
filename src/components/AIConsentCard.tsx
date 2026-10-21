import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck, ShieldOff, ShieldQuestion } from "lucide-react";
import { toast } from "sonner";

export type AIConsentStatus = "granted" | "declined" | "unknown" | "loading";

// Plain-language AI processing consent (Privacy Act APP5/APP8). Read aloud or interpreted to the patient.
export const AI_CONSENT_TEXT: Record<string, { label: string; dir?: "rtl"; text: string }> = {
  en: { label: "English", text: "This service uses a computer program (AI) to help your clinician write notes. What you say is sent, with names and contact details removed, to an outside company (Google) that may process it outside Australia. The AI can make mistakes. Your clinician always checks everything. You can say no and still receive the same care." },
  ar: { label: "العربية", dir: "rtl", text: "تستخدم هذه الخدمة برنامجًا حاسوبيًا (الذكاء الاصطناعي) لمساعدة طبيبك في كتابة الملاحظات. يُرسل ما تقوله، بعد حذف الأسماء وبيانات الاتصال، إلى شركة خارجية (Google) قد تعالجه خارج أستراليا. قد يخطئ الذكاء الاصطناعي. يراجع طبيبك كل شيء دائمًا. يمكنك الرفض وستحصل على نفس الرعاية." },
  fa: { label: "دری / فارسی", dir: "rtl", text: "این خدمت از یک برنامه کامپیوتری (هوش مصنوعی) برای کمک به داکتر شما در نوشتن یادداشت‌ها استفاده می‌کند. آنچه می‌گویید، بدون نام و مشخصات تماس، به یک شرکت خارجی (Google) فرستاده می‌شود که ممکن است آن را بیرون از استرالیا پردازش کند. هوش مصنوعی ممکن است اشتباه کند. داکتر شما همیشه همه چیز را بررسی می‌کند. می‌توانید نه بگویید و همان مراقبت را دریافت کنید." },
  ps: { label: "پښتو", dir: "rtl", text: "دا خدمت د کمپیوټر پروګرام (مصنوعي ځیرکتیا) کاروي ترڅو ستاسو ډاکټر سره د یادښتونو په لیکلو کې مرسته وکړي. هغه څه چې تاسو یې وایئ، له نومونو او د اړیکې معلوماتو پرته، یوې بهرنۍ شرکت (Google) ته لیږل کیږي چې ښايي له آسټرالیا بهر یې پروسس کړي. مصنوعي ځیرکتیا ښايي تېروتنه وکړي. ستاسو ډاکټر تل هرڅه ګوري. تاسو کولی شئ نه ووایئ او بیا هم ورته پاملرنه ترلاسه کړئ." },
  ur: { label: "اردو", dir: "rtl", text: "یہ سروس آپ کے معالج کو نوٹس لکھنے میں مدد کے لیے ایک کمپیوٹر پروگرام (اے آئی) استعمال کرتی ہے۔ آپ جو کہتے ہیں وہ نام اور رابطے کی تفصیلات ہٹا کر ایک بیرونی کمپنی (Google) کو بھیجا جاتا ہے جو اسے آسٹریلیا سے باہر پراسیس کر سکتی ہے۔ اے آئی غلطی کر سکتا ہے۔ آپ کا معالج ہمیشہ سب کچھ چیک کرتا ہے۔ آپ انکار کر سکتے ہیں اور پھر بھی وہی علاج حاصل کریں گے۔" },
  sw: { label: "Kiswahili", text: "Huduma hii inatumia programu ya kompyuta (AI) kumsaidia mhudumu wako kuandika maelezo. Unachosema kinatumwa, bila majina wala mawasiliano, kwa kampuni ya nje (Google) ambayo inaweza kukichakata nje ya Australia. AI inaweza kukosea. Mhudumu wako huangalia kila kitu. Unaweza kukataa na bado ukapata huduma ileile." },
  vi: { label: "Tiếng Việt", text: "Dịch vụ này dùng chương trình máy tính (AI) để giúp bác sĩ viết ghi chú. Những gì bạn nói sẽ được gửi, sau khi xoá tên và thông tin liên lạc, đến một công ty bên ngoài (Google) có thể xử lý ngoài nước Úc. AI có thể sai. Bác sĩ luôn kiểm tra mọi thứ. Bạn có thể từ chối và vẫn được chăm sóc như nhau." },
  ta: { label: "தமிழ்", text: "இந்தச் சேவை உங்கள் மருத்துவர் குறிப்புகள் எழுத உதவ ஒரு கணினி நிரலை (AI) பயன்படுத்துகிறது. நீங்கள் சொல்வது பெயர்கள் மற்றும் தொடர்பு விவரங்கள் நீக்கப்பட்டு, ஆஸ்திரேலியாவுக்கு வெளியே செயலாக்கக்கூடிய வெளி நிறுவனத்திற்கு (Google) அனுப்பப்படும். AI தவறு செய்யலாம். உங்கள் மருத்துவர் எப்போதும் அனைத்தையும் சரிபார்ப்பார். நீங்கள் மறுக்கலாம், அதே சிகிச்சையைப் பெறுவீர்கள்." },
  my: { label: "မြန်မာ", text: "ဤဝန်ဆောင်မှုသည် သင့်ဆရာဝန် မှတ်စုရေးရာတွင် ကူညီရန် ကွန်ပျူတာပရိုဂရမ် (AI) ကို အသုံးပြုသည်။ သင်ပြောသည်များကို အမည်နှင့် ဆက်သွယ်ရန်အချက်အလက်များ ဖယ်ရှားပြီး ဩစတြေးလျပြင်ပတွင် လုပ်ဆောင်နိုင်သည့် ပြင်ပကုမ္ပဏီ (Google) သို့ ပို့သည်။ AI မှားနိုင်သည်။ သင့်ဆရာဝန်က အမြဲစစ်ဆေးသည်။ သင် ငြင်းဆိုနိုင်ပြီး တူညီသော စောင့်ရှောက်မှုကို ရရှိမည်။" },
  ti: { label: "ትግርኛ", text: "እዚ ኣገልግሎት ንሓኪምካ ማስታወሻ ንምጽሓፍ ዝሕግዝ ናይ ኮምፒተር ፕሮግራም (AI) ይጥቀም። ዝበልካዮ፡ ኣስማትን ናይ ርክብ ሓበሬታን ተኣልዩ፡ ናብ ወጻኢ ኩባንያ (Google) ይለኣኽ፡ ካብ ኣውስትራልያ ወጻኢ ክሰርሖ ይኽእል። AI ክጋገ ይኽእል። ሓኪምካ ኩሉ ግዜ ኩሉ ይርኢ። ክትኣቢ ትኽእል ከምኡ'ውን ተመሳሳሊ ክንክን ክትረክብ ኢኻ።" },
};

export function useAIConsent(patientId: string | null) {
  const [status, setStatus] = useState<AIConsentStatus>("loading");
  const refresh = async () => {
    if (!patientId) return setStatus("unknown");
    const { data } = await supabase.from("consents").select("status").eq("patient_id", patientId)
      .eq("consent_type", "ai_processing_consent").order("created_at", { ascending: false }).limit(1).maybeSingle();
    setStatus(!data ? "unknown" : data.status === "active" ? "granted" : "declined");
  };
  useEffect(() => { setStatus("loading"); refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [patientId]);
  return { status, refresh };
}

export function AIConsentCard({ patientId, languagePreference, onStatusChange }: { patientId: string; languagePreference?: string | null; onStatusChange?: (s: AIConsentStatus) => void }) {
  const { user } = useAuth();
  const { status, refresh } = useAIConsent(patientId);
  const [lang, setLang] = useState(languagePreference && AI_CONSENT_TEXT[languagePreference] ? languagePreference : "en");
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => { onStatusChange?.(status); }, [status, onStatusChange]);

  const record = async (granted: boolean) => {
    if (!user) return;
    setSaving(true);
    if (granted === false && status === "granted") {
      await supabase.from("consents").update({ status: "withdrawn", withdrawn_at: new Date().toISOString(), withdrawal_reason: "patient opted out" })
        .eq("patient_id", patientId).eq("consent_type", "ai_processing_consent").eq("status", "active");
    }
    const now = new Date().toISOString();
    const { error } = await supabase.from("consents").insert({
      patient_id: patientId, recorded_by: user.id, consent_type: "ai_processing_consent", consent_version: "1.0-batch4",
      method: "verbal", language_code: lang, fhir_scope: "patient-privacy",
      status: granted ? "active" : "withdrawn", consented_at: now,
      withdrawn_at: granted ? null : now, withdrawal_reason: granted ? null : "declined at presentation",
    });
    if (!error) await supabase.from("audit_events").insert({
      actor_id: user.id, actor_role: "clinician", action: granted ? "ai_consent_granted" : "ai_consent_declined", outcome: "success",
      resource_type: "consent", patient_id: patientId, description: `AI processing consent ${granted ? "granted" : "declined"} (${lang})`, source: "AIConsentCard",
    });
    setSaving(false);
    if (error) return toast.error("Could not save consent: " + error.message);
    toast.success(granted ? "AI processing consent recorded" : "Patient declined AI — manual documentation only");
    setOpen(false);
    refresh();
  };

  if (status === "loading") return null;
  const t = AI_CONSENT_TEXT[lang];
  const showForm = status === "unknown" || open;

  return (
    <Card className={status === "declined" ? "border-destructive/50" : status === "granted" ? "border-primary/30" : "border-warning/60"}>
      <CardContent className="py-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            {status === "granted" ? <ShieldCheck className="h-5 w-5 text-primary" /> : status === "declined" ? <ShieldOff className="h-5 w-5 text-destructive" /> : <ShieldQuestion className="h-5 w-5 text-warning" />}
            <span className="font-medium">AI processing consent</span>
            <Badge variant={status === "granted" ? "default" : status === "declined" ? "destructive" : "secondary"}>
              {status === "granted" ? "Granted" : status === "declined" ? "Declined — AI off" : "Not yet asked"}
            </Badge>
          </div>
          {!showForm && <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>{status === "granted" ? "Withdraw / review" : "Ask again"}</Button>}
        </div>
        {status === "declined" && !open && <p className="text-sm text-muted-foreground">AI features are switched off for this patient. Write notes manually; care is not affected.</p>}
        {showForm && (
          <>
            <Select value={lang} onValueChange={setLang}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(AI_CONSENT_TEXT).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
            </Select>
            <p dir={t.dir} className="text-sm leading-relaxed bg-muted/50 rounded p-3">{t.text}</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={saving} onClick={() => record(true)}>Patient agrees</Button>
              <Button size="sm" variant="outline" disabled={saving} onClick={() => record(false)}>Patient declines</Button>
              {open && <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
