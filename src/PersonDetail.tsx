import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useState as useReactState } from "react";

const PAGE_SIZE = 3;
const BOOKS_PAGE_SIZE = 12;

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

const tabList = [
  { key: "info", label: "Info" },
  { key: "books", label: "Books" },
  { key: "articles", label: "Articles" },
  { key: "videos", label: "Videos" },
  { key: "twitter", label: "Twitter" },
];

export default function PersonDetail() {
  const { id } = useParams();
  const person = usePerson(id);
  const [tab, setTab] = useState("info");
  const [page, setPage] = useState(1);

  useEffect(() => { setPage(1); }, [tab]);

  if (!person) return <div className="main-center-wrapper"><div className="container">加载中...</div></div>;

  // 兼容 Description/description 字段
  const desc = person.Description || person.description || "";

  // 分页
  const getPaged = (arr: any[]) => {
    if (tab === "books") {
      return arr?.slice((page - 1) * BOOKS_PAGE_SIZE, page * BOOKS_PAGE_SIZE) || [];
    }
    return arr?.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) || [];
  };
  const total = (person[tab] && Array.isArray(person[tab])) ? person[tab].length : 0;

  return (
    <div className="main-center-wrapper">
      <div className="container" style={{ alignItems: "stretch" }}>
        <Link to="/people" className="mb-4 text-blue-700 font-bold hover:underline block">&lt; 返回</Link>
        <div className="flex items-center mb-8">
          <img src={person.avatar} alt={person.name} className="avatar" />
          <div className="ml-8">
            <h1 style={{ marginBottom: 8 }}>{person.name}</h1>
            <div style={{ color: "#333", fontSize: 18, maxWidth: 600 }}>{desc}</div>
          </div>
        </div>
        <div className="tabs tabs-boxed mb-6">
          {tabList.map(t => (
            <a
              key={t.key}
              className={`tab${tab === t.key ? " tab-active bg-blue-700 text-white" : ""}`}
              onClick={() => setTab(t.key)}
            >{t.label}</a>
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
                    <div key={i} style={{width: '22%', minWidth: 160, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                      {item.cover && <img src={item.cover} alt={item.title} style={{width: '100%', height: 180, objectFit: 'cover', borderRadius: 4, marginBottom: 12}} />}
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
                {getPaged(person.twitter || []).map((item: any, i: number) => (
                  <div key={i} className="card mb-4 bg-blue-700 text-white">
                    <div className="font-bold">{item.datetime}</div>
                    <div>{item.content}</div>
                  </div>
                ))}
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
  const pageSize = tab === "books" ? BOOKS_PAGE_SIZE : PAGE_SIZE;
  const pageCount = Math.ceil(total / pageSize);
  if (pageCount <= 1) return null;
  return (
    <div className="flex justify-center mt-4">
      <div className="join">
        <button className="join-item btn btn-sm" disabled={page === 1} onClick={() => setPage(page - 1)}>上一页</button>
        <button className="join-item btn btn-sm btn-active">{page}/{pageCount}</button>
        <button className="join-item btn btn-sm" disabled={page === pageCount} onClick={() => setPage(page + 1)}>下一页</button>
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