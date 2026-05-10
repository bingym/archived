import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button, Flex, Modal, Result, Spin, Tabs, Typography, theme } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { apiFetch, useIsAuthed } from "./auth";
import ItemEditor, { type ItemKind } from "./components/ItemEditor";
import PersonEditor from "./components/PersonEditor";
import { TAB_TO_KIND, tabToItemsKind, type ItemPageSize } from "./person-detail/constants";
import {
  buildPersonDetailPath,
  parsePersonDetailPageSize,
  parsePersonDetailTabParam,
  parsePersonDetailTweetPage,
  parseTweetsStarredFilter,
  type TweetsStarredFilter,
} from "./person-detail/personDetailUrl";
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

const { Text } = Typography;

/** PUT 返回的 DB 行与列表项字段对齐（含 `imgs` JSON 字符串） */
function parseTweetImgsFromApi(raw: unknown): string[] {
  if (typeof raw === "string") {
    try {
      const v = JSON.parse(raw) as unknown;
      return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
    } catch {
      return [];
    }
  }
  if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === "string");
  return [];
}

function savedRecordToTweetItem(saved: Record<string, unknown>): TweetItem {
  return {
    id: Number(saved.id),
    datetime: (saved.datetime as string | null) ?? null,
    content: (saved.content as string | null) ?? null,
    metadata: (saved.metadata as string | null) ?? null,
    imgs: parseTweetImgsFromApi(saved.imgs),
    starred: saved.starred === true || saved.starred === 1 || saved.starred === "1",
  };
}

