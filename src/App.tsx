import { useEffect, useState } from "react";
import { Routes, Route, Link } from "react-router-dom";
import "./App.css";
import PersonDetail from "./PersonDetail";
import LoginButton from "./components/LoginButton";
import PersonEditor, { type PersonForm } from "./components/PersonEditor";
import { apiFetch, useIsAuthed, useStorageSync } from "./auth";
import { resolveImg } from "./lib/img";

interface PersonInfo {
  id: string;
  name: string;
  avatar: string | null;
  description: string | null;
}

function TopBar() {
  return (
    <div className="navbar bg-base-100 shadow-sm sticky top-0 z-10">
      <div className="flex-1">
        <Link to="/people" className="btn btn-ghost text-lg">
          Archived
        </Link>
      </div>
      <div className="flex-none">
        <LoginButton />
      </div>
    </div>
  );
}

function PeopleList() {
  const authed = useIsAuthed();
  const [people, setPeople] = useState<PersonInfo[]>([]);
  const [editor, setEditor] = useState<{ mode: "create" | "edit"; initial?: PersonInfo } | null>(null);

  const reload = () => {
    apiFetch<PersonInfo[]>("/api/v1/people")
      .then(setPeople)
      .catch(() => setPeople([]));
  };

  useEffect(() => {
    reload();
  }, []);

  const onDelete = async (p: PersonInfo) => {
    if (!confirm(`确认删除 ${p.name}？这会清空 ta 的所有内容和图片。`)) return;
    try {
      await apiFetch(`/api/v1/people/${p.id}`, { method: "DELETE" });
      reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : "删除失败");
    }
  };

  return (
    <div className="main-center-wrapper w-full justify-center">
      <div className="w-1/2 mx-auto mt-8 px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">People</h1>
          {authed && (
            <button
              className="btn btn-sm btn-primary"
              onClick={() => setEditor({ mode: "create" })}
            >
              + 新建
            </button>
          )}
        </div>
        <ul className="w-full mx-auto divide-y divide-gray-200 bg-base-100 rounded-box shadow">
          {people.map((person) => (
            <li key={person.id} className="flex items-center py-4 px-2">
              <div className="flex-1 flex items-center gap-4">
                {person.avatar ? (
                  <img
                    src={resolveImg(person.avatar)}
                    alt={person.name}
                    className="w-14 h-14 rounded-full object-cover border border-base-200"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-base-200" />
                )}
                <div>
                  <div className="font-semibold text-lg">{person.name}</div>
                  <div className="text-sm text-gray-500 line-clamp-2 max-w-xs">
                    {person.description}
                  </div>
                </div>
              </div>
              <div className="ml-4 flex items-center gap-2">
                {authed && (
                  <>
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => setEditor({ mode: "edit", initial: person })}
                    >
                      编辑
                    </button>
                    <button
                      className="btn btn-sm btn-ghost text-red-600"
                      onClick={() => void onDelete(person)}
                    >
                      删除
                    </button>
                  </>
                )}
                <Link to={`/people/${person.id}`} className="btn btn-primary btn-sm">
                  Go
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </div>
      {editor && (
        <PersonEditor
          mode={editor.mode}
          initial={editor.initial as PersonForm | undefined}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

function App() {
  useStorageSync();
  return (
    <>
      <TopBar />
      <Routes>
        <Route path="/" element={<PeopleList />} />
        <Route path="/people" element={<PeopleList />} />
        <Route path="/people/:id" element={<PersonDetail />} />
      </Routes>
    </>
  );
}

export default App;
