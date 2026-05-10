import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Avatar, Button, Flex, Tag, Typography } from "antd";
import {
  ArrowLeftOutlined,
  CloudSyncOutlined,
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  EyeInvisibleOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { resolveImg } from "../lib/img";
import type { PersonSummary, TabKey } from "./types";

const { Title, Text } = Typography;

interface NavItem {
  key: TabKey;
  label: string;
  count: number;
}

interface Props {
  person: PersonSummary;
  authed: boolean;
  activeTab: TabKey;
  navItems: NavItem[];
  onTabChange: (tab: TabKey) => void;
  onEditProfile: () => void;
  onDeletePerson?: () => void;
  onRebuildCounts?: () => void;
  rebuildCountsLoading?: boolean;
}

function MobileNavDropdown({ navItems, activeTab, onTabChange }: { navItems: NavItem[]; activeTab: TabKey; onTabChange: (tab: TabKey) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const active = navItems.find((n) => n.key === activeTab);

  return (
    <div className="sidebar-nav-mobile" ref={ref}>
      <button
        type="button"
        className="sidebar-nav-mobile-trigger"
        onClick={() => setOpen((v) => !v)}
      >
        <span>{active?.label ?? "—"}</span>
        {active && active.count > 0 && (
          <span className="sidebar-nav-mobile-trigger-count">{active.count}</span>
        )}
        <DownOutlined className={`sidebar-nav-mobile-arrow${open ? " sidebar-nav-mobile-arrow-open" : ""}`} />
      </button>
      {open && (
        <div className="sidebar-nav-mobile-panel">
          {navItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`sidebar-nav-mobile-item${activeTab === item.key ? " sidebar-nav-mobile-item-active" : ""}`}
              onClick={() => { onTabChange(item.key); setOpen(false); }}
            >
              <span>{item.label}</span>
              {item.count > 0 && (
                <span className="sidebar-nav-item-count">{item.count}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PersonDetailSidebar({
  person,
  authed,
  activeTab,
  navItems,
  onTabChange,
  onEditProfile,
  onDeletePerson,
  onRebuildCounts,
  rebuildCountsLoading,
}: Props) {
  return (
    <aside className="detail-sidebar">
      <Link
        to="/people"
        className="sidebar-back-link"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          color: "#6b7280",
          textDecoration: "none",
          fontSize: 13,
          marginBottom: 20,
        }}
      >
        <ArrowLeftOutlined style={{ fontSize: 11 }} />
        返回列表
      </Link>

      <Flex vertical align="center" style={{ marginBottom: 20 }}>
        {person.avatar ? (
          <Avatar
            src={resolveImg(person.avatar, { width: 160, fit: "cover" })}
            alt={person.name}
            size={80}
            shape="square"
            style={{ borderRadius: 14, border: "2px solid #f0eeeb" }}
          />
        ) : (
          <Avatar
            size={80}
            shape="square"
            icon={<UserOutlined />}
            style={{ borderRadius: 14, background: "#f0eeeb", color: "#9ca3af", fontSize: 28 }}
          />
        )}
        <Flex align="center" gap={6} wrap="wrap" justify="center" style={{ marginTop: 12, width: "100%" }}>
          <Title
            level={4}
            style={{ margin: 0, fontSize: 16, fontWeight: 700, textAlign: "center" }}
            ellipsis={{ rows: 2, tooltip: person.name }}
          >
            {person.name}
          </Title>
          {authed && person.visible === false && (
            <Tag color="warning" icon={<EyeInvisibleOutlined />} style={{ margin: 0, fontSize: 11 }}>
              隐藏
            </Tag>
          )}
        </Flex>
        {person.description?.trim() && (
          <Text
            type="secondary"
            style={{ fontSize: 12, lineHeight: 1.5, marginTop: 6, textAlign: "center", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}
          >
            {person.description}
          </Text>
        )}
      </Flex>

      {/* 桌面端：垂直导航 */}
      <nav className="sidebar-nav sidebar-nav-desktop">
        {navItems.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`sidebar-nav-item${activeTab === item.key ? " sidebar-nav-item-active" : ""}`}
            onClick={() => onTabChange(item.key)}
          >
            <span className="sidebar-nav-item-label">{item.label}</span>
            {item.count > 0 && (
              <span className="sidebar-nav-item-count">{item.count}</span>
            )}
          </button>
        ))}
      </nav>

      {/* 移动端：折叠下拉 */}
      <MobileNavDropdown navItems={navItems} activeTab={activeTab} onTabChange={onTabChange} />

      {/* 管理操作 */}
      {authed && (
        <Flex gap={6} wrap="wrap" style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #e8e5e0" }}>
          <Button type="text" size="small" icon={<EditOutlined />} onClick={onEditProfile}>
            编辑
          </Button>
          {onRebuildCounts && (
            <Button
              type="text"
              size="small"
              icon={<CloudSyncOutlined />}
              loading={rebuildCountsLoading}
              onClick={onRebuildCounts}
            >
              同步
            </Button>
          )}
          {onDeletePerson && (
            <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={onDeletePerson}>
              删除
            </Button>
          )}
        </Flex>
      )}
    </aside>
  );
}
