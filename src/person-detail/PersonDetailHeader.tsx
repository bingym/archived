import { Link } from "react-router-dom";
import { Button } from "antd";
import { resolveImg } from "../lib/img";
import type { PersonSummary } from "./types";

interface Props {
  person: PersonSummary;
  authed: boolean;
  onEditProfile: () => void;
}

export default function PersonDetailHeader({ person, authed, onEditProfile }: Props) {
  return (
    <>
      <Link to="/people" className="mb-4 text-blue-700 font-bold hover:underline block">
        &lt; 返回
      </Link>
      <div className="flex items-center mb-8">
        <div className="avatar">
          <div className="w-24 rounded overflow-hidden">
            {person.avatar ? (
              <img src={resolveImg(person.avatar)} alt={person.name} />
            ) : (
              <div className="w-24 h-24" />
            )}
          </div>
        </div>
        <div className="ml-8 flex-1">
          <h1 style={{ marginBottom: 8 }}>{person.name}</h1>
        </div>
        {authed && (
          <Button size="small" onClick={onEditProfile}>
            编辑信息
          </Button>
        )}
      </div>
    </>
  );
}
