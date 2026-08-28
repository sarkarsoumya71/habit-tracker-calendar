"use client";

import { useEffect, useRef, useState } from "react";
import { PALETTE } from "@/lib/types";
import { Close, Trash } from "./Icons";
import type { Habit } from "@/lib/types";

type Props = {
  habit: Habit | null;
  onClose: () => void;
  onSave: (values: { name: string; color: string; description: string }) => void;
  onDelete?: () => void;
};

/** Create or edit a habit: name, colour, description. */
export default function HabitModal({ habit, onClose, onSave, onDelete }: Props) {
  const [name, setName] = useState(habit?.name ?? "");
  const [color, setColor] = useState(habit?.color ?? PALETTE[Math.floor(Math.random() * PALETTE.length)]);
  const [description, setDescription] = useState(habit?.description ?? "");
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
    nameRef.current?.select();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); }
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  });

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Give the habit a name.");
      nameRef.current?.focus();
      return;
    }
    onSave({ name: trimmed, color, description: description.trim() });
  };

  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={habit ? "Edit habit" : "New habit"}>
        <div className="modal-head">
          <span className="modal-title">{habit ? "Edit habit" : "New habit"}</span>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Close />
          </button>
        </div>

        <div className="modal-body">
          <div className="field">
            <label className="label" htmlFor="habit-name">Name</label>
            <input
              id="habit-name"
              ref={nameRef}
              className="input"
              value={name}
              maxLength={80}
              placeholder="Read 20 pages"
              onChange={(e) => { setName(e.target.value); setError(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } }}
            />
            {error && <span className="form-error">{error}</span>}
          </div>

          <div className="field">
            <label className="label">Colour</label>
            <div className="swatches">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  className="sw"
                  style={{ background: c }}
                  aria-pressed={color.toLowerCase() === c.toLowerCase()}
                  aria-label={`Colour ${c}`}
                  onClick={() => setColor(c)}
                />
              ))}
              <label className="sw-custom" title="Custom colour" style={{ position: "relative", background: color }}>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  aria-label="Custom colour"
                />
              </label>
            </div>
          </div>

          <div className="field">
            <label className="label" htmlFor="habit-desc">Description <span style={{ textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
            <textarea
              id="habit-desc"
              className="textarea"
              value={description}
              maxLength={2000}
              placeholder="What counts as done? Any detail worth remembering later."
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {habit && confirming && (
            <p className="form-error">
              Delete “{habit.name}” and every day logged against it? This cannot be undone.
            </p>
          )}
        </div>

        <div className="modal-foot">
          {habit && onDelete && (
            <button
              className="btn btn-danger"
              onClick={() => (confirming ? onDelete() : setConfirming(true))}
            >
              <Trash /> {confirming ? "Yes, delete" : "Delete"}
            </button>
          )}
          <span className="spacer" />
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit}>
            {habit ? "Save" : "Create habit"}
          </button>
        </div>
      </div>
    </div>
  );
}
