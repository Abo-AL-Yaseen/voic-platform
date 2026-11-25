import { useState } from "react";
import AppLink from "../components/AppLink";
import Modal from "../Modal";
import { StaffLayout } from "../components/WorkspaceLayouts";
import { RecordPager } from "../components/InquiryConversation";
import { TextField, TextAreaField, SelectField } from "../components/FormFields";
import { useAuth, useLogout } from "../hooks/auth/queries";
import {
  useEditorialList,
  useEditorialDetail,
  useEditorialMetadata,
  useEditorialMutation,
  useMedia,
  useMediaUsage,
  editorialFailure,
} from "../hooks/editorial/queries";
import {
  editorialBase,
  mediaPreview,
  type Body,
  type ContentKind,
  type EditorialRecord,
  type Media,
} from "../services/editorial";
import { pick, withLang, type Lang } from "../i18n";
const names: Record<string, [string, string]> = {
  products: ["المنتجات", "Products"],
  categories: ["الفئات", "Categories"],
  uses: ["الاستخدامات", "Uses"],
  recipes: ["الوصفات", "Recipes"],
  pages: ["محتوى الصفحات", "Page content"],
  media: ["الوسائط", "Media"],
};
const label = (kind: string, lang: Lang) => names[kind]?.[lang === "ar" ? 0 : 1] || kind;
const route = (kind: string) => (kind === "pages" ? "content" : kind);
const initial = (kind: ContentKind): Body =>
  kind === "products"
    ? {
        id: "",
        slug: "",
        nameAr: "",
        nameEn: "",
        descriptionAr: "",
        descriptionEn: "",
        ingredientsAr: null,
        ingredientsEn: null,
        ingredientsApproved: false,
        brandKey: "",
        categoryKey: "",
        useKeys: [],
        displayUseKeys: [],
        referenceOrder: 100,
        featuredOrder: null,
        image: null,
        packages: [],
      }
    : kind === "recipes"
      ? {
          id: "",
          slug: "",
          titleAr: "",
          titleEn: "",
          category: "sweets-baking",
          descriptionAr: "",
          descriptionEn: "",
          productIds: [],
          image: "",
          ingredients: [],
          stepsAr: [""],
          stepsEn: [""],
        }
      : { id: "", slug: "", ar: "", en: "" };
