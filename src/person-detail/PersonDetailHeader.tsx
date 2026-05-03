import { Link } from "react-router-dom";
import { Avatar, Breadcrumb, Button, Divider, Flex, Typography, theme } from "antd";
import { CloudSyncOutlined, DeleteOutlined, EditOutlined, UserOutlined } from "@ant-design/icons";
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
    <div style={{ marginBottom: token.marginLG }}>
      <Breadcrumb
        items={[
          {
            title: (
              <Link to="/people" style={{ color: "inherit" }}>
                人物列表
              </Link>
            ),
          },
          { title: <Text strong>{person.name}</Text> },
        ]}
      />
      <Divider style={{ margin: `${token.marginMD}px 0` }} />
      <Flex align="center" gap={token.marginMD} wrap="wrap">
        {person.avatar ? (
          <Avatar src={resolveImg(person.avatar)} alt={person.name} size={96} shape="square" style={{ borderRadius: token.borderRadiusLG }} />
        ) : (
          <Avatar size={96} shape="square" icon={<UserOutlined />} style={{ borderRadius: token.borderRadiusLG, background: token.colorFillAlter }} />
        )}
        <Flex vertical gap={token.marginXXS} style={{ flex: 1, minWidth: 200 }}>
          <Title level={2} style={{ margin: 0 }} ellipsis={{ rows: 2, tooltip: person.name }}>
            {person.name}
          </Title>
        </Flex>
        {authed && (
          <Flex gap={token.marginXS} wrap="wrap">
            <Button type="default" icon={<EditOutlined />} onClick={onEditProfile}>
              编辑信息
            </Button>
            {onRebuildCounts && (
              <Button
                type="default"
                icon={<CloudSyncOutlined />}
                loading={rebuildCountsLoading}
                onClick={onRebuildCounts}
              >
                同步条目计数
              </Button>
            )}
            {onDeletePerson && (
              <Button type="default" danger icon={<DeleteOutlined />} onClick={onDeletePerson}>
                删除人物
              </Button>
            )}
          </Flex>
        )}
      </Flex>
    </div>
  );
}
