import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from "react-router-dom";
import "./App.css";
import PersonDetail from "./PersonDetail";

interface PersonInfo {
  id: string;
  name: string;
  avatar: string;
  description: string;
}

function PeopleList() {
  const [people, setPeople] = useState<PersonInfo[]>([]);

  useEffect(() => {
    fetch("/api/v1/people")
      .then((res) => res.json())
      .then((data) => setPeople(data));
  }, []);

  return (
    <div className="main-center-wrapper w-full justify-center">
      <div className="w-1/2 mx-auto mt-8 px-4">
        <h1 className="text-2xl font-bold mb-6">People</h1>
        <ul className="w-full mx-auto divide-y divide-gray-200 bg-base-100 rounded-box shadow">
          {people.map((person) => (
            <li key={person.id} className="flex items-center py-4 px-2">
              {/* 左侧：头像、名字、描述 */}
              <div className="flex-1 flex items-center gap-4">
                {person.avatar ? (
                  <img
                    src={person.avatar}
                    alt={person.name}
                    className="w-14 h-14 rounded-full object-cover border border-base-200"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-base-200" />
                )}
                <div>
                  <div className="font-semibold text-lg">{person.name}</div>
                  <div className="text-sm text-gray-500 line-clamp-2 max-w-xs">{person.description}</div>
                </div>
              </div>
              {/* 右侧：操作栏 */}
              <div className="ml-4">
                <Link to={`/people/${person.id}`} className="btn btn-primary btn-sm">
                  Go
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/people" element={<PeopleList />} />
        <Route path="/people/:id" element={<PersonDetail />} />
        <Route path="/" element={<Navigate to="/people" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
