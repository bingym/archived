import { lazy, Suspense, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Avatar, Button, List, Modal, Typography } from "antd";
import {EditOutlined, DeleteOutlined, UserOutlined } from "@ant-design/icons";
import type { PersonForm } from "../components/PersonEditor";
import { apiFetch, useIsAuthed } from "../auth";
import { resolveImg } from "../lib/img";

const PersonEditor = lazy(() => import("../components/PersonEditor"));

const { Text } = Typography;

interface PersonInfo {
  id: string;
  name: string;
  avatar: string | null;
  description: string | null;
}

export default function PeopleListPage() {
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

  const onDelete = (p: PersonInfo) => {
    Modal.confirm({
      title: "确认删除",
      content: `确认删除 ${p.name}？这会清空 ta 的所有内容和图片。`,
      okText: "删除",
      okType: "danger",
      cancelText: "取消",
      centered: true,
      maskClosable: true,
      onOk: async () => {
        try {
          await apiFetch(`/api/v1/people/${p.id}`, { method: "DELETE" });
          reload();
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
                      <Button key="edit" type="link" size="small" icon={<EditOutlined />} onClick={() => setEditor({ mode: "edit", initial: person })}>
                      </Button>,
                      <Button key="del" type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => void onDelete(person)}>
                      </Button>,
                    ]
                  : []),
                <Link key="go" to={`/people/${person.id}`}>
                  <Button type="primary" size="small" >
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
        <Suspense fallback={null}>
          <PersonEditor
            mode={editor.mode}
            initial={editor.initial as PersonForm | undefined}
            onClose={() => setEditor(null)}
            onSaved={() => {
              setEditor(null);
              reload();
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
