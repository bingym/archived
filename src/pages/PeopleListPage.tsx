import { lazy, Suspense, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Avatar, Button, Card, Divider, Empty, Flex, Modal, Typography, theme } from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined, RightOutlined, UserOutlined } from "@ant-design/icons";
import type { PersonForm } from "../components/PersonEditor";
import { apiFetch, useIsAuthed } from "../auth";
import { resolveImg } from "../lib/img";

const PersonEditor = lazy(() => import("../components/PersonEditor"));

const { Title, Text } = Typography;

interface PersonInfo {
  id: string;
  name: string;
  avatar: string | null;
  description: string | null;
}

export default function PeopleListPage() {
  const { token } = theme.useToken();
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

  const rowPadding = `${token.paddingContentVerticalSM}px ${token.paddingLG}px`;

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      <Flex justify="space-between" align="center" style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          人物
        </Title>
        {authed && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditor({ mode: "create" })}>
            新建人物
          </Button>
        )}
      </Flex>
      <Card styles={{ body: { padding: 0 } }}>
        {people.length === 0 ? (
          <Empty style={{ padding: token.paddingXL }} description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          people.map((person, index) => (
            <div key={person.id}>
              {index > 0 && <Divider style={{ margin: 0 }} />}
              <Flex align="center" justify="space-between" gap={token.marginMD} wrap="wrap" style={{ padding: rowPadding }}>
                <Flex align="center" gap={token.marginMD} style={{ flex: 1, minWidth: 0 }}>
                  {person.avatar ? (
                    <Avatar src={resolveImg(person.avatar)} alt={person.name} size={56} />
                  ) : (
                    <Avatar size={56} icon={<UserOutlined />} />
                  )}
                  <Flex vertical gap={token.marginXXS} style={{ minWidth: 0 }}>
                    <Text strong>{person.name}</Text>
                    <Text type="secondary" ellipsis={{ tooltip: person.description ?? undefined }} style={{ maxWidth: 480 }}>
                      {person.description}
                    </Text>
                  </Flex>
                </Flex>
                <Flex align="center" gap={token.marginXXS} wrap="wrap" style={{ flexShrink: 0 }}>
                  {authed && (
                    <>
                      <Button type="text" icon={<EditOutlined />} aria-label="编辑" onClick={() => setEditor({ mode: "edit", initial: person })} />
                      <Button type="text" danger icon={<DeleteOutlined />} aria-label="删除" onClick={() => void onDelete(person)} />
                    </>
                  )}
                  <Link to={`/people/${person.id}/info`}>
                    <Button type="link" icon={<RightOutlined />} iconPosition="end">
                      查看
                    </Button>
                  </Link>
                </Flex>
              </Flex>
            </div>
          ))
        )}
      </Card>
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
