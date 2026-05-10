import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App as AntdApp, ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          borderRadius: 8,
          colorPrimary: "#2f3b30",
          colorLink: "#2f6b4f",
          colorLinkHover: "#3d8a66",
          colorBgLayout: "#f8f7f4",
          colorBgContainer: "#ffffff",
          colorBorderSecondary: "#e8e5e0",
          colorText: "#1a1a1a",
          colorTextSecondary: "#6b7280",
          colorSplit: "#e8e5e0",
        },
        components: {
          Layout: {
            headerHeight: 56,
            headerPadding: "0 24px",
            headerBg: "#ffffff",
          },
          Card: {
            colorBorderSecondary: "#e8e5e0",
          },
          Tabs: {
            inkBarColor: "#2f3b30",
            itemActiveColor: "#1a1a1a",
            itemSelectedColor: "#1a1a1a",
            itemHoverColor: "#2f3b30",
            itemColor: "#6b7280",
          },
          Button: {
            primaryColor: "#ffffff",
          },
        },
      }}
    >
      <AntdApp>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AntdApp>
    </ConfigProvider>
  </StrictMode>,
);
