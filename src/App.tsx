import { lazy, Suspense } from "react";
import { Routes, Route, Link } from "react-router-dom";
import { Button, Layout, Spin } from "antd";
import "./App.css";
import LoginButton from "./components/LoginButton";
import { useStorageSync } from "./auth";

const PeopleListPage = lazy(() => import("./pages/PeopleListPage"));
const PersonDetail = lazy(() => import("./PersonDetail"));

const { Header } = Layout;

function RouteFallback() {
  return (
    <div className="main-center-wrapper flex items-center justify-center">
      <Spin size="large" />
    </div>
  );
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

function App() {
  useStorageSync();
  return (
    <>
      <TopBar />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<PeopleListPage />} />
          <Route path="/people" element={<PeopleListPage />} />
          <Route path="/people/:id" element={<PersonDetail />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default App;
