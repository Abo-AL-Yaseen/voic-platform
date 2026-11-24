import { msg, type Lang } from "../i18n";
export function inquiryStatus(status: string, lang: Lang) {
  const labels: Record<string, { ar: string; en: string }> = {
    draft: { ar: "مسودة", en: "Draft" },
    submitted: { ar: "مرسل للمراجعة", en: "Submitted for review" },
    under_review: { ar: "قيد المراجعة", en: "Under review" },
    awaiting_customer: { ar: "بانتظار معلومات العميل", en: "Needs customer information" },
    responded: { ar: "تم الرد", en: "Responded" },
    closed: { ar: "مغلق", en: "Closed" },
    cancelled: { ar: "ملغى", en: "Cancelled" },
  };
  return msg(lang, labels[status] || { ar: "حالة غير متاحة", en: "Status unavailable" });
}