type Props = { lang: Lang; go: (href: string) => void; path: string; search: string };
export function ContentDashboard({ lang, go }: { lang: Lang; go: Props["go"] }) {
  return (
    <>
      <h1>{pick(lang, "إدارة المحتوى", "Content management")}</h1>
      <p>
        {pick(
          lang,
          "مسودات ومراجعة ونشر بإذن المسؤول. دليل العملاء العام للموظفين غير متصل.",
          "Drafts, review and administrator publication. The general staff customer directory remains disconnected.",
        )}
      </p>
      <div className="staff-overview-grid">
        {Object.keys(names).map((k) => (
          <AppLink
            key={k}
            go={go}
            className="staff-overview-link"
            href={withLang(`/staff/${route(k)}`, lang)}
          >
            {label(k, lang)}
          </AppLink>
        ))}
      </div>
    </>
  );
}
export default function EditorialWorkspace({ lang, go, path, search }: Props) {
  const logout = useLogout();
  const parts = path.split("/"),
    kind = (parts[2] === "content" ? "pages" : parts[2]) as ContentKind | "media",
    id = parts[3] || "";
  return (
    <StaffLayout lang={lang} go={go} active={`/staff/${route(kind)}`}>
      <div className="page-actions">
        <button
          className="text-link"
          onClick={async () => {
            try {
              await logout.mutateAsync();
              go(withLang("/login", lang));
            } catch {}
          }}
        >
          {pick(lang, "تسجيل الخروج", "Log out")}
        </button>
        <AppLink go={go} href={withLang("/staff", lang)}>
          {pick(lang, "لوحة الموظفين", "Staff dashboard")}
        </AppLink>
      </div>
      <header className="workspace-page-heading">
        <div>
          <p className="eyebrow">VOIC</p>
          <h1>{label(kind, lang)}</h1>
          <p>
            {pick(
              lang,
              "الحفظ ينشئ مسودة؛ النسخة المنشورة تتغير فقط بإجراء نشر صريح.",
              "Saving creates a draft; the published revision changes only through explicit publication.",
            )}
          </p>
        </div>
      </header>
      {kind === "media" ? (
        <MediaLibrary lang={lang} />
      ) : id ? (
        <EditorRoute key={`${kind}:${id}`} kind={kind} id={id} lang={lang} go={go} />
      ) : (
        <EditorialList key={kind + search} kind={kind} lang={lang} go={go} search={search} />
      )}
    </StaffLayout>
  );
}
function EditorialList({
  kind,
  lang,
  go,
  search,
}: {
  kind: ContentKind;
  lang: Lang;
  go: Props["go"];
  search: string;
}) {
  const p = new URLSearchParams(search),
    filters = {
      q: p.get("q") || "",
      status: p.get("status") || "",
      page: Number(p.get("page") || 1),
      pageSize: 10,
    },
    q = useEditorialList(kind, filters);
  const [searchText, setSearchText] = useState(filters.q),
    [status, setStatus] = useState(filters.status);
  const navigate = (page = 1) =>
    go(
      withLang(
        `/staff/${route(kind)}?${new URLSearchParams({ q: searchText, status, page: String(page) })}`,
        lang,
      ),
    );
  return (
    <>
      <div className="page-actions">
        {kind !== "pages" && (
          <AppLink
            className="button button-primary"
            go={go}
            href={withLang(`/staff/${route(kind)}/new`, lang)}
          >
            {pick(lang, "إنشاء مسودة", "Create draft")}
          </AppLink>
        )}
        <button className="button button-secondary" onClick={() => q.refetch()}>
          {pick(lang, "تحديث", "Refresh")}
        </button>
      </div>
      <form
        className="list-toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          navigate();
        }}
      >
        <TextField
          label={pick(lang, "ابحث بالمعرف أو الرابط", "Search ID or slug")}
          value={searchText}
          maxLength={100}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <SelectField
          label={pick(lang, "حالة التحرير", "Editorial state")}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {[
            ["", "الكل", "All"],
            ["draft", "مسودة", "Draft"],
            ["review", "بانتظار المراجعة", "In review"],
            ["published", "منشور", "Published"],
            ["archived", "مؤرشف", "Archived"],
          ].map(([v, ar, en]) => (
            <option key={v} value={v}>
              {pick(lang, ar, en)}
            </option>
          ))}
        </SelectField>
        <button className="button button-secondary">{pick(lang, "تطبيق", "Apply")}</button>
      </form>
      {q.isPending ? (
        <p role="status">{pick(lang, "جارٍ التحميل…", "Loading…")}</p>
      ) : q.error ? (
        <div role="alert">
          <p>{editorialFailure(q.error, lang)}</p>
          <button onClick={() => q.refetch()}>{pick(lang, "إعادة المحاولة", "Retry")}</button>
        </div>
      ) : (
        q.data && (
          <>
            <p>
              <bdi>{q.data.total}</bdi> {pick(lang, "نتيجة", "results")}
            </p>
            {!q.data.items.length ? (
              <p>{pick(lang, "لا توجد سجلات تطابق البحث.", "No records match this search.")}</p>
            ) : (
              <div className="responsive-table">
                <table className="data-table">
                  <thead>
                    <tr>
                      {[
                        pick(lang, "المعرف", "ID"),
                        pick(lang, "النسخة", "Version"),
                        pick(lang, "الحالة", "State"),
                      ].map((x) => (
                        <th key={x}>{x}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {q.data.items.map((i) => (
                      <tr key={i.id}>
                        <td>
                          <AppLink go={go} href={withLang(`/staff/${route(kind)}/${i.id}`, lang)}>
                            <bdi>{i.id}</bdi>
                          </AppLink>
                        </td>
                        <td>{i.version}</td>
                        <td>
                          {i.archived
                            ? pick(lang, "مؤرشف", "Archived")
                            : i.review
                              ? pick(lang, "بانتظار المراجعة", "In review")
                              : i.changed
                                ? pick(lang, "مسودة غير منشورة", "Unpublished draft")
                                : pick(lang, "منشور", "Published")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <RecordPager info={q.data} lang={lang} onPage={navigate} />
          </>
        )
      )}
    </>
  );
}
function EditorRoute({
  kind,
  id,
  lang,
  go,
}: {
  kind: ContentKind;
  id: string;
  lang: Lang;
  go: Props["go"];
}) {
  const q = useEditorialDetail(kind, id),
    meta = useEditorialMetadata();
  if (meta.isPending || (id !== "new" && q.isPending))
    return <p role="status">{pick(lang, "جارٍ التحميل…", "Loading…")}</p>;
  if (meta.error || (id !== "new" && q.error))
    return (
      <div role="alert">
        <p>{editorialFailure(meta.error || q.error, lang)}</p>
        <button
          onClick={() => {
            q.refetch();
            meta.refetch();
          }}
        >
          {pick(lang, "إعادة المحاولة", "Retry")}
        </button>
      </div>
    );
  return (
    <Editor
      kind={kind}
      id={id}
      lang={lang}
      go={go}
      initial={q.data}
      current={q.data}
      refresh={() => q.refetch()}
      permissions={meta.data!.permissions}
      brands={meta.data!.brands}
    />
  );
}
function Editor({
  kind,
  id,
  lang,
  go,
  initial: record,
  current,
  refresh,
  permissions,
  brands,
}: {
  kind: ContentKind;
  id: string;
  lang: Lang;
  go: Props["go"];
  initial?: EditorialRecord;
  current?: EditorialRecord;
  refresh: () => Promise<any>;
  permissions: { canWrite: boolean; canPublish: boolean };
  brands: { id: string; ar: string; en: string }[];
}) {
  const [body, setBody] = useState<Body>(() =>
      structuredClone(record?.draft.body || initial(kind)),
    ),
    [version, setVersion] = useState(record?.version || 0),
    [saved, setSaved] = useState(() => JSON.stringify(record?.draft.body || initial(kind))),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [preview, setPreview] = useState(false),
    [serverPreview, setServerPreview] = useState(false),
    [confirm, setConfirm] = useState(""),
    [approve, setApprove] = useState(false),
    [legal, setLegal] = useState(false);
  const mutation = useEditorialMutation(),
    pending = mutation.isPending,
    dirty = JSON.stringify(body) !== saved,
    stale = !!current && current.version !== version,
    attempt = useState<{ signature: string; key: string } | null>(null),
    canWrite = permissions.canWrite;
  const act = async (action: string) => {
    const actual = action === "save" && id === "new" ? "create" : action;
    const input: any = {
      version,
      action: actual,
      ...(["save", "create"].includes(actual) ? { body } : {}),
      ...(actual === "publish"
        ? {
            approveForProduction: approve,
            confirmation: approve ? "APPROVE BOTH LOCALES" : undefined,
            legalApproval: legal ? "LEGAL REVIEW COMPLETE" : undefined,
          }
        : {}),
    };
    const signature = JSON.stringify(input),
      key = attempt[0]?.signature === signature ? attempt[0].key : crypto.randomUUID();
    attempt[1]({ signature, key });
    setError("");
    setNotice("");
    setConfirm("");
    try {
      const result = await mutation.mutateAsync({
        kind,
        id: body.id,
        path: `/${kind}/${encodeURIComponent(body.id)}/actions`,
        body: { ...input, key },
      });
      setBody(structuredClone(result.draft.body));
      setSaved(JSON.stringify(result.draft.body));
      setVersion(result.version);
      attempt[1](null);
      setNotice(pick(lang, "تم الحفظ بعد تأكيد الخادم.", "Saved after server confirmation."));
      if (id === "new") go(withLang(`/staff/${route(kind)}/${result.id}`, lang));
    } catch (e) {
      setError(editorialFailure(e, lang));
    }
  };
  const set = (key: string, value: any) => setBody({ ...body, [key]: value });
  return (
    <>
      <div className="editor-state">
        <bdi>
          {body.id || pick(lang, "مسودة جديدة", "New draft")} · {version}
        </bdi>
        {current && (
          <p>
            {pick(lang, "النسخة المنشورة", "Published revision")}:{" "}
            <bdi>{current.published?.number ?? "—"}</bdi> ·{" "}
            {current.approvalScope === "approved"
              ? pick(lang, "اعتماد بشري مسجل", "Human approval recorded")
              : pick(
                  lang,
                  "محتوى تطوير، غير معتمد للإنتاج",
                  "Development content, not production approved",
                )}
          </p>
        )}
      </div>
      {!canWrite && (
        <p role="alert">
          {pick(
            lang,
            "الكتابة غير مفعلة في هذه البيئة أو البريد غير مؤكد.",
            "Writes are disabled in this environment or email is unverified.",
          )}
        </p>
      )}
      {stale && (
        <p role="alert">
          {pick(
            lang,
            "وصلت نسخة أحدث. مدخلاتك محفوظة هنا؛ حدّث وقارن قبل الحفظ.",
            "A newer version arrived. Your input remains here; refresh and compare before saving.",
          )}
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <form
        className="workspace-form editorial-form"
        onSubmit={(e) => {
          e.preventDefault();
          void act("save");
        }}
      >
        <fieldset disabled={pending || !canWrite}>
          <legend>{pick(lang, "حقول المسودة", "Draft fields")}</legend>
          <div className="form-grid">
            <TextField
              label={pick(lang, "المعرف الثابت", "Immutable ID")}
              value={body.id}
              disabled={id !== "new"}
              maxLength={64}
              onChange={(e) => set("id", e.target.value)}
            />
            <TextField
              label={pick(lang, "الرابط الثابت", "Immutable slug")}
              value={body.slug}
              disabled={id !== "new"}
              maxLength={64}
              onChange={(e) => set("slug", e.target.value)}
            />
          </div>
          <BodyFields body={body} set={set} kind={kind} lang={lang} brands={brands} />
        </fieldset>
        <div className="page-actions editorial-actions">
          <button className="button button-primary" disabled={pending || stale || !canWrite}>
            {pick(lang, "حفظ المسودة", "Save draft")}
          </button>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => setPreview(true)}
          >
            {pick(lang, "معاينة المسودة", "Preview draft")}
          </button>
          {id !== "new" && (
            <button
              type="button"
              className="button button-secondary"
              disabled={pending}
              onClick={async () => {
                const r = await refresh();
                if (r.data) {
                  setVersion(r.data.version);
                  setServerPreview(true);
                  setError("");
                  setNotice(
                    pick(
                      lang,
                      "تم التحديث. قارن النسخة الحالية بمدخلاتك قبل الحفظ؛ لم تُستبدل مدخلاتك.",
                      "Refreshed. Compare the current revision with your input before saving; your input was preserved.",
                    ),
                  );
                } else setError(editorialFailure(r.error, lang));
              }}
            >
              {pick(
                lang,
                "تحديث ومقارنة مع الاحتفاظ بالمدخلات",
                "Refresh and compare, keeping input",
              )}
            </button>
          )}
        </div>
      </form>
      {id !== "new" && (
        <section className="workspace-section">
          <h2>{pick(lang, "المراجعة والنشر", "Review and publication")}</h2>
          <p>
            {pick(
              lang,
              "احفظ التغييرات أولًا. يطلب محرر المحتوى المراجعة، وينشر المسؤول النسخة المحددة صراحةً.",
              "Save changes first. Content editors request review; administrators explicitly publish that revision.",
            )}
          </p>
          <div className="page-actions editorial-actions">
            <button
              disabled={pending || dirty || stale || !canWrite}
              className="button button-secondary"
              onClick={() => act("review")}
            >
              {pick(lang, "طلب مراجعة", "Request review")}
            </button>
            {permissions.canPublish && (
              <>
                <button
                  className="button button-primary"
                  disabled={
                    pending || dirty || stale || !canWrite || current?.reviewId !== current?.draftId
                  }
                  onClick={() => setConfirm("publish")}
                >
                  {pick(lang, "اعتماد ونشر", "Approve and publish")}
                </button>
                <button
                  className="button button-secondary"
                  disabled={pending || dirty || stale || !canWrite || !current?.publishedId}
                  onClick={() => setConfirm("unpublish")}
                >
                  {pick(lang, "إلغاء النشر", "Unpublish")}
                </button>
                <button
                  className="button button-secondary"
                  disabled={pending || dirty || stale || !canWrite || current?.archived}
                  onClick={() => setConfirm("archive")}
                >
                  {pick(lang, "أرشفة", "Archive")}
                </button>
              </>
            )}
          </div>
        </section>
      )}
      {preview && (
        <Modal
          title={pick(
            lang,
            "معاينة مسودة خاصة — ليست الصفحة العامة",
            "Private draft preview — not the public page",
          )}
          lang={lang}
          onClose={() => setPreview(false)}
        >
          <DraftPreview body={body} lang={lang} />
        </Modal>
      )}
      {serverPreview && current && (
        <Modal
          title={pick(lang, "النسخة الحالية للمقارنة", "Current revision for comparison")}
          lang={lang}
          onClose={() => setServerPreview(false)}
        >
          <DraftPreview body={current.draft.body} lang={lang} />
          <button
            className="button button-secondary"
            onClick={() => {
              setBody(structuredClone(current.draft.body));
              setSaved(JSON.stringify(current.draft.body));
              setVersion(current.version);
              setServerPreview(false);
            }}
          >
            {pick(
              lang,
              "استبدال مدخلاتي بهذه النسخة بعد المراجعة",
              "Replace my input with this revision after review",
            )}
          </button>
        </Modal>
      )}
      {confirm && (
        <Modal
          title={pick(lang, "تأكيد إجراء النشر", "Confirm publication action")}
          lang={lang}
          onClose={() => setConfirm("")}
        >
          <p>
            {pick(
              lang,
              "سيؤثر هذا الإجراء على المحتوى العام. لا تُنشر مواصفات أو نصوص غير معتمدة.",
              "This action affects public content. Do not publish unapproved facts or text.",
            )}
          </p>
          {confirm === "publish" && (
            <>
              <label className="check-option">
                <input
                  type="checkbox"
                  checked={approve}
                  onChange={(e) => setApprove(e.target.checked)}
                />
                {pick(
                  lang,
                  "أؤكد اعتماد الشركة لكامل النسخة واللغتين للنشر الإنتاجي (اختياري؛ الافتراضي تطوير فقط).",
                  "I confirm company approval of this full revision and both locales for production (optional; development only by default).",
                )}
              </label>
              {kind === "pages" && id === "privacy" && (
                <label className="check-option">
                  <input
                    type="checkbox"
                    checked={legal}
                    onChange={(e) => setLegal(e.target.checked)}
                  />
                  {pick(
                    lang,
                    "اكتملت المراجعة القانونية البشرية.",
                    "Human legal review is complete.",
                  )}
                </label>
              )}
            </>
          )}
          <div className="page-actions">
            <button className="button button-primary" onClick={() => act(confirm)}>
              {pick(lang, "تأكيد الإجراء", "Confirm action")}
            </button>
            <button className="button button-secondary" onClick={() => setConfirm("")}>
              {pick(lang, "إلغاء", "Cancel")}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
function BodyFields({
  body: b,
  set,
  kind,
  lang,
  brands,
}: {
  body: Body;
  set: (k: string, v: any) => void;
  kind: ContentKind;
  lang: Lang;
  brands: { id: string; ar: string; en: string }[];
}) {
  const field = (key: string, ar: string, en: string, multi = false, optional = false) => {
    const Component = multi ? TextAreaField : TextField;
    return (
      <Component
        key={key}
        label={pick(lang, ar, en)}
        value={b[key] ?? ""}
        maxLength={multi ? 6000 : 400}
        onChange={(e: any) => set(key, optional && !e.target.value ? null : e.target.value)}
      />
    );
  };
  if (kind === "categories" || kind === "uses")
    return (
      <div className="form-grid">
        {field("ar", "الاسم العربي", "Arabic name")}
        {field("en", "الاسم الإنجليزي", "English name")}
      </div>
    );
  if (kind === "products")
    return (
      <>
        <div className="form-grid">
          {field("nameAr", "الاسم التجاري بالعربية", "Arabic commercial name")}
          {field("nameEn", "الاسم التجاري بالإنجليزية", "English commercial name")}
          {field("descriptionAr", "الوصف بالعربية", "Arabic description", true)}
          {field("descriptionEn", "الوصف بالإنجليزية", "English description", true)}
          {field(
            "ingredientsAr",
            "المكونات المعروفة بالعربية (اختياري)",
            "Known Arabic ingredients (optional)",
            true,
            true,
          )}
          {field(
            "ingredientsEn",
            "المكونات المعروفة بالإنجليزية (اختياري)",
            "Known English ingredients (optional)",
            true,
            true,
          )}
          <SelectField
            label={pick(lang, "العلامة الرسمية", "Official brand")}
            value={b.brandKey}
            onChange={(e) => set("brandKey", e.target.value)}
          >
            <option value="">{pick(lang, "اختر العلامة", "Select brand")}</option>
            {brands.map((x) => (
              <option key={x.id} value={x.id}>
                {x[lang]}
              </option>
            ))}
          </SelectField>
          {field("categoryKey", "معرف الفئة المنشورة", "Published category ID")}
          <StringList
            label={pick(lang, "معرفات الاستخدامات", "Usage IDs")}
            value={b.useKeys}
            set={(v) => set("useKeys", v)}
            lang={lang}
          />
          <StringList
            label={pick(lang, "معرفات استخدامات العرض", "Display usage IDs")}
            value={b.displayUseKeys}
            set={(v) => set("displayUseKeys", v)}
            lang={lang}
          />
          <TextField
            type="number"
            min={0}
            label={pick(lang, "ترتيب العرض", "Reference order")}
            value={b.referenceOrder}
            onChange={(e) => set("referenceOrder", Number(e.target.value))}
          />
          <TextField
            type="number"
            min={0}
            max={3}
            label={pick(
              lang,
              "ترتيب الرئيسية 0–3 (فارغ لغير المميز)",
              "Homepage order 0–3 (empty for non-featured)",
            )}
            value={b.featuredOrder ?? ""}
            onChange={(e) =>
              set("featuredOrder", e.target.value === "" ? null : Number(e.target.value))
            }
          />
        </div>
        <label className="check-option">
          <input
            type="checkbox"
            checked={b.ingredientsApproved}
            onChange={(e) => set("ingredientsApproved", e.target.checked)}
          />
          {pick(
            lang,
            "المكونات مؤكدة من الشركة وصالحة للمراجعة للنشر باللغتين.",
            "Ingredients are company-confirmed and ready for publication review in both locales.",
          )}
        </label>
        <ImageField value={b.image} set={(v) => set("image", v || null)} lang={lang} />
        <h2>{pick(lang, "خيارات التعبئة", "Package options")}</h2>
        {b.packages.map((p: any, index: number) => (
          <PackageFields
            key={index}
            value={p}
            lang={lang}
            set={(v) =>
              set(
                "packages",
                b.packages.map((x: any, n: number) => (n === index ? v : x)),
              )
            }
          />
        ))}
        <button
          type="button"
          className="button button-secondary"
          onClick={() =>
            set("packages", [
              ...b.packages,
              {
                id: `${b.id || "new"}-p${b.packages.length + 1}`,
                position: b.packages.length,
                sizeKey: "",
                sizeAr: "",
                sizeEn: "",
                amount: null,
                unit: null,
                packagingAr: null,
                packagingEn: null,
                packagingPublished: false,
                published: false,
              },
            ])
          }
        >
          {pick(lang, "إضافة خيار تعبئة", "Add package option")}
        </button>
        <p>
          {pick(
            lang,
            "لا تُحذف الخيارات المسجلة؛ أوقف نشر الخيار للاحتفاظ بالمراجع. لا تحوّل اللتر إلى الكيلوغرام.",
            "Retain registered options; disable an option to preserve references. Never convert liters into kilograms.",
          )}
        </p>
      </>
    );
  if (kind === "recipes")
    return (
      <>
        <div className="form-grid">
          {field("titleAr", "عنوان الوصفة بالعربية", "Arabic recipe title")}
          {field("titleEn", "عنوان الوصفة بالإنجليزية", "English recipe title")}
          {field("descriptionAr", "وصف الوصفة بالعربية", "Arabic recipe description", true)}
          {field("descriptionEn", "وصف الوصفة بالإنجليزية", "English recipe description", true)}
          <SelectField
            label={pick(lang, "فئة الوصفة", "Recipe category")}
            value={b.category}
            onChange={(e) => set("category", e.target.value)}
          >
            <option value="sweets-baking">
              {pick(lang, "حلويات ومخبوزات", "Sweets & baking")}
            </option>
            <option value="main-dishes">{pick(lang, "أطباق رئيسية", "Main dishes")}</option>
          </SelectField>
          <StringList
            label={pick(lang, "معرفات المنتجات المرتبطة", "Linked product IDs")}
            value={b.productIds}
            set={(v) => set("productIds", v)}
            lang={lang}
          />
          {field(
            "knownTimeAr",
            "وقت التحضير المعروف بالعربية (اختياري)",
            "Known Arabic time (optional)",
            true,
            true,
          )}
          {field(
            "knownTimeEn",
            "وقت التحضير المعروف بالإنجليزية (اختياري)",
            "Known English time (optional)",
            true,
            true,
          )}
          <TextField
            type="number"
            label={pick(lang, "درجة الحرارة المعروفة (اختياري)", "Known temperature (optional)")}
            value={b.temperatureC ?? ""}
            onChange={(e) =>
              set("temperatureC", e.target.value === "" ? null : Number(e.target.value))
            }
          />
        </div>
        <ImageField value={b.image} set={(v) => set("image", v)} lang={lang} />
        <h2>{pick(lang, "المكونات المرتبة", "Ordered ingredients")}</h2>
        {b.ingredients.map((i: any, n: number) => (
          <div className="form-grid cms-row" key={n}>
            {["nameAr", "nameEn", "unitAr", "unitEn"].map((k) => (
              <TextField
                key={k}
                label={pick(
                  lang,
                  k === "nameAr"
                    ? "اسم المكون بالعربية"
                    : k === "nameEn"
                      ? "اسم المكون بالإنجليزية"
                      : k === "unitAr"
                        ? "الوحدة بالعربية"
                        : "الوحدة بالإنجليزية",
                  k === "nameAr"
                    ? "Arabic ingredient"
                    : k === "nameEn"
                      ? "English ingredient"
                      : k === "unitAr"
                        ? "Arabic unit"
                        : "English unit",
                )}
                value={i[k] || ""}
                onChange={(e) =>
                  set(
                    "ingredients",
                    b.ingredients.map((x: any, index: number) =>
                      index === n ? { ...x, [k]: e.target.value } : x,
                    ),
                  )
                }
              />
            ))}
            <TextField
              type="number"
              step="any"
              min={0}
              label={pick(
                lang,
                "الكمية المعروفة (فارغ لغير المعروف)",
                "Known amount (empty for unknown)",
              )}
              value={i.amount ?? ""}
              onChange={(e) =>
                set(
                  "ingredients",
                  b.ingredients.map((x: any, index: number) =>
                    index === n
                      ? { ...x, amount: e.target.value === "" ? null : Number(e.target.value) }
                      : x,
                  ),
                )
              }
            />
            <button
              type="button"
              className="text-link"
              onClick={() =>
                set(
                  "ingredients",
                  b.ingredients.filter((_: any, index: number) => index !== n),
                )
              }
            >
              {pick(lang, "إزالة المكون من المسودة", "Remove draft ingredient")}
            </button>
          </div>
        ))}
        <button
          type="button"
          className="button button-secondary"
          onClick={() =>
            set("ingredients", [
              ...b.ingredients,
              { nameAr: "", nameEn: "", unitAr: "", unitEn: "" },
            ])
          }
        >
          {pick(lang, "إضافة مكون", "Add ingredient")}
        </button>
        <StringList
          multiline
          label={pick(lang, "خطوات التحضير بالعربية، بالترتيب", "Arabic method, in order")}
          value={b.stepsAr}
          set={(v) => set("stepsAr", v)}
          lang={lang}
        />
        <StringList
          multiline
          label={pick(lang, "خطوات التحضير بالإنجليزية، بالترتيب", "English method, in order")}
          value={b.stepsEn}
          set={(v) => set("stepsEn", v)}
          lang={lang}
        />
      </>
    );
  return (
    <>
      <p>
        {pick(
          lang,
          "الحقول منظمة ضمن أقسام التصميم الحالي؛ النص عادي ولا يقبل HTML أو JavaScript.",
          "Fields belong to the existing page composition. Plain text only; no HTML or JavaScript.",
        )}
      </p>
      {Object.entries(b.texts).map(([key, pair]: [string, any]) => (
        <div className="form-grid cms-row" key={key}>
          {(["ar", "en"] as const).map((l) => (
            <TextAreaField
              key={l}
              label={`${pick(lang, "نص عربي", "Arabic text")} / ${l === "ar" ? "العربية" : "English"} — ${String(pair[lang]).slice(0, 70)}`}
              value={pair[l]}
              maxLength={6000}
              onChange={(e) =>
                set("texts", { ...b.texts, [key]: { ...pair, [l]: e.target.value } })
              }
            />
          ))}
        </div>
      ))}
      {Object.entries(b.links).map(([k, v]) => (
        <TextField
          key={k}
          label={pick(lang, "رابط أو قناة تواصل", "Link or contact channel") + ` — ${k}`}
          value={v as string}
          onChange={(e) => set("links", { ...b.links, [k]: e.target.value })}
        />
      ))}
      {Object.entries(b.images).map(([k, v]) => (
        <ImageField
          key={k}
          label={k}
          value={v as string}
          set={(v) => set("images", { ...b.images, [k]: v })}
          lang={lang}
        />
      ))}
      {b.rows.map((row: string[], n: number) => (
        <div className="cms-row" key={n}>
          {row.map((value, index) => (
            <TextAreaField
              key={index}
              label={`${pick(lang, "حقل القسم المرتب", "Ordered section field")} ${n + 1}.${index + 1}`}
              value={value}
              onChange={(e) =>
                set(
                  "rows",
                  b.rows.map((r: any, i: number) =>
                    i === n ? r.map((v: any, j: number) => (j === index ? e.target.value : v)) : r,
                  ),
                )
              }
            />
          ))}
        </div>
      ))}
      {!!b.featuredProductIds.length && (
        <StringList
          label={pick(
            lang,
            "المنتجات الأربعة في الرئيسية بالترتيب",
            "Four homepage products, in order",
          )}
          value={b.featuredProductIds}
          set={(v) => set("featuredProductIds", v)}
          lang={lang}
        />
      )}
    </>
  );
}
function StringList({
  label,
  value,
  set,
  lang,
  multiline = false,
}: {
  label: string;
  value: string[];
  set: (v: string[]) => void;
  lang: Lang;
  multiline?: boolean;
}) {
  return (
    <fieldset className="cms-list">
      <legend>{label}</legend>
      {value.map((v, n) => {
        const Field = multiline ? TextAreaField : TextField;
        return (
          <div className="cms-list-row" key={n}>
            <Field
              label={`${label} ${n + 1}`}
              value={v}
              onChange={(e: any) => set(value.map((x, i) => (i === n ? e.target.value : x)))}
            />
            <button
              type="button"
              aria-label={pick(lang, "إزالة", "Remove") + ` ${n + 1}`}
              onClick={() => set(value.filter((_, i) => i !== n))}
            >
              ×
            </button>
            <button
              type="button"
              disabled={!n}
              aria-label={pick(lang, "نقل لأعلى", "Move up") + ` ${n + 1}`}
              onClick={() => {
                const a = [...value];
                [a[n - 1], a[n]] = [a[n], a[n - 1]];
                set(a);
              }}
            >
              ↑
            </button>
          </div>
        );
      })}
      <button type="button" className="text-link" onClick={() => set([...value, ""])}>
        {pick(lang, "إضافة بند", "Add item")}
      </button>
    </fieldset>
  );
}
function PackageFields({ value: p, set, lang }: { value: any; set: (v: any) => void; lang: Lang }) {
  return (
    <div className="cms-row">
      <div className="form-grid">
        {[
          ["id", "معرف الخيار الثابت", "Stable option ID"],
          ["sizeKey", "مفتاح الحجم", "Size key"],
          ["sizeAr", "الحجم العربي", "Arabic size"],
          ["sizeEn", "الحجم الإنجليزي", "English size"],
          ["packagingAr", "التعبئة العربية (اختياري)", "Arabic packaging (optional)"],
          ["packagingEn", "التعبئة الإنجليزية (اختياري)", "English packaging (optional)"],
        ].map(([key, ar, en]) => (
          <TextField
            key={key}
            label={pick(lang, ar, en)}
            value={p[key] ?? ""}
            onChange={(e) =>
              set({
                ...p,
                [key]: e.target.value || (["packagingAr", "packagingEn"].includes(key) ? null : ""),
              })
            }
          />
        ))}
        <TextField
          type="number"
          min={0}
          step="0.001"
          label={pick(lang, "المقدار المعروف (اختياري)", "Known amount (optional)")}
          value={p.amount ?? ""}
          onChange={(e) => set({ ...p, amount: e.target.value || null })}
        />
        <SelectField
          label={pick(lang, "الوحدة المعروفة", "Known unit")}
          value={p.unit || ""}
          onChange={(e) => set({ ...p, unit: e.target.value || null })}
        >
          <option value="">{pick(lang, "غير معروفة", "Unknown")}</option>
          {["g", "kg", "L"].map((u) => (
            <option key={u}>{u}</option>
          ))}
        </SelectField>
      </div>
      <label className="check-option">
        <input
          type="checkbox"
          checked={p.published}
          onChange={(e) => set({ ...p, published: e.target.checked })}
        />
        {pick(lang, "نشر الحجم بعد اعتماد المسودة", "Publish size after draft approval")}
      </label>
      <label className="check-option">
        <input
          type="checkbox"
          checked={p.packagingPublished}
          onChange={(e) => set({ ...p, packagingPublished: e.target.checked })}
        />
        {pick(
          lang,
          "نشر تفاصيل التعبئة المؤكدة باللغتين",
          "Publish confirmed packaging details in both locales",
        )}
      </label>
    </div>
  );
}
function DraftPreview({ body, lang }: { body: Body; lang: Lang }) {
  const render = (v: any, key: string): any =>
    v == null ? null : Array.isArray(v) ? (
      <ol>
        {v.map((x, n) => (
          <li key={n}>{render(x, `${key}-${n}`)}</li>
        ))}
      </ol>
    ) : typeof v === "object" ? (
      <dl>
        {Object.entries(v).map(([k, x]) => (
          <div key={k}>
            <dt>
              <bdi>{k}</bdi>
            </dt>
            <dd>{render(x, k)}</dd>
          </div>
        ))}
      </dl>
    ) : typeof v === "string" && /^\/(assets\/|api\/v1\/media\/)/.test(v) ? (
      <img
        crossOrigin="use-credentials"
        className="cms-media-preview"
        src={
          v.startsWith("/api/v1/media/")
            ? new URL(
                `/api/v1/staff/content/media/${v.split("/").pop()!.replace(".webp", "")}/preview`,
                editorialBase(),
              ).href
            : v
        }
        alt={pick(lang, "معاينة صورة المسودة", "Draft image preview")}
      />
    ) : (
      <p className="cms-plain">{String(v)}</p>
    );
  return (
    <section className="draft-preview">
      <h2>
        {body[lang === "ar" ? "nameAr" : "nameEn"] ||
          body[lang === "ar" ? "titleAr" : "titleEn"] ||
          body[lang] ||
          body.id}
      </h2>
      {render(body, "root")}
    </section>
  );
}
export function ImageField({
  value,
  set,
  lang,
  label: caption,
}: {
  value: string | null;
  set: (v: string) => void;
  lang: Lang;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="cms-image-field">
      <p>
        {caption || pick(lang, "الصورة", "Image")}:{" "}
        <bdi>{value || pick(lang, "لا توجد صورة", "No image")}</bdi>
      </p>
      <div className="page-actions">
        <button type="button" className="button button-secondary" onClick={() => setOpen(true)}>
          {pick(lang, "اختيار من مكتبة الوسائط", "Choose from media library")}
        </button>
        {value && (
          <button type="button" className="text-link" onClick={() => set("")}>
            {pick(lang, "إزالة الصورة من المسودة", "Remove draft image")}
          </button>
        )}
      </div>
      {open && (
        <Modal
          title={pick(lang, "اختيار صورة مسجلة", "Select registered image")}
          lang={lang}
          onClose={() => setOpen(false)}
        >
          <MediaLibrary
            lang={lang}
            select={(m) => {
              set(m.url);
              setOpen(false);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
function MediaLibrary({ lang, select }: { lang: Lang; select?: (m: Media) => void }) {
  const [page, setPage] = useState(1),
    [q, setQ] = useState(""),
    [selected, setSelected] = useState<Media | null>(null),
    [altAr, setAltAr] = useState(""),
    [altEn, setAltEn] = useState(""),
    [file, setFile] = useState<File | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const query = useMedia({ q, page, pageSize: 12, status: "" }),
    meta = useEditorialMetadata(),
    mutation = useEditorialMutation<Media>();
  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setError("");
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error();
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await mutation.mutateAsync({
        kind: "media",
        path: "/media/upload",
        body: { key: crypto.randomUUID(), filename: file.name, data, altAr, altEn },
      });
      setNotice(
        pick(
          lang,
          "حُفظت الصورة في التخزين المحلي الدائم.",
          "Image saved in persistent local storage.",
        ),
      );
      setFile(null);
      setPage(1);
    } catch (e) {
      setError(editorialFailure(e, lang));
    }
  };
  return (
    <>
      {!select && (
        <form className="workspace-form" onSubmit={upload}>
          <h2>{pick(lang, "رفع صورة فعلية", "Upload image")}</h2>
          <p>
            {pick(
              lang,
              "PNG أو JPEG أو WebP، حتى 5 ميغابايت و6000 بكسل لكل بُعد و24 مليون بكسل؛ لا SVG أو صور متحركة.",
              "PNG, JPEG or WebP, up to 5 MiB, 6000 pixels per side and 24 megapixels; no SVG or animation.",
            )}
          </p>
          <label className="form-field">
            <span>{pick(lang, "ملف الصورة", "Image file")}</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={!meta.data?.permissions.canWrite || mutation.isPending}
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>
          <div className="form-grid">
            <TextField
              label={pick(lang, "النص البديل بالعربية", "Arabic alt text")}
              value={altAr}
              required
              maxLength={300}
              onChange={(e) => setAltAr(e.target.value)}
            />
            <TextField
              label={pick(lang, "النص البديل بالإنجليزية", "English alt text")}
              value={altEn}
              required
              maxLength={300}
              onChange={(e) => setAltEn(e.target.value)}
            />
          </div>
          <button
            className="button button-primary"
            disabled={!file || !meta.data?.permissions.canWrite || mutation.isPending}
          >
            {pick(lang, "رفع الصورة", "Upload image")}
          </button>
        </form>
      )}
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <TextField
        label={pick(lang, "بحث الوسائط", "Search media")}
        value={q}
        maxLength={100}
        onChange={(e) => {
          setQ(e.target.value);
          setPage(1);
        }}
      />
      {query.isPending ? (
        <p role="status">{pick(lang, "جارٍ التحميل…", "Loading…")}</p>
      ) : query.error ? (
        <p role="alert">{editorialFailure(query.error, lang)}</p>
      ) : (
        query.data && (
          <>
            <div className="cms-media-grid">
              {query.data.items.map((m) => (
                <article key={m.id}>
                  <img
                    crossOrigin="use-credentials"
                    src={mediaPreview(m)}
                    alt={lang === "ar" ? m.altAr : m.altEn}
                    loading="lazy"
                  />
                  <p>
                    {(lang === "ar" ? m.altAr : m.altEn) ||
                      pick(lang, "النص البديل ناقص", "Alt text missing")}
                  </p>
                  <bdi>{m.id}</bdi>
                  <div className="page-actions">
                    {select ? (
                      <button
                        className="button button-secondary"
                        disabled={m.archived}
                        onClick={() => select(m)}
                      >
                        {pick(lang, "اختيار الصورة", "Select image")}
                      </button>
                    ) : (
                      <button className="button button-secondary" onClick={() => setSelected(m)}>
                        {pick(lang, "الخصائص والاستخدام", "Properties and usage")}
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
            {!query.data.items.length && (
              <p>{pick(lang, "لا توجد وسائط تطابق البحث.", "No media match this search.")}</p>
            )}
            <RecordPager info={query.data} lang={lang} onPage={setPage} />
          </>
        )
      )}
      {selected && (
        <Modal
          title={pick(lang, "خصائص الوسيط واستخدامه", "Media properties and usage")}
          lang={lang}
          onClose={() => setSelected(null)}
        >
          <MediaProperties
            key={selected.id}
            media={selected}
            lang={lang}
            close={() => setSelected(null)}
          />
        </Modal>
      )}
    </>
  );
}
function MediaProperties({ media, lang, close }: { media: Media; lang: Lang; close: () => void }) {
  const [ar, setAr] = useState(media.altAr),
    [en, setEn] = useState(media.altEn),
    [error, setError] = useState(""),
    [confirm, setConfirm] = useState("");
  const usage = useMediaUsage(media.id),
    mutation = useEditorialMutation<any>(),
    meta = useEditorialMetadata();
  const action = async (a: string) => {
    try {
      await mutation.mutateAsync({
        kind: "media",
        path: `/media/${media.id}/actions`,
        body: {
          key: crypto.randomUUID(),
          version: media.version,
          action: a,
          ...(a === "save" ? { altAr: ar, altEn: en } : {}),
        },
      });
      close();
    } catch (e) {
      setError(editorialFailure(e, lang));
      setConfirm("");
    }
  };
  return (
    <>
      <img
        crossOrigin="use-credentials"
        className="cms-media-preview"
        src={mediaPreview(media)}
        alt={lang === "ar" ? ar : en}
      />
      <TextField
        label={pick(lang, "النص البديل بالعربية", "Arabic alt text")}
        value={ar}
        onChange={(e) => setAr(e.target.value)}
      />
      <TextField
        label={pick(lang, "النص البديل بالإنجليزية", "English alt text")}
        value={en}
        onChange={(e) => setEn(e.target.value)}
      />
      {error && <p role="alert">{error}</p>}
      <p>
        {pick(lang, "عدد المراجع في النسخ المحتفظ بها", "References in retained revisions")}:{" "}
        {usage.data?.total ?? "…"}
      </p>
      {usage.data?.items.map((i) => (
        <p key={i.revisionId}>
          <bdi>{i.documentKey}</bdi>
        </p>
      ))}
      <div className="page-actions">
        <button
          className="button button-primary"
          disabled={mutation.isPending || !meta.data?.permissions.canWrite}
          onClick={() => action("save")}
        >
          {pick(lang, "حفظ النص البديل", "Save alt text")}
        </button>
        <button
          className="button button-secondary"
          disabled={mutation.isPending || !meta.data?.permissions.canWrite || !!usage.data?.total}
          onClick={() => setConfirm("archive")}
        >
          {pick(lang, "أرشفة", "Archive")}
        </button>
        {media.source === "upload" && (
          <button
            className="button button-secondary"
            disabled={mutation.isPending || !meta.data?.permissions.canWrite || !!usage.data?.total}
            onClick={() => setConfirm("delete")}
          >
            {pick(lang, "حذف الملف غير المستخدم", "Delete unused file")}
          </button>
        )}
      </div>
      {confirm && (
        <div role="alert">
          <p>
            {pick(
              lang,
              "تأكيد الإجراء على هذا الملف غير المستخدم؟",
              "Confirm this action on this unused file?",
            )}
          </p>
          <button className="button button-primary" onClick={() => action(confirm)}>
            {pick(lang, "تأكيد الإجراء", "Confirm action")}
          </button>
          <button className="button button-secondary" onClick={() => setConfirm("")}>
            {pick(lang, "إلغاء", "Cancel")}
          </button>
        </div>
      )}
    </>
  );
}
