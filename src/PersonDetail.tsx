import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { apiFetch, useIsAuthed } from "./auth";
import { resolveImg } from "./lib/img";
import ItemEditor, { type ItemKind } from "./components/ItemEditor";
import PersonEditor from "./components/PersonEditor";

const PAGE_SIZE = 50;

interface BaseItem { id: number }
interface BookItem extends BaseItem { title: string; url: string | null; cover: string | null }
interface ArticleItem extends BaseItem { title: string; content: string | null }
interface VideoItem extends BaseItem { title: string; url: string | null }
interface PodcastItem extends BaseItem { title: string; url: string | null }
interface TweetItem extends BaseItem { datetime: string | null; content: string | null; imgs: string[] }
interface AnswerItem extends BaseItem { datetime: string | null; question: string | null; content: string | null }

interface PersonCounts {
  books: number;
  articles: number;
  videos: number;
  podcasts: number;
  tweets: number;
  answers: number;
}

interface PersonSummary {
  id: string;
  name: string;
  avatar: string | null;
  description: string | null;
  counts: PersonCounts;
}

type TabKey = "info" | "books" | "articles" | "videos" | "podcasts" | "twitter" | "answers";

const TAB_TO_KIND: Partial<Record<TabKey, ItemKind>> = {
  books: "books",
  articles: "articles",
  videos: "videos",
  podcasts: "podcasts",
  twitter: "tweets",
  answers: "answers",
};

/** TAB key → `GET .../items/:kind` 路径段 */
function tabToItemsKind(tab: TabKey): string | null {
  switch (tab) {
    case "books":
      return "books";
    case "articles":
      return "articles";
    case "videos":
      return "videos";
    case "podcasts":
      return "podcasts";
    case "twitter":
      return "tweets";
    case "answers":
      return "answers";
    default:
      return null;
  }
}

