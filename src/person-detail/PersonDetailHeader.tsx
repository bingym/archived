import { Link } from "react-router-dom";
import { Avatar, Button, Flex, Tag, Typography, theme } from "antd";
import {
  ArrowLeftOutlined,
  CloudSyncOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeInvisibleOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { resolveImg } from "../lib/img";
import type { PersonSummary } from "./types";

const { Title, Text } = Typography;

interface Props {
  person: PersonSummary;
  authed: boolean;
  onEditProfile: () => void;
  onDeletePerson?: () => void;
  onRebuildCounts?: () => void;
  rebuildCountsLoading?: boolean;
}

export default function PersonDetailHeader({
  person,
  authed,
  onEditProfile,
  onDeletePerson,
  onRebuildCounts,
  rebuildCountsLoading,
}: Props) {
  const { token } = theme.useToken();
  return (
    <div style={{ marginBottom: 32 }}>
      <Link
        to="/people"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          color: "#6b7280",
          textDecoration: "none",
          fontSize: 13,
          marginBottom: 20,
          transition: "color 150ms",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "#2f3b30"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "#6b7280"; }}
      >
        <ArrowLeftOutlined style={{ fontSize: 12 }} />
        返回列表
      </Link>

      <Flex align="center" gap={20} wrap="wrap">
        {person.avatar ? (
          <Avatar
            src={resolveImg(person.avatar)}
            alt={person.name}
            size={120}
            shape="square"
            style={{ borderRadius: 16, border: "2px solid #f0eeeb", flexShrink: 0 }}
          />
        ) : (
          <Avatar
            size={120}
            shape="square"
            icon={<UserOutlined />}
            style={{ borderRadius: 16, background: "#f0eeeb", color: "#9ca3af", fontSize: 40, flexShrink: 0 }}
          />
        )}
        <Flex vertical gap={4} style={{ flex: 1, minWidth: 200 }}>
          <Flex align="center" gap={token.marginXS} wrap="wrap">
            <Title level={1} style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "0.2px" }} ellipsis={{ rows: 2, tooltip: person.name }}>
              {person.name}
            </Title>
            {authed && person.visible === false && (
              <Tag color="warning" icon={<EyeInvisibleOutlined />} style={{ marginInlineEnd: 0 }}>
                未登录访客不可见
              </Tag>
            )}
          </Flex>
          {person.description && (
            <Text type="secondary" style={{ fontSize: 14, lineHeight: 1.6, marginTop: 4 }}>
              {person.description}
            </Text>
          )}
        </Flex>
        {authed && (
          <Flex gap={token.marginXS} wrap="wrap" style={{ alignSelf: "flex-start" }}>
            <Button type="default" icon={<EditOutlined />} onClick={onEditProfile} />
            {onRebuildCounts && (
              <Button
                type="default"
                icon={<CloudSyncOutlined />}
                loading={rebuildCountsLoading}
                onClick={onRebuildCounts}
              >
                Sync Count
              </Button>
            )}
            {onDeletePerson && (
              <Button type="default" danger icon={<DeleteOutlined />} onClick={onDeletePerson} />
            )}
          </Flex>
        )}
      </Flex>
    </div>
  );
}
