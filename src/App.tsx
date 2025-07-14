import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useParams, Navigate } from "react-router-dom";
import "./App.css";

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

  // 每行3个分组
  const rows = [];
  for (let i = 0; i < people.length; i += 3) {
    rows.push(people.slice(i, i + 3));
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

function PersonPage() {
  const { id } = useParams<{ id: string }>();
  const [person, setPerson] = useState<PersonInfo | null>(null);

  useEffect(() => {
    fetch(`/api/v1/people/${id}`)
      .then((res) => res.json())
      .then((data) => setPerson(data));
  }, [id]);

  if (!person) return <div className="main-center-wrapper"><div className="container"><h1>Not Found</h1></div></div>;

  return (
    <div className="main-center-wrapper">
      <div className="container">
        <h1>{person.name}</h1>
        {person.avatar ? (
          <img src={person.avatar} alt={person.name} className="avatar" />
        ) : (
          <div className="avatar placeholder" />
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/people" element={<PeopleList />} />
        <Route path="/people/:id" element={<PersonPage />} />
        <Route path="/" element={<Navigate to="/people" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