export default function PersonDetail() {
  const { id } = useParams();
  const authed = useIsAuthed();
  const [person, setPerson] = useState<PersonSummary | null>(null);
  const [tab, setTab] = useState<TabKey>("info");
  const [page, setPage] = useState(1);
  const [tabItems, setTabItems] = useState<unknown[]>([]);
  const [tabTotal, setTabTotal] = useState(0);
  const [tabLoading, setTabLoading] = useState(false);
  const [listNonce, setListNonce] = useState(0);
  const [editor, setEditor] = useState<
    | { kind: ItemKind; initial: Record<string, unknown> | null }
    | null
  >(null);
  const [personEditorOpen, setPersonEditorOpen] = useState(false);

  const fetchPerson = useCallback(async () => {
    if (!id) return;
    try {
      const p = await apiFetch<PersonSummary>(`/api/v1/people/${id}`);
      setPerson(p);
    } catch {
      setPerson(null);
    }
  }, [id]);

  useEffect(() => {
    void fetchPerson();
  }, [fetchPerson]);

  useEffect(() => {
    const kind = tabToItemsKind(tab);
    if (!id || !kind) {
      setTabItems([]);
      setTabTotal(0);
      setTabLoading(false);
      return;
    }
    let cancelled = false;
    setTabLoading(true);
    apiFetch<{ items: unknown[]; total: number }>(
      `/api/v1/people/${id}/items/${kind}?page=${page}&pageSize=${PAGE_SIZE}`
    )
      .then((r) => {
        if (!cancelled) {
          setTabItems(r.items);
          setTabTotal(r.total);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTabItems([]);
          setTabTotal(0);
        }
      })
      .finally(() => {
        if (!cancelled) setTabLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, tab, page, listNonce]);

  const reloadPersonAndList = useCallback(async () => {
    await fetchPerson();
    setListNonce((n) => n + 1);
  }, [fetchPerson]);

  const dynamicTabList: { key: TabKey; label: string; count: number }[] = useMemo(() => {
    if (!person) return [{ key: "info", label: "Info", count: 0 }];
    const c = person.counts;
    const list: { key: TabKey; label: string; count: number }[] = [{ key: "info", label: "Info", count: 0 }];
    if (authed || c.books > 0) list.push({ key: "books", label: "Books", count: c.books });
    if (authed || c.articles > 0) list.push({ key: "articles", label: "Articles", count: c.articles });
    if (authed || c.videos > 0) list.push({ key: "videos", label: "Videos", count: c.videos });
    if (authed || c.podcasts > 0) list.push({ key: "podcasts", label: "Podcasts", count: c.podcasts });
    if (authed || c.tweets > 0) list.push({ key: "twitter", label: "Tweets", count: c.tweets });
    if (authed || c.answers > 0) list.push({ key: "answers", label: "Answers", count: c.answers });
    return list;
  }, [person, authed]);

  if (!person) {
    return (
      <div className="main-center-wrapper">
        <div className="container">加载中...</div>
      </div>
    );
  }

  const desc = person.description ?? "";

  const onDeleteItem = async (kind: ItemKind, itemId: number) => {
    if (!confirm("确认删除？")) return;
    try {
      await apiFetch(`/api/v1/${kind}/${itemId}`, { method: "DELETE" });
      await reloadPersonAndList();
    } catch (e) {
      alert(e instanceof Error ? e.message : "删除失败");
    }
  };

  const itemKindForTab = TAB_TO_KIND[tab];

  const books = tab === "books" ? (tabItems as BookItem[]) : [];
  const articles = tab === "articles" ? (tabItems as ArticleItem[]) : [];
  const videos = tab === "videos" ? (tabItems as VideoItem[]) : [];
  const podcasts = tab === "podcasts" ? (tabItems as PodcastItem[]) : [];
  const tweets = tab === "twitter" ? (tabItems as TweetItem[]) : [];
  const answers = tab === "answers" ? (tabItems as AnswerItem[]) : [];

  const showTabSpinner = tab !== "info" && tabLoading;

  return (
    <div className="main-center-wrapper">
      <div className="container" style={{ alignItems: "stretch" }}>
        <Link to="/people" className="mb-4 text-blue-700 font-bold hover:underline block">
          &lt; 返回
        </Link>
        <div className="flex items-center mb-8">
          <div className="avatar">
            <div className="w-24 rounded">
              {person.avatar ? (
                <img src={resolveImg(person.avatar)} alt={person.name} />
              ) : (
                <div className="w-24 h-24 bg-base-200" />
              )}
            </div>
          </div>
          <div className="ml-8 flex-1">
            <h1 style={{ marginBottom: 8 }}>{person.name}</h1>
          </div>
          {authed && (
            <button className="btn btn-sm" onClick={() => setPersonEditorOpen(true)}>
              编辑信息
            </button>
          )}
        </div>
        <div role="tablist" className="tabs tabs-border mb-6">
          {dynamicTabList.map((t) => (
            <a
              role="tab"
              key={t.key}
              className={`tab${tab === t.key ? " tab-active" : ""}`}
              onClick={() => {
                setPage(1);
                setTab(t.key);
              }}
            >
              {t.label}
              {t.count > 0 && <span className="ml-1 text-xs text-gray-400">({t.count})</span>}
            </a>
          ))}
        </div>
        {authed && itemKindForTab && (
          <div className="mb-4">
            <button
              className="btn btn-sm btn-primary"
              onClick={() => setEditor({ kind: itemKindForTab, initial: null })}
            >
              + 新增
            </button>
          </div>
        )}

        <div>
          {showTabSpinner && <div className="text-sm text-gray-500 mb-4">加载中...</div>}

          {tab === "info" && (
            <div>
              <div><b>姓名：</b>{person.name}</div>
              <div><b>简介：</b>{desc}</div>
            </div>
          )}

          {tab === "books" && !tabLoading && (
            <div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "32px 24px", justifyContent: "flex-start" }}>
                {books.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      background: "#fff",
                      borderRadius: 8,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                      padding: 16,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      position: "relative",
                    }}
                  >
                    {authed && (
                      <div className="absolute top-1 right-1 flex gap-1">
                        <button
                          className="btn btn-xs"
                          onClick={() => setEditor({ kind: "books", initial: item as unknown as Record<string, unknown> })}
                        >
                          编辑
                        </button>
                        <button
                          className="btn btn-xs btn-error"
                          onClick={() => void onDeleteItem("books", item.id)}
                        >
                          ×
                        </button>
                      </div>
                    )}
                    {item.cover && (
                      <img
                        src={resolveImg(item.cover)}
                        alt={item.title}
                        style={{ width: "10rem", height: "10rem", objectFit: "cover", borderRadius: 4, marginBottom: 12 }}
                      />
                    )}
                    {item.url ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontWeight: 700, fontSize: 16, color: "#0078d7", textAlign: "center", textDecoration: "none" }}
                      >
                        {item.title}
                      </a>
                    ) : (
                      <span style={{ fontWeight: 700, fontSize: 16, textAlign: "center" }}>{item.title}</span>
                    )}
                  </div>
                ))}
              </div>
              <Pagination page={page} setPage={setPage} total={tabTotal} pageSize={PAGE_SIZE} />
            </div>
          )}

          {tab === "articles" && !tabLoading && (
            <div>
              <ArticleList
                articles={articles}
                authed={authed}
                onEdit={(item) => setEditor({ kind: "articles", initial: item as unknown as Record<string, unknown> })}
                onDelete={(item) => void onDeleteItem("articles", item.id)}
              />
              <Pagination page={page} setPage={setPage} total={tabTotal} pageSize={PAGE_SIZE} />
            </div>
          )}

          {tab === "videos" && !tabLoading && (
            <div>
              <ul>
                {videos.map((item) => (
                  <li key={item.id} style={{ marginBottom: 12 }} className="flex items-center gap-2">
                    {item.url ? (
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline font-bold">
                        {item.title}
                      </a>
                    ) : (
                      <span className="font-bold">{item.title}</span>
                    )}
                    {authed && (
                      <>
                        <button className="btn btn-xs" onClick={() => setEditor({ kind: "videos", initial: item as unknown as Record<string, unknown> })}>编辑</button>
                        <button className="btn btn-xs btn-error" onClick={() => void onDeleteItem("videos", item.id)}>×</button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
              <Pagination page={page} setPage={setPage} total={tabTotal} pageSize={PAGE_SIZE} />
            </div>
          )}

          {tab === "podcasts" && !tabLoading && (
            <div>
              <ul>
                {podcasts.map((item) => (
                  <li key={item.id} style={{ marginBottom: 12 }} className="flex items-center gap-2">
                    {item.url ? (
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline font-bold">
                        {item.title}
                      </a>
                    ) : (
                      <span className="font-bold">{item.title}</span>
                    )}
                    {authed && (
                      <>
                        <button className="btn btn-xs" onClick={() => setEditor({ kind: "podcasts", initial: item as unknown as Record<string, unknown> })}>编辑</button>
                        <button className="btn btn-xs btn-error" onClick={() => void onDeleteItem("podcasts", item.id)}>×</button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
              <Pagination page={page} setPage={setPage} total={tabTotal} pageSize={PAGE_SIZE} />
            </div>
          )}

          {tab === "twitter" && !tabLoading && (
            <div>
              {tweets.map((item) => (
                <div key={item.id} className="card card-border bg-base-100 mb-4 relative">
                  <div className="card-body p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-400 mb-1">{item.datetime}</div>
                      {authed && (
                        <div className="flex gap-1">
                          <button className="btn btn-xs" onClick={() => setEditor({ kind: "tweets", initial: item as unknown as Record<string, unknown> })}>编辑</button>
                          <button className="btn btn-xs btn-error" onClick={() => void onDeleteItem("tweets", item.id)}>×</button>
                        </div>
                      )}
                    </div>
                    <div
                      className="text-base whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ __html: item.content ?? "" }}
                    />
                    {item.imgs && item.imgs.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {item.imgs.map((k) => (
                          <a key={k} href={resolveImg(k)} target="_blank" rel="noopener noreferrer">
                            <img
                              src={resolveImg(k)}
                              alt=""
                              style={{ maxWidth: 200, maxHeight: 200, objectFit: "cover", borderRadius: 6 }}
                            />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <Pagination page={page} setPage={setPage} total={tabTotal} pageSize={PAGE_SIZE} />
            </div>
          )}

          {tab === "answers" && !tabLoading && (
            <div>
              <ul>
                {answers.map((item) => (
                  <li key={item.id} className="mb-4 card card-border bg-base-100">
                    <div className="card-body p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-400 mb-1">{formatDatetime(item.datetime)}</div>
                        {authed && (
                          <div className="flex gap-1">
                            <button className="btn btn-xs" onClick={() => setEditor({ kind: "answers", initial: item as unknown as Record<string, unknown> })}>编辑</button>
                            <button className="btn btn-xs btn-error" onClick={() => void onDeleteItem("answers", item.id)}>×</button>
                          </div>
                        )}
                      </div>
                      <div className="font-bold mb-2">Q: {item.question}</div>
                      <div
                        className="text-base whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{ __html: item.content ?? "" }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
              <Pagination page={page} setPage={setPage} total={tabTotal} pageSize={PAGE_SIZE} />
            </div>
          )}
        </div>
      </div>

      {editor && id && (
        <ItemEditor
          kind={editor.kind}
          personId={id}
          initial={editor.initial}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            void reloadPersonAndList();
          }}
        />
      )}
      {personEditorOpen && (
        <PersonEditor
          mode="edit"
          initial={person}
          onClose={() => setPersonEditorOpen(false)}
          onSaved={() => {
            setPersonEditorOpen(false);
            void fetchPerson();
          }}
        />
      )}
    </div>
  );
}

const formatDatetime = (dt: string | null | undefined) => {
  if (!dt) return "";
  if (/^\d+$/.test(dt)) {
    let ts = Number(dt);
    if (dt.length === 10) ts = ts * 1000;
    const d = new Date(ts);
    return d.toISOString().replace("T", " ").replace("Z", "");
  }
  return dt;
};

interface PaginationProps {
  page: number;
  setPage: (n: number) => void;
  total: number;
  pageSize: number;
}
function Pagination({ page, setPage, total, pageSize }: PaginationProps) {
  const pageCount = Math.ceil(total / pageSize);
  if (pageCount <= 1) return null;
  return (
    <div className="flex justify-center my-4">
      <div className="join">
        <button className="join-item btn btn-sm" disabled={page === 1} onClick={() => setPage(page - 1)}>«</button>
        <button className="join-item btn btn-sm btn-active">{page}/{pageCount}</button>
        <button className="join-item btn btn-sm" disabled={page === pageCount} onClick={() => setPage(page + 1)}>»</button>
      </div>
    </div>
  );
}

function ArticleList({
  articles,
  authed,
  onEdit,
  onDelete,
}: {
  articles: ArticleItem[];
  authed: boolean;
  onEdit: (a: ArticleItem) => void;
  onDelete: (a: ArticleItem) => void;
}) {
  const [modalContent, setModalContent] = useState<string | null>(null);

  return (
    <div>
      <ul>
        {articles.map((item) => {
          const firstLine = ((item.content ?? "").split("\n")[0] || item.title).replace(/^#+\s*/, "") || item.title;
          return (
            <li key={item.id} style={{ marginBottom: 16 }} className="flex items-center gap-2">
              <button
                className="text-blue-700 underline font-bold hover:text-blue-900"
                onClick={() => setModalContent(item.content ?? "")}
              >
                {firstLine}
              </button>
              {authed && (
                <>
                  <button className="btn btn-xs" onClick={() => onEdit(item)}>编辑</button>
                  <button className="btn btn-xs btn-error" onClick={() => onDelete(item)}>×</button>
                </>
              )}
            </li>
          );
        })}
      </ul>
      {modalContent !== null && (
        <div className="modal modal-open" style={{ zIndex: 1000 }}>
          <div className="modal-box whitespace-pre-wrap" style={{ width: "80vw", maxWidth: "80vw" }}>
            <label className="btn btn-sm btn-circle absolute right-2 top-2" onClick={() => setModalContent(null)}>
              ✕
            </label>
            <div style={{ whiteSpace: "pre-wrap" }}>{modalContent}</div>
          </div>
          <label className="modal-backdrop" onClick={() => setModalContent(null)} />
        </div>
      )}
    </div>
  );
}
