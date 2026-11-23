import type { InquiryFields, InquiryItem, SaveInquiry } from "../services/inquiries";
export function inquiryPayload(
  revision: number,
  lang: "ar" | "en",
  fields: InquiryFields,
  items: InquiryItem[],
): SaveInquiry {
  return {
    revision,
    lang,
    fields: { ...fields, company: fields.kind === "individual" ? "" : fields.company },
    items: items.map((i) => ({
      productId: i.productId,
      packageId: i.packageId,
      quantity: i.quantity,
      unit: i.packageId ? "packages" : i.quantity == null ? null : i.unit,
      requirements: i.requirements,
    })),
  };
}
