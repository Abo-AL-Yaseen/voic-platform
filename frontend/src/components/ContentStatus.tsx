import { ApiError } from "../services/api";
import { pick, type Lang } from "../i18n";
export default function ContentStatus({
  query,
  lang,
}: {
  query: { isPending: boolean; isError: boolean; error: unknown; refetch: () => unknown };
  lang: Lang;
}) {
  if (query.isPending)
    return (
      <div className="content-feedback section-pad" role="status">
        {pick(lang, "جارٍ تحميل المحتوى…", "Loading content…")}
      </div>
    );
  if (query.isError)
    return (
      <div className="content-feedback section-pad" role="alert">
        <p>
          {query.error instanceof ApiError && query.error.status === 404
            ? pick(lang, "المحتوى غير منشور أو غير متاح.", "Content is unpublished or unavailable.")
            : pick(
                lang,
                "تعذر تحميل المحتوى. أعد المحاولة.",
                "Could not load content. Please retry.",
              )}
        </p>
        <button className="button button-secondary" onClick={() => query.refetch()}>
          {pick(lang, "إعادة المحاولة", "Retry")}
        </button>
      </div>
    );
  return null;
}
