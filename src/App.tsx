import { lazy, Suspense } from "react";
import "./App.css";
import { Link, Navigate, Route, Routes, useParams } from "react-router-dom";
import { Layout, Spin, theme, Typography } from "antd";
import { UnorderedListOutlined } from "@ant-design/icons";
import LoginButton from "./components/LoginButton";
import { useStorageSync } from "./auth";

const PeopleListPage = lazy(() => import("./pages/PeopleListPage"));
const PersonDetail = lazy(() => import("./PersonDetail"));

const { Header, Content } = Layout;
const { Text } = Typography;

/** `/people/:id` → `/people/:id/info` */
function PersonDetailIndexRedirect() {
  const { id } = useParams();
  if (!id) return <Navigate to="/people" replace />;
  return <Navigate to={`/people/${id}/info`} replace />;
}

function RouteFallback() {
  const { token } = theme.useToken();
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: token.paddingXL * 3 }}>
      <Spin size="large" description="Loading..." />
    </div>
  );
}

function TopBar() {
  const { token } = theme.useToken();
  return (
    <Header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingInline: token.paddingLG,
        background: token.colorBgContainer,
        borderBottom: `1px solid ${token.colorSplit}`,
        position: "sticky",
        top: 0,
        zIndex: 100,
        height: 56,
        lineHeight: "56px",
      }}
    >
      <Link to="/people" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", color: "inherit" }}>
        <UnorderedListOutlined style={{ fontSize: 18, color: token.colorPrimary }} />
        <Text strong style={{ fontSize: 16 }}>
          Archived
        </Text>
      </Link>
      <LoginButton />
    </Header>
  );
}

export default function App() {
  useStorageSync();
  const { token } = theme.useToken();
  return (
    <Layout style={{ minHeight: "100vh", background: token.colorBgLayout }}>
      <TopBar />
      <Content style={{ padding: token.paddingLG }}>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<PeopleListPage />} />
            <Route path="/people" element={<PeopleListPage />} />
            <Route path="/people/:id/:tab" element={<PersonDetail />} />
            <Route path="/people/:id" element={<PersonDetailIndexRedirect />} />
          </Routes>
        </Suspense>
      </Content>
    </Layout>
  );
}
