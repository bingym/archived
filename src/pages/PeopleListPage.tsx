import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Avatar, Button, Card, Col, Empty, Flex, Row, Spin, Tag, Typography, theme } from "antd";
import { EyeInvisibleOutlined, PlusOutlined, UserOutlined } from "@ant-design/icons";
import PersonEditor from "../components/PersonEditor";
import { apiFetch, useIsAuthed } from "../auth";
import { resolveImg } from "../lib/img";

const { Title, Text, Paragraph } = Typography;

interface PersonInfo {
  id: string;
  name: string;
  avatar: string | null;
  description: string | null;
  /** 仅管理员视角下出现 */
  visible?: boolean;
}

export default function PeopleListPage() {
  const { token } = theme.useToken();
  const authed = useIsAuthed();
  const [people, setPeople] = useState<PersonInfo[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [createEditorOpen, setCreateEditorOpen] = useState(false);

  const reload = useCallback(() => {
    setListLoading(true);
    apiFetch<PersonInfo[]>("/api/v1/people")
      .then(setPeople)
      .catch(() => setPeople([]))
      .finally(() => setListLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      <Flex justify="space-between" align="center" style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0, fontWeight: 600, letterSpacing: "0.2px" }}>
          People
        </Title>
        {authed && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateEditorOpen(true)}>
            New Person
          </Button>
        )}
      </Flex>

      {listLoading ? (
        <Flex vertical justify="center" align="center" gap="small" style={{ minHeight: 200, padding: token.paddingLG }}>
          <Spin />
          <Text type="secondary">Loading...</Text>
        </Flex>
      ) : people.length === 0 ? (
        <Empty style={{ padding: token.paddingLG }} description="No data" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <Row gutter={[20, 20]}>
          {people.map((person) => (
            <Col key={person.id} xs={12} sm={8} md={8} lg={8}>
              <Link
                to={`/people/${person.id}/info`}
                className="person-card-link"
                style={{
                  display: "block",
                  height: "100%",
                  color: "inherit",
                  textDecoration: "none",
                }}
              >
                <Card
                  styles={{
                    body: {
                      padding: "24px 16px 20px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      textAlign: "center",
                      position: "relative",
                    },
                  }}
                  style={{
                    height: "100%",
                    borderRadius: 12,
                    border: "1px solid #e8e5e0",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
                    opacity: person.visible === false ? 0.55 : 1,
                  }}
                >
                  {person.visible === false && (
                    <Tag
                      color="default"
                      icon={<EyeInvisibleOutlined />}
                      style={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        margin: 0,
                        fontSize: token.fontSizeSM,
                      }}
                    >
                      隐藏
                    </Tag>
                  )}
                  {person.avatar ? (
                    <Avatar
                      src={resolveImg(person.avatar)}
                      alt={person.name}
                      size={76}
                      shape="circle"
                      style={{ flexShrink: 0, border: "2px solid #f0eeeb" }}
                    />
                  ) : (
                    <Avatar
                      size={76}
                      shape="circle"
                      icon={<UserOutlined />}
                      style={{
                        flexShrink: 0,
                        background: "#f0eeeb",
                        color: "#9ca3af",
                        fontSize: 28,
                      }}
                    />
                  )}
                  <Title
                    level={5}
                    ellipsis={{ tooltip: person.name }}
                    style={{ margin: "12px 0 0", fontSize: 15, lineHeight: 1.4, width: "100%", fontWeight: 600 }}
                  >
                    {person.name}
                  </Title>
                  <Paragraph
                    type="secondary"
                    ellipsis={{ rows: 2, tooltip: person.description || undefined }}
                    style={{
                      marginTop: 4,
                      marginBottom: 0,
                      fontSize: 13,
                      lineHeight: 1.5,
                      width: "100%",
                      color: "#6b7280",
                    }}
                  >
                    {person.description?.trim() ? person.description : "—"}
                  </Paragraph>
                </Card>
              </Link>
            </Col>
          ))}
        </Row>
      )}

      {createEditorOpen && (
        <PersonEditor
          mode="create"
          onClose={() => setCreateEditorOpen(false)}
          onSaved={() => {
            setCreateEditorOpen(false);
            reload();
          }}
        />
      )}
    </div>
  );
}
