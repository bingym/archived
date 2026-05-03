import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button, Flex, Modal, Result, Spin, Tabs, Typography, theme } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { apiFetch, useIsAuthed } from "./auth";
import ItemEditor, { type ItemKind } from "./components/ItemEditor";
import PersonEditor from "./components/PersonEditor";
import { PAGE_SIZE, TAB_TO_KIND, tabToItemsKind } from "./person-detail/constants";
import { buildPersonDetailPath, parsePersonDetailPage, parsePersonDetailTabParam } from "./person-detail/personDetailUrl";
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

export default function PersonDetail() {
  const { token } = theme.useToken();
  const navigate = useNavigate();
  const { id, tab: tabSegment } = useParams<{ id: string; tab: string }>();
  const [searchParams] = useSearchParams();

  const authed = useIsAuthed();
  const [person, setPerson] = useState<PersonSummary | null>(null);
  const [tabItems, setTabItems] = useState<unknown[]>([]);
  const [tabTotal, setTabTotal] = useState(0);
  const [tabLoading, setTabLoading] = useState(false);
  const [listNonce, setListNonce] = useState(0);
  const [editor, setEditor] = useState<
    | { kind: ItemKind; initial: Record<string, unknown> | null }
    | null
  >(null);
  const [personEditorOpen, setPersonEditorOpen] = useState(false);

  const tabParsed = parsePersonDetailTabParam(tabSegment);
  const pageFromUrl = parsePersonDetailPage(searchParams);
  const page = tabParsed === null || tabParsed === "info" ? 1 : pageFromUrl;

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
      setTabTotal(0);
      setTabLoading(false);
      return;
    }
    const kind = tabToItemsKind(tabParsed);
    if (!kind) {
      setTabItems([]);
      setTabTotal(0);
      setTabLoading(false);
      return;
    }
    let cancelled = false;
    setTabLoading(true);
    apiFetch<{ items: unknown[]; total: number }>(
      `/api/v1/people/${id}/${kind}?page=${page}&pageSize=${PAGE_SIZE}`
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
  }, [id, tabParsed, page, listNonce]);

  const reloadPersonAndList = useCallback(async () => {
    await refreshPerson();
    setListNonce((n) => n + 1);
  }, [refreshPerson]);

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
              <Text type="secondary" style={{ marginLeft: 4, fontSize: token.fontSizeSM }}>
                {" "}
                ({t.count})
              </Text>
            )}
          </span>
        ),
        children: <span />,
      })),
    [dynamicTabList, token.fontSizeSM]
  );

  const goTab = useCallback(
    (next: TabKey) => {
      if (!id) return;
      navigate(buildPersonDetailPath(id, next, 1));
    },
    [id, navigate]
  );

  const goPage = useCallback(
    (nextPage: number) => {
      if (!id || !tabParsed) return;
      navigate(buildPersonDetailPath(id, tabParsed, nextPage));
    },
    [id, tabParsed, navigate]
  );

  if (!id) {
    return <Navigate to="/people" replace />;
  }

  if (tabParsed === null) {
    return <Navigate to={buildPersonDetailPath(id, "info", 1)} replace />;
  }

  if (tabParsed === "info" && searchParams.has("page")) {
    return <Navigate to={buildPersonDetailPath(id, "info", 1)} replace />;
  }

  const tab = tabParsed;

  if (personBootstrap) {
    return (
      <Flex vertical justify="center" align="center" gap="small" style={{ minHeight: 320 }}>
        <Spin size="large" />
        <Text type="secondary">加载中…</Text>
      </Flex>
    );
  }

  if (!person) {
    return (
      <div style={{ maxWidth: 1200, margin: "0 auto", paddingTop: 48 }}>
        <Result
          status="error"
          title="人物加载失败"
          subTitle="请检查网络或链接是否正确。"
          extra={
            <Link to="/people">
              <Button type="primary">返回人物列表</Button>
            </Link>
          }
        />
      </div>
    );
  }

  if (!allowedTabKeys.has(tab)) {
    return <Navigate to={buildPersonDetailPath(id, "info", 1)} replace />;
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

  const paginationProps = { page, setPage: goPage, total: tabTotal, pageSize: PAGE_SIZE };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <PersonDetailHeader
        person={person}
        authed={authed}
        onEditProfile={() => setPersonEditorOpen(true)}
        onDeletePerson={authed ? () => void onDeletePerson() : undefined}
      />
      <Tabs
        className="person-detail-tabs-nav-only"
        style={{ marginBottom: token.marginLG }}
        activeKey={tab}
        onChange={(k) => goTab(k as TabKey)}
        items={tabItemsConfig}
      />
      {authed && itemKindForTab && (
        <Flex style={{ marginBottom: token.marginMD }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditor({ kind: itemKindForTab, initial: null })}>
            新增条目
          </Button>
        </Flex>
      )}

      <div>
        {tab === "info" && <PersonInfoTab person={person} />}

        {showTabLoading && (
          <Flex align="center" gap="small" style={{ marginBottom: token.marginMD, minHeight: 120 }}>
            <Spin />
            <Text type="secondary">加载中…</Text>
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
            void refreshPerson();
          }}
        />
      )}
    </div>
  );
}
