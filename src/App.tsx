import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from "react-router-dom";
import "./App.css";
import PersonDetail from "./PersonDetail";

interface PersonInfo {
  id: string;
  name: string;
  avatar: string;
}

function PeopleList() {
  const [people, setPeople] = useState<PersonInfo[]>([]);

  useEffect(() => {
    fetch("/api/v1/people")
      .then((res) => res.json())
      .then((data) => setPeople(data));
  }, []);

  // 每行4个分组
  const rows = [];
  for (let i = 0; i < people.length; i += 4) {
    rows.push(people.slice(i, i + 4));
  }

  return (
    <div className="main-center-wrapper">
      <div className="container">
        <h1>People</h1>
        {rows.map((row, rowIdx) => (
          <div className="row" key={rowIdx}>
            {row.map((person, colIdx) => (
              <Link
                to={`/people/${person.id}`}
                className="card"
                key={`${person.name}-${rowIdx}-${colIdx}`}
                style={{ textDecoration: "none" }}
              >
                {person.avatar ? (
                  <img
                    src={person.avatar}
                    alt={person.name}
                    className="avatar"
                  />
                ) : (
                  <div className="avatar placeholder" />
                )}
                <div className="name">{person.name}</div>
              </Link>
            ))}
          </div>
        ))}
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
