import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useState as useReactState } from "react";

const PAGE_SIZE = 3;
const BOOKS_PAGE_SIZE = 12;
const TWITTER_PAGE_SIZE = 10;
const ANSWER_PAGE_SIZE = 10;

function usePerson(id: string | undefined) {
  const [person, setPerson] = useState<any>(null);
  useEffect(() => {
    if (!id) return;
    fetch(`/api/v1/people/${id}`)
      .then((res) => res.json())
      .then((data) => setPerson(data));
  }, [id]);
  return person;
}

export default function PersonDetail() {
  const { id } = useParams();
  const person = usePerson(id);
  const [tab, setTab] = useState("info");
  const [page, setPage] = useState(1);

  useEffect(() => { setPage(1); }, [tab]);

  if (!person) return <div className="main-center-wrapper"><div className="container">加载中...</div></div>;

  // 兼容 Description/description 字段
  const desc = person.Description || person.description || "";

  // 动态 tabList，只显示有内容的tab，info始终显示
  const dynamicTabList = [
    { key: "info", label: "Info" },
    ...(person.books && person.books.length > 0 ? [{ key: "books", label: "Books" }] : []),
    ...(person.articles && person.articles.length > 0 ? [{ key: "articles", label: "Articles" }] : []),
    ...(person.videos && person.videos.length > 0 ? [{ key: "videos", label: "Videos" }] : []),
    ...(person.twitter && person.twitter.length > 0 ? [{ key: "twitter", label: "Twitter" }] : []),
    ...(person.answers && person.answers.length > 0 ? [{ key: "answers", label: "Answer" }] : []),
  ];

  // 分页
  const getPaged = (arr: any[]) => {
    if (tab === "books") {
      return arr?.slice((page - 1) * BOOKS_PAGE_SIZE, page * BOOKS_PAGE_SIZE) || [];
    }
    if (tab === "twitter") {
      return arr?.slice((page - 1) * TWITTER_PAGE_SIZE, page * TWITTER_PAGE_SIZE) || [];
    }
    if (tab === "answers") {
      return arr?.slice((page - 1) * ANSWER_PAGE_SIZE, page * ANSWER_PAGE_SIZE) || [];
    }
    return arr?.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) || [];
  };
  const total = (person[tab] && Array.isArray(person[tab])) ? person[tab].length : 0;

  // 时间戳转UTC字符串
  const formatDatetime = (dt: string) => {
    if (/^\d+$/.test(dt)) {
      let ts = Number(dt);
      if (dt.length === 10) ts = ts * 1000; // 秒转毫秒
      const d = new Date(ts);
      return d.toISOString().replace('T', ' ').replace('Z', '');
    }
    return dt;
  };

  return (
    <div className="main-center-wrapper">
      <div className="container" style={{ alignItems: "stretch" }}>
        <Link to="/people" className="mb-4 text-blue-700 font-bold hover:underline block">&lt; 返回</Link>
        <div className="flex items-center mb-8">
          <div className="avatar">
            <div className="w-24 rounded">
              <img src={person.avatar} alt={person.name} />
            </div>
          </div>
          <div className="ml-8">
            <h1 style={{ marginBottom: 8 }}>{person.name}</h1>
          </div>
        </div>
        <div role="tablist" className="tabs tabs-border mb-6">
          {dynamicTabList.map(t => (
            <a
              role="tab"
              key={t.key}
              className={`tab${tab === t.key ? " tab-active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </a>
          ))}
        </div>
        <PaginationTabContext.Provider value={{tab}}>
          <div>
            {tab === "info" && (
              <div>
                <div><b>姓名：</b>{person.name}</div>
                <div><b>简介：</b>{desc}</div>
              </div>
            )}
            {tab === "books" && (
              <div>
                <div style={{display: 'flex', flexWrap: 'wrap', gap: '32px 24px', justifyContent: 'flex-start'}}>
                  {getPaged(person.books || []).map((item: any, i: number) => (
                    <div key={i} style={{ background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                      {item.cover && <img src={item.cover} alt={item.title} style={{width: '10rem', height: '10rem', objectFit: 'cover', borderRadius: 4, marginBottom: 12}} />}
                      <a href={item.url} target="_blank" rel="noopener noreferrer" style={{fontWeight: 700, fontSize: 16, color: '#0078d7', textAlign: 'center', textDecoration: 'none'}}>{item.title}</a>
                    </div>
                  ))}
                </div>
                <Pagination page={page} setPage={setPage} total={total} tab={tab} />
              </div>
            )}
            {tab === "articles" && (
              <div>
                <ArticleList articles={getPaged(person.articles || [])} />
                <Pagination page={page} setPage={setPage} total={total} tab={tab} />
              </div>
            )}
            {tab === "videos" && (
              <div>
                <ul>
                  {getPaged(person.videos || []).map((item: any, i: number) => (
                    <li key={i} style={{marginBottom: 12}}>
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline font-bold">{item.title}</a>
                    </li>
                  ))}
                </ul>
                <Pagination page={page} setPage={setPage} total={total} tab={tab} />
              </div>
            )}
            {tab === "twitter" && (
              <div>
                {getPaged(person.twitter || []).map((item: { datetime: string; content: string }, i: number) => (

                  <div
                    key={i} className="card card-border bg-base-100 mb-4"
                  >
                    <div className="card-body p-4">
                      <div className="text-xs text-gray-400 mb-1">{item.datetime}</div>
                      <div className="text-base whitespace-pre-wrap" dangerouslySetInnerHTML={{__html: item.content}}></div>
                    </div>
                  </div>
                ))}
                <Pagination page={page} setPage={setPage} total={total} tab={tab} />
              </div>
            )}
            {tab === "answers" && (
              <div>
                <ul>
                  {getPaged(person.answers || []).map((item: { datetime: string; question: string; content: string }, i: number) => (
                    <li key={i} className="mb-4 card card-border bg-base-100">
                      <div className="card-body p-4">
                        <div className="text-xs text-gray-400 mb-1">{formatDatetime(item.datetime)}</div>
                        <div className="font-bold mb-2">Q: {item.question}</div>
                        <div className="text-base whitespace-pre-wrap" dangerouslySetInnerHTML={{__html: item.content}}></div>
                      </div>
                    </li>
                  ))}
                </ul>
                <Pagination page={page} setPage={setPage} total={total} tab={tab} />
              </div>
            )}
          </div>
        </PaginationTabContext.Provider>
      </div>
    </div>
  );
}

// 分页组件
type PaginationProps = { page: number, setPage: (n: number) => void, total: number, tab: string };
function Pagination({ page, setPage, total, tab }: PaginationProps) {
  let pageSize = PAGE_SIZE;
  if (tab === "books") pageSize = BOOKS_PAGE_SIZE;
  if (tab === "twitter") pageSize = TWITTER_PAGE_SIZE;
  if (tab === "answers") pageSize = ANSWER_PAGE_SIZE;
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

// 用于分页组件感知当前tab
const PaginationTabContext = React.createContext<{tab: string}>({tab: "info"});

// 文章列表与弹窗
function ArticleList({ articles }: { articles: any[] }) {
  const [modalOpen, setModalOpen] = useReactState(false);
  const [modalContent, setModalContent] = useReactState("");

  const handleOpen = (content: string) => {
    setModalContent(content);
    setModalOpen(true);
  };

  return (
    <div>
      <ul>
        {articles.map((item, i) => {
          // 取第一行作为标题，去掉#和空格
          const firstLine = (item.content.split('\n')[0] || "").replace(/^#+\s*/, "");
          return (
            <li key={i} style={{marginBottom: 16}}>
              <button className="text-blue-700 underline font-bold hover:text-blue-900" onClick={() => handleOpen(item.content)}>{firstLine}</button>
            </li>
          );
        })}
      </ul>
      {/* daisyUI Modal */}
      <input type="checkbox" className="modal-toggle" checked={modalOpen} readOnly />
      <div className="modal" style={{zIndex: 1000}}>
        <div className="modal-box whitespace-pre-wrap" style={{width: '80vw', maxWidth: '80vw'}}>
          <label className="btn btn-sm btn-circle absolute right-2 top-2" onClick={() => setModalOpen(false)}>✕</label>
          <div style={{whiteSpace: 'pre-wrap'}}>{modalContent}</div>
        </div>
        <label className="modal-backdrop" onClick={() => setModalOpen(false)}></label>
      </div>
    </div>
  );
} 