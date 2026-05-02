import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Button, Modal, Spin, Tabs, Typography } from "antd";
import { apiFetch, useIsAuthed } from "./auth";
import type { ItemKind } from "./components/ItemEditor";
import { PAGE_SIZE, TAB_TO_KIND, tabToItemsKind } from "./person-detail/constants";
import PersonDetailHeader from "./person-detail/PersonDetailHeader";
import PersonInfoTab from "./person-detail/PersonInfoTab";
import PersonBooksTab from "./person-detail/PersonBooksTab";
import PersonArticlesTab from "./person-detail/PersonArticlesTab";
import PersonVideosTab from "./person-detail/PersonVideosTab";
import PersonPodcastsTab from "./person-detail/PersonPodcastsTab";
import PersonTweetsTab from "./person-detail/PersonTweetsTab";
import PersonAnswersTab from "./person-detail/PersonAnswersTab";
import type {
  ArticleItem,
  AnswerItem,
  BookItem,
  PersonSummary,
  PodcastItem,
  TabKey,
  TweetItem,
  VideoItem,
} from "./person-detail/types";

const ItemEditor = lazy(() => import("./components/ItemEditor"));
const PersonEditor = lazy(() => import("./components/PersonEditor"));

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

  const tabItemsConfig = useMemo(
    () =>
      dynamicTabList.map((t) => ({
        key: t.key,
        label: (
          <>
            {t.label}
            {t.count > 0 && (
              <Typography.Text type="secondary" className="ml-1 text-xs">
                ({t.count})
              </Typography.Text>
            )}
          </>
        ),
        children: <span />,
      })),
    [dynamicTabList]
  );

  if (!person) {
    return (
      <div className="main-center-wrapper">
        <div className="container">加载中...</div>
      </div>
    );
  }

  const onDeleteItem = (kind: ItemKind, itemId: number) => {
    Modal.confirm({
      title: "确认删除",
      content: "删除后不可恢复，确定要删除这条记录吗？",
      okText: "删除",
      okType: "danger",
      cancelText: "取消",
      centered: true,
      maskClosable: true,
      onOk: async () => {
        try {
          await apiFetch(`/api/v1/${kind}/${itemId}`, { method: "DELETE" });
          await reloadPersonAndList();
        } catch (e) {
          Modal.error({
            title: "删除失败",
            content: e instanceof Error ? e.message : "删除失败",
          });
          return Promise.reject(e);
        }
      },
    });
  };

  const itemKindForTab = TAB_TO_KIND[tab];

  const books = tab === "books" ? (tabItems as BookItem[]) : [];
  const articles = tab === "articles" ? (tabItems as ArticleItem[]) : [];
  const videos = tab === "videos" ? (tabItems as VideoItem[]) : [];
  const podcasts = tab === "podcasts" ? (tabItems as PodcastItem[]) : [];
  const tweets = tab === "twitter" ? (tabItems as TweetItem[]) : [];
  const answers = tab === "answers" ? (tabItems as AnswerItem[]) : [];

  const showTabSpinner = tab !== "info" && tabLoading;

  const paginationProps = { page, setPage, total: tabTotal, pageSize: PAGE_SIZE };

  return (
    <div className="main-center-wrapper">
      <div className="container" style={{ alignItems: "stretch" }}>
        <PersonDetailHeader person={person} authed={authed} onEditProfile={() => setPersonEditorOpen(true)} />
        <Tabs
          className="person-detail-tabs-nav-only mb-6"
          activeKey={tab}
          onChange={(k) => {
            setPage(1);
            setTab(k as TabKey);
          }}
          items={tabItemsConfig}
        />
        {authed && itemKindForTab && (
          <div className="mb-4">
            <Button type="primary" size="small" onClick={() => setEditor({ kind: itemKindForTab, initial: null })}>
              + 新增
            </Button>
          </div>
        )}

        <div>
          {showTabSpinner && (
            <div className="text-sm text-gray-500 mb-4">
              <Spin size="small" /> 加载中...
            </div>
          )}

          {tab === "info" && <PersonInfoTab person={person} />}

          {tab === "books" && !tabLoading && (
            <PersonBooksTab
              books={books}
              authed={authed}
              {...paginationProps}
              onEdit={(item) => setEditor({ kind: "books", initial: item as unknown as Record<string, unknown> })}
              onDelete={(item) => void onDeleteItem("books", item.id)}
            />
          )}

          {tab === "articles" && !tabLoading && (
            <PersonArticlesTab
              articles={articles}
              authed={authed}
              {...paginationProps}
              onEdit={(item) => setEditor({ kind: "articles", initial: item as unknown as Record<string, unknown> })}
              onDelete={(item) => void onDeleteItem("articles", item.id)}
            />
          )}

          {tab === "videos" && !tabLoading && (
            <PersonVideosTab
              videos={videos}
              authed={authed}
              {...paginationProps}
              onEdit={(item) => setEditor({ kind: "videos", initial: item as unknown as Record<string, unknown> })}
              onDelete={(item) => void onDeleteItem("videos", item.id)}
            />
          )}

          {tab === "podcasts" && !tabLoading && (
            <PersonPodcastsTab
              podcasts={podcasts}
              authed={authed}
              {...paginationProps}
              onEdit={(item) => setEditor({ kind: "podcasts", initial: item as unknown as Record<string, unknown> })}
              onDelete={(item) => void onDeleteItem("podcasts", item.id)}
            />
          )}

          {tab === "twitter" && !tabLoading && (
            <PersonTweetsTab
              tweets={tweets}
              authed={authed}
              {...paginationProps}
              onEdit={(item) => setEditor({ kind: "tweets", initial: item as unknown as Record<string, unknown> })}
              onDelete={(item) => void onDeleteItem("tweets", item.id)}
            />
          )}

          {tab === "answers" && !tabLoading && (
            <PersonAnswersTab
              answers={answers}
              authed={authed}
              {...paginationProps}
              onEdit={(item) => setEditor({ kind: "answers", initial: item as unknown as Record<string, unknown> })}
              onDelete={(item) => void onDeleteItem("answers", item.id)}
            />
          )}
        </div>
      </div>

      {editor && id && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}
      {personEditorOpen && (
        <Suspense fallback={null}>
          <PersonEditor
            mode="edit"
            initial={person}
            onClose={() => setPersonEditorOpen(false)}
            onSaved={() => {
              setPersonEditorOpen(false);
              void fetchPerson();
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
