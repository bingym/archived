import type { PersonSummary } from "./types";

interface Props {
  person: PersonSummary;
}

export default function PersonInfoTab({ person }: Props) {
  const desc = person.description ?? "";
  return (
    <div>
      <div>
        <b>姓名：</b>
        {person.name}
      </div>
      <div>
        <b>简介：</b>
        {desc}
      </div>
    </div>
  );
}
