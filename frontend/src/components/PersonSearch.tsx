import { useState, useRef } from "react";
import { Person } from "../types";

interface Props {
  people: Person[];
  value: string; // personId
  onChange: (personId: string) => void;
  exclude?: string;
  placeholder?: string;
}

export default function PersonSearch({ people, value, onChange, exclude, placeholder = "Search person..." }: Props) {
  const selected = people.find((p) => p.personId === value);
  const [inputValue, setInputValue] = useState(selected ? (selected.name || "Unknown") : "");
  const [open, setOpen] = useState(false);
  const skipBlur = useRef(false);

  const filtered = people.filter(
    (p) =>
      p.personId !== exclude &&
      (p.name || "Unknown").toLowerCase().includes(inputValue.toLowerCase())
  );

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    onChange("");
    setOpen(true);
  };

  const handleSelect = (p: Person) => {
    setInputValue(p.name || "Unknown");
    onChange(p.personId);
    setOpen(false);
  };

  const handleBlur = () => {
    if (skipBlur.current) { skipBlur.current = false; return; }
    setOpen(false);
    // If nothing selected, clear the input
    if (!value) setInputValue("");
  };

  return (
    <div className="person-search">
      <input
        type="text"
        value={inputValue}
        onChange={handleInput}
        onFocus={() => setOpen(true)}
        onBlur={handleBlur}
        placeholder={placeholder}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <ul
          className="person-search-dropdown"
          onMouseDown={() => { skipBlur.current = true; }}
        >
          {filtered.map((p) => (
            <li key={p.personId} onClick={() => handleSelect(p)}>
              {p.name || "Unknown"}
              {p.dob ? <span className="muted"> · {p.dob}</span> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
