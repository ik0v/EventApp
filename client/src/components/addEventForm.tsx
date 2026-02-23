import React, { useState, useEffect } from "react";
import "./addEventForm.css";

const CATEGORIES = ["Fun", "Education", "Animals"] as const;
type Category = (typeof CATEGORIES)[number];

export default function AddEventForm() {
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [place, setPlace] = useState("");
  const [time, setTime] = useState("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    // (async () => {
    //   const res = await fetch("/api/categories"); // your endpoint
    //   const data = await res.json();
    //   setCategories(data);
    // })();
    setCategories([...CATEGORIES]);
  }, []);

  async function saveEvent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // const missing: string[] = [];
    // if (!title.trim()) missing.push("title");
    // if (!place.trim()) missing.push("place");
    // if (!time.trim()) missing.push("time");
    // if (!category.trim()) missing.push("category");
    //
    // if (missing.length > 0) {
    //   setError(`Please fill: ${missing.join(", ")}`);
    //   return;
    // }
    // setError("");

    await fetch("/api/events", {
      method: "POST",
      body: JSON.stringify({ title, description, place, time, category }),
      headers: { "Content-Type": "application/json" },
    });

    setTitle("");
    setDescription("");
    setPlace("");
    setTime("");
    setCategory("");
  }

  return (
    <form className="add-event-form" onSubmit={saveEvent}>
      <h2 className="form-title">Add event</h2>
      {/*{error ? <div className="aefError">{error}</div> : null}*/}
      <label className="form-label">
        <span className="form-span">Title *</span>
        <input
          className="form-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </label>

      <label className="form-label">
        <span className="form-span">Description</span>
        <textarea
          className="form-input form-textarea"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
        />
      </label>

      <div className="form-row">
        <label className="form-label">
          <span className="form-span">Place *</span>
          <input
            className="form-input"
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            required
          />
        </label>

        <label className="form-label">
          <span className="form-span">Time *</span>
          <input
            className="form-input"
            type="datetime-local"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
          />
        </label>
      </div>

      <label className="form-label">
        <span className="form-span">Category *</span>
        <select
          className="form-input"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
        >
          <option value="" disabled hidden>
            Select category
          </option>

          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <button className="form-btn" type="submit">
        Submit
      </button>
    </form>
  );
}
