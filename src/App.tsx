import { useEffect, useState } from "react";
import { Routes, Route, Link } from "react-router-dom";
import { Avatar, Button, Layout, List, Typography } from "antd";
import { UserOutlined } from "@ant-design/icons";
import "./App.css";
import PersonDetail from "./PersonDetail";
import LoginButton from "./components/LoginButton";
import PersonEditor, { type PersonForm } from "./components/PersonEditor";
import { apiFetch, useIsAuthed, useStorageSync } from "./auth";
import { resolveImg } from "./lib/img";

const { Header } = Layout;
const { Text } = Typography;

interface PersonInfo {
  id: string;
  name: string;
  avatar: string | null;
  description: string | null;
}

function TopBar() {
  return (
    <Header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingInline: 24,
        background: "#fff",
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
        position: "sticky",
        top: 0,
        zIndex: 10,
        height: 56,
        lineHeight: "56px",
      }}
    >
      <Link to="/people">
        <Button type="text" size="large" style={{ fontSize: 18, fontWeight: 600 }}>
          Archived
        </Button>
      </Link>
      <LoginButton />
    </Header>
  );
}

function PeopleList() {
  const authed = useIsAuthed();
  const [people, setPeople] = useState<PersonInfo[]>([]);
  const [editor, setEditor] = useState<{ mode: "create" | "edit"; initial?: PersonInfo } | null>(null);

  const reload = () => {
    apiFetch<PersonInfo[]>("/api/v1/people")
      .then(setPeople)
      .catch(() => setPeople([]));
  };

  useEffect(() => {
    reload();
  }, []);

  const onDelete = async (p: PersonInfo) => {
    if (!confirm(`确认删除 ${p.name}？这会清空 ta 的所有内容和图片。`)) return;
    try {
      await apiFetch(`/api/v1/people/${p.id}`, { method: "DELETE" });
      reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : "删除失败");
    }
  };

  return (
    <div className="main-center-wrapper w-full justify-center">
      <div className="w-1/2 mx-auto mt-8 px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">People</h1>
          {authed && (
            <Button type="primary" size="small" onClick={() => setEditor({ mode: "create" })}>
              + 新建
            </Button>
          )}
        </div>
        <List
          bordered
          style={{ background: "#fff", borderRadius: 8, overflow: "hidden" }}
          dataSource={people}
          locale={{ emptyText: "暂无数据" }}
          renderItem={(person) => (
            <List.Item
              actions={[
                ...(authed
                  ? [
                      <Button key="edit" type="link" size="small" onClick={() => setEditor({ mode: "edit", initial: person })}>
                        编辑
                      </Button>,
                      <Button key="del" type="link" size="small" danger onClick={() => void onDelete(person)}>
                        删除
                      </Button>,
                    ]
                  : []),
                <Link key="go" to={`/people/${person.id}`}>
                  <Button type="primary" size="small">
                    Go
                  </Button>
                </Link>,
              ]}
            >
              <List.Item.Meta
                avatar={
                  person.avatar ? (
                    <Avatar src={resolveImg(person.avatar)} alt={person.name} size={56} />
                  ) : (
                    <Avatar size={56} icon={<UserOutlined />} />
                  )
                }
                title={<span className="text-lg font-semibold">{person.name}</span>}
                description={
                  <Text type="secondary" className="max-w-xs line-clamp-2 block">
                    {person.description}
                  </Text>
                }
              />
            </List.Item>
          )}
        />
      </div>
      {editor && (
        <PersonEditor
          mode={editor.mode}
          initial={editor.initial as PersonForm | undefined}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

function App() {
  useStorageSync();
  return (
    <>
      <TopBar />
      <Routes>
        <Route path="/" element={<PeopleList />} />
        <Route path="/people" element={<PeopleList />} />
        <Route path="/people/:id" element={<PersonDetail />} />
      </Routes>
    </>
  );
}

export default App;
