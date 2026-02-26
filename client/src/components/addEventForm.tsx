import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./authContext";
import "./addEventForm.css";

const CATEGORIES = ["Fun", "Education", "Animals"] as const;

type SaveState = "idle" | "saving" | "result";
type ResultKind = "success" | "conflict";

export default function AddEventForm() {
  const navigate = useNavigate();
  const { sub } = useAuth();

  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [place, setPlace] = useState("");
  const [time, setTime] = useState("");
  const [error, setError] = useState<string>("");

  const [state, setState] = useState<SaveState>("idle");
  const [result, setResult] = useState<{
    kind: ResultKind;
    title: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    setCategories([...CATEGORIES]);
  }, []);

  function resetForm() {
    setTitle("");
    setDescription("");
    setPlace("");
    setTime("");
    setCategory("");
  }

  function focusTitle() {
    requestAnimationFrame(() => {
      // first .form-input is the title input in your markup
      const el = document.querySelector<HTMLInputElement>(".form-input");
      el?.focus();
      el?.select?.();
    });
  }

  function tryAgain() {
    setError("");
    setResult(null);
    setState("idle");
    focusTitle();
  }

  async function saveEvent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state === "saving") return;

    setError("");
    setState("saving");

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        body: JSON.stringify({
          title,
          description,
          place,
          time,
          category,
          createdBy: sub,
        }),
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        let msg = `${res.status} ${res.statusText}`;
        try {
          const data = await res.json();
          if (data?.message) msg = data.message;
        } catch {}

        if (res.status === 409) {
          setResult({
            kind: "conflict",
            title: "Title already exists",
            message: msg || "An event with that title already exists.",
          });
          setState("result");
          return;
        }

        throw new Error(msg);
      }

      resetForm();
      setResult({
        kind: "success",
        title: "Event added",
        message: "Do you want to add another event?",
      });
      setState("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add event");
      setState("idle");
    }
  }

  // ----- Result card (re-used for success + conflict) -----
  if (state === "result" && result) {
    const isSuccess = result.kind === "success";

    return (
      <div className="aefSuccessWrap">
        <div className="aefSuccessCard" role="status" aria-live="polite">
          <div
            className={`aefSuccessIcon ${isSuccess ? "" : "warn"}`}
            aria-hidden="true"
          >
            {isSuccess ? "✓" : "!"}
          </div>

          <div className="aefSuccessTitle">{result.title}</div>
          <div className="aefSuccessText">{result.message}</div>

          <div className="aefSuccessActions">
            <button
              type="button"
              className="aefSuccessBtn primary"
              onClick={tryAgain}
            >
              {isSuccess ? "Add another" : "Try again"}
            </button>

            <button
              type="button"
              className="aefSuccessBtn"
              onClick={() => navigate("/events")}
            >
              Go to events
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      className={`add-event-form ${state === "saving" ? "isSaving" : ""}`}
      onSubmit={saveEvent}
      aria-busy={state === "saving"}
    >
      <h2 className="form-title">Add event</h2>

      {error ? (
        <div className="aefError" role="alert">
          {error}
        </div>
      ) : null}

      <label className="form-label">
        <span className="form-span">Title *</span>
        <input
          className="form-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          disabled={state === "saving"}
        />
      </label>

      <label className="form-label">
        <span className="form-span">Description</span>
        <textarea
          className="form-input form-textarea"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          disabled={state === "saving"}
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
            disabled={state === "saving"}
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
            disabled={state === "saving"}
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
          disabled={state === "saving"}
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

      <button className="form-btn" type="submit" disabled={state === "saving"}>
        {state === "saving" ? (
          <span className="btnInner">
            <span className="spinner" aria-hidden="true" />
            Saving…
          </span>
        ) : (
          "Submit"
        )}
      </button>
    </form>
  );
}
