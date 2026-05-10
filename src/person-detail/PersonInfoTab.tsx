import { Descriptions } from "antd";
import type { PersonSummary } from "./types";

interface Props {
  person: PersonSummary;
}

export default function PersonInfoTab({ person }: Props) {
  return (
    <Descriptions
      title="基本信息"
      column={1}
      size="middle"
      styles={{
        label: { width: 96, color: "#6b7280", fontWeight: 500 },
      }}
      style={{ maxWidth: 720 }}
    >
      <Descriptions.Item label="姓名">{person.name}</Descriptions.Item>
      <Descriptions.Item label="简介">{person.description ?? "—"}</Descriptions.Item>
    </Descriptions>
  );
}