export default function PersonDetail() {
  const { token } = theme.useToken();
  const navigate = useNavigate();
  const { id, tab: tabSegment } = useParams<{ id: string; tab: string }>();
  const [searchParams] = useSearchParams();

  const authed = useIsAuthed();
  const [person, setPerson] = useState<PersonSummary | null>(null);
  const [tabItems, setTabItems] = useState<unknown[]>([]);
  const [tabLoading, setTabLoading] = useState(false);
  const [listNonce, setListNonce] = useState(0);
  const [editor, setEditor] = useState<
    | { kind: ItemKind; initial: Record<string, unknown> | null }
    | null
  >(null);
  const [personEditorOpen, setPersonEditorOpen] = useState(false);
  const [rebuildCountsLoading, setRebuildCountsLoading] = useState(false);

  const tabParsed = parsePersonDetailTabParam(tabSegment);
  const pageSize = parsePersonDetailPageSize(searchParams);
  const tweetsStarredFilter = useMemo(() => parseTweetsStarredFilter(searchParams), [searchParams]);
  const tweetPage = useMemo(() => parsePersonDetailTweetPage(searchParams), [searchParams]);

  const [fetchParams, setFetchParams] = useState<{ cursor: string | null; dir: "next" | "prev" }>({ cursor: null, dir: "next" });
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [prevCursor, setPrevCursor] = useState<string | null>(null);

  const [tweetTotalPages, setTweetTotalPages] = useState(0);

  useEffect(() => {
    setFetchParams({ cursor: null, dir: "next" });
  }, [tabParsed, pageSize, tweetsStarredFilter]);

  const refreshPerson = useCallback(async () => {
    if (!id) return;
    try {
      const p = await apiFetch<PersonSummary>(`/api/v1/people/${id}`);
      setPerson(p);
    } catch {
      /* 后台刷新失败时保留当前展示，避免整页被清空 */
    }
  }, [id]);

  const [personBootstrap, setPersonBootstrap] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setPersonBootstrap(true);
    setPerson(null);
    (async () => {
      try {
        const p = await apiFetch<PersonSummary>(`/api/v1/people/${id}`);
        if (!cancelled) setPerson(p);
      } catch {
        if (!cancelled) setPerson(null);
      } finally {
        if (!cancelled) setPersonBootstrap(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!id || tabParsed === null) {
      setTabItems([]);
      setNextCursor(null);
      setPrevCursor(null);
      setTabLoading(false);
      return;
    }
    const kind = tabToItemsKind(tabParsed);
    if (!kind) {
      setTabItems([]);
      setNextCursor(null);
      setPrevCursor(null);
      setTabLoading(false);
      return;
    }
    let cancelled = false;
    setTabLoading(true);

    if (kind === "tweets") {
      let url = `/api/v1/people/${id}/tweets?pageSize=${pageSize}&page=${tweetPage}`;
      if (tweetsStarredFilter === "starred") url += "&starred=1";
      apiFetch<{ items: unknown[]; page: number; totalPages: number }>(url)
        .then((r) => {
          if (!cancelled) {
            setTabItems(r.items);
            setTweetTotalPages(r.totalPages);
            if (r.page !== tweetPage && id) {
              navigate(
                buildPersonDetailPath(id, "twitter", {
                  tweetsStarred: tweetsStarredFilter,
                  pageSize,
                  page: r.page,
                }),
                { replace: true },
              );
            }
          }
        })
        .catch(() => {
          if (!cancelled) {
            setTabItems([]);
            setTweetTotalPages(0);
          }
        })
        .finally(() => {
          if (!cancelled) setTabLoading(false);
        });
    } else {
      let url = `/api/v1/people/${id}/${kind}?pageSize=${pageSize}`;
      if (fetchParams.cursor) {
        url += `&cursor=${encodeURIComponent(fetchParams.cursor)}&dir=${fetchParams.dir}`;
      }
      apiFetch<{ items: unknown[]; nextCursor: string | null; prevCursor: string | null }>(url)
        .then((r) => {
          if (!cancelled) {
            setTabItems(r.items);
            setNextCursor(r.nextCursor);
            setPrevCursor(r.prevCursor);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setTabItems([]);
            setNextCursor(null);
            setPrevCursor(null);
          }
        })
        .finally(() => {
          if (!cancelled) setTabLoading(false);
        });
    }

    return () => {
      cancelled = true;
    };
  }, [id, tabParsed, fetchParams, pageSize, listNonce, tweetsStarredFilter, tweetPage, navigate]);

  const reloadPersonAndList = useCallback(async () => {
    await refreshPerson();
    setFetchParams({ cursor: null, dir: "next" });
    if (id && tabParsed === "twitter") {
      navigate(
        buildPersonDetailPath(id, "twitter", {
          tweetsStarred: tweetsStarredFilter,
          pageSize,
          page: 1,
        }),
      );
    }
    setListNonce((n) => n + 1);
  }, [refreshPerson, id, tabParsed, navigate, tweetsStarredFilter, pageSize]);

  const goTweetPage = useCallback(
    (nextPage: number) => {
      if (!id) return;
      navigate(
        buildPersonDetailPath(id, "twitter", {
          tweetsStarred: tweetsStarredFilter,
          pageSize,
          page: nextPage,
        }),
      );
    },
    [id, navigate, tweetsStarredFilter, pageSize],
  );

  /** 编辑推文保存后不调列表接口：就地更新行；若星标与当前筛选不符则从本页移除 */
  const applyEditedTweetToList = useCallback(
    (saved: Record<string, unknown>) => {
      const item = savedRecordToTweetItem(saved);
      const matchesFilter = tweetsStarredFilter === "all" || (tweetsStarredFilter === "starred" && item.starred);

      setTabItems((prev) => {
        const list = prev as TweetItem[];
        const idx = list.findIndex((x) => x.id === item.id);
        if (idx < 0) return prev;
        if (!matchesFilter) {
          return [...list.slice(0, idx), ...list.slice(idx + 1)];
        }
        const next = [...list];
        next[idx] = item;
        return next;
      });
    },
    [tweetsStarredFilter]
  );

  const onRebuildCounts = useCallback(async () => {
    if (!id) return;
    setRebuildCountsLoading(true);
    try {
      await apiFetch(`/api/v1/people/${id}/rebuild-counts`, { method: "POST" });
      Modal.success({
        title: "已同步",
        content: "该人物的条目计数已从数据库写入 KV。",
        mask: { closable: true },
      });
      await reloadPersonAndList();
    } catch (e) {
      Modal.error({
        title: "同步失败",
        content: e instanceof Error ? e.message : "同步失败",
        mask: { closable: true },
      });
    } finally {
      setRebuildCountsLoading(false);
    }
  }, [id, reloadPersonAndList]);

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

  const allowedTabKeys = useMemo(() => new Set(dynamicTabList.map((t) => t.key)), [dynamicTabList]);

  const tabItemsConfig = useMemo(
    () =>
      dynamicTabList.map((t) => ({
        key: t.key,
        label: (
          <span>
            {t.label}
            {t.count > 0 && (
              <Text style={{ marginLeft: 4, fontSize: 12, color: "#9ca3af" }}>
                {t.count}
              </Text>
            )}
          </span>
        ),
        children: <span />,
      })),
    [dynamicTabList]
  );

  const goTab = useCallback(
    (next: TabKey) => {
      if (!id) return;
      const ps = parsePersonDetailPageSize(searchParams);
      const extra =
        next === "twitter"
          ? {
              tweetsStarred: parseTweetsStarredFilter(searchParams),
              pageSize: ps,
              page: parsePersonDetailTweetPage(searchParams),
            }
          : { pageSize: ps };
      navigate(buildPersonDetailPath(id, next, extra));
    },
    [id, navigate, searchParams],
  );

  const goNext = useCallback(() => {
    setFetchParams({ cursor: nextCursor, dir: "next" });
  }, [nextCursor]);

  const goPrev = useCallback(() => {
    setFetchParams({ cursor: prevCursor, dir: "prev" });
  }, [prevCursor]);

  const goPageSize = useCallback(
    (nextSize: ItemPageSize) => {
      if (!id || !tabParsed || tabParsed === "info") return;
      setFetchParams({ cursor: null, dir: "next" });
      const extra =
        tabParsed === "twitter"
          ? { tweetsStarred: tweetsStarredFilter, pageSize: nextSize, page: 1 }
          : { pageSize: nextSize };
      navigate(buildPersonDetailPath(id, tabParsed, extra));
    },
    [id, tabParsed, navigate, tweetsStarredFilter]
  );

  if (!id) {
    return <Navigate to="/people" replace />;
  }

  if (tabParsed === null) {
    return <Navigate to={buildPersonDetailPath(id, "info")} replace />;
  }

  if (tabParsed === "info" && (searchParams.has("pageSize") || searchParams.has("page"))) {
    return <Navigate to={buildPersonDetailPath(id, "info")} replace />;
  }

  const tab = tabParsed;

  if (personBootstrap) {
    return (
      <Flex vertical justify="center" align="center" gap="small" style={{ minHeight: 320 }}>
        <Spin size="large" />
        <Text type="secondary">Loading...</Text>
      </Flex>
    );
  }

  if (!person) {
    return (
      <div style={{ maxWidth: 1200, margin: "0 auto", paddingTop: 48 }}>
        <Result
          status="error"
          title="Person loading failed"
          subTitle="Please check the network or link is correct."
          extra={
            <Link to="/people">
              <Button type="primary">Return to person list</Button>
            </Link>
          }
        />
      </div>
    );
  }

  if (!allowedTabKeys.has(tab)) {
    return <Navigate to={buildPersonDetailPath(id, "info")} replace />;
  }

  if (tab === "twitter" && (!searchParams.has("pageSize") || !searchParams.has("page"))) {
    return (
      <Navigate
        replace
        to={buildPersonDetailPath(id, "twitter", {
          tweetsStarred: tweetsStarredFilter,
          pageSize,
          page: tweetPage,
        })}
      />
    );
  }

  const onDeletePerson = () => {
    if (!id || !person) return;
    Modal.confirm({
      title: "确认删除",
      content: `确认删除 ${person.name}？这会清空 ta 的所有内容和图片。`,
      okText: "删除",
      okType: "danger",
      cancelText: "取消",
      centered: true,
      mask: { closable: true },
      onOk: async () => {
        try {
          await apiFetch(`/api/v1/people/${id}`, { method: "DELETE" });
          navigate("/people");
        } catch (e) {
          Modal.error({
            title: "删除失败",
            content: e instanceof Error ? e.message : "删除失败",
            mask: { closable: true },
          });
          return Promise.reject(e);
        }
      },
    });
  };

  const onDeleteItem = (kind: ItemKind, itemId: number) => {
    Modal.confirm({
      title: "确认删除",
      content: "删除后不可恢复，确定要删除这条记录吗？",
      okText: "删除",
      okType: "danger",
      cancelText: "取消",
      centered: true,
      mask: { closable: true },
      onOk: async () => {
        try {
          await apiFetch(`/api/v1/${kind}/${itemId}`, { method: "DELETE" });
          await reloadPersonAndList();
        } catch (e) {
          Modal.error({
            title: "删除失败",
            content: e instanceof Error ? e.message : "删除失败",
            mask: { closable: true },
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

  const showTabLoading = tab !== "info" && tabLoading;

  const paginationProps = { nextCursor, prevCursor, onNext: goNext, onPrev: goPrev, pageSize, onPageSizeChange: goPageSize };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <PersonDetailHeader
        person={person}
        authed={authed}
        onEditProfile={() => setPersonEditorOpen(true)}
        onRebuildCounts={authed ? () => void onRebuildCounts() : undefined}
        rebuildCountsLoading={rebuildCountsLoading}
        onDeletePerson={authed ? () => void onDeletePerson() : undefined}
      />
      <Tabs
        className="person-detail-tabs-nav-only"
        style={{ marginBottom: 28 }}
        activeKey={tab}
        onChange={(k) => goTab(k as TabKey)}
        items={tabItemsConfig}
        size="large"
      />
      {authed && itemKindForTab && (
        <Flex style={{ marginBottom: token.marginMD }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditor({ kind: itemKindForTab, initial: null })}>
            New Item
          </Button>
        </Flex>
      )}

      <div>
        {tab === "info" && <PersonInfoTab person={person} />}

        {showTabLoading && (
          <Flex align="center" gap="small" style={{ marginBottom: token.marginMD, minHeight: 120 }}>
            <Spin />
            <Text type="secondary">Loading...</Text>
          </Flex>
        )}

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
            starredFilter={tweetsStarredFilter}
            onStarredFilterChange={(next: TweetsStarredFilter) => {
              if (!id) return;
              navigate(buildPersonDetailPath(id, "twitter", { tweetsStarred: next, pageSize, page: 1 }));
            }}
            page={tweetPage}
            totalPages={tweetTotalPages}
            onPageChange={goTweetPage}
            pageSize={pageSize}
            onPageSizeChange={goPageSize}
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

      {editor && id && (
        <ItemEditor
          kind={editor.kind}
          personId={id}
          initial={editor.initial}
          onClose={() => setEditor(null)}
          onSaved={(saved) => {
            const tweetEdit =
              editor.kind === "tweets" &&
              editor.initial &&
              typeof editor.initial.id === "number";
            setEditor(null);
            if (tweetEdit) {
              applyEditedTweetToList(saved);
              return;
            }
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
            void refreshPerson();
          }}
        />
      )}
    </div>
  );
}
