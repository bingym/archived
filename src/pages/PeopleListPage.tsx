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
      <Flex justify="space-between" align="center" style={{ marginBottom: token.marginMD }}>
        <Title level={3} style={{ margin: 0 }}>
          People
        </Title>
        {authed && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateEditorOpen(true)}>
            New Person
          </Button>
        )}
      </Flex>

      {listLoading ? (
        <Flex vertical justify="center" align="center" gap="small" style={{ minHeight: 160, padding: token.paddingLG }}>
          <Spin />
          <Text type="secondary">Loading...</Text>
        </Flex>
      ) : people.length === 0 ? (
        <Empty style={{ padding: token.paddingLG }} description="No data" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <Row gutter={[token.marginSM, token.marginSM]}>
          {people.map((person) => (
            <Col key={person.id} xs={12} sm={8} md={6} lg={6}>
              <Link
                to={`/people/${person.id}/info`}
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
                      padding: token.paddingSM,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      textAlign: "center",
                      position: "relative",
                    },
                  }}
                  style={{
                    height: "100%",
                    borderRadius: token.borderRadius,
                    borderColor: token.colorBorderSecondary,
                    boxShadow: "none",
                    opacity: person.visible === false ? 0.6 : 1,
                  }}
                >
                  {person.visible === false && (
                    <Tag
                      color="default"
                      icon={<EyeInvisibleOutlined />}
                      style={{
                        position: "absolute",
                        top: token.marginXXS,
                        right: token.marginXXS,
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
                      size={48}
                      shape="square"
                      style={{ borderRadius: token.borderRadiusSM, flexShrink: 0 }}
                    />
                  ) : (
                    <Avatar
                      size={48}
                      shape="square"
                      icon={<UserOutlined />}
                      style={{
                        borderRadius: token.borderRadiusSM,
                        flexShrink: 0,
                        background: token.colorFillAlter,
                      }}
                    />
                  )}
                  <Title
                    level={5}
                    ellipsis={{ tooltip: person.name }}
                    style={{ margin: `${token.marginXS}px 0 0`, fontSize: token.fontSize, lineHeight: 1.3, width: "100%" }}
                  >
                    {person.name}
                  </Title>
                  <Paragraph
                    type="secondary"
                    ellipsis={{ rows: 2, tooltip: person.description || undefined }}
                    style={{
                      marginTop: 2,
                      marginBottom: 0,
                      fontSize: token.fontSizeSM,
                      lineHeight: 1.4,
                      width: "100%",
                    }}
                  >
                    {person.description?.trim() ? person.description : "No description"}
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
