import { useEffect, useRef, useState } from "react";

// The app-wide two-tap confirm: the first tap arms the button ("sure?"), a
// second tap on the SAME key within `ms` fires, and arming something else
// (or waiting) disarms. Every delete of user data shares this rhythm — a
// gentler guard than a confirm dialog, still saves work from one stray tap.
//
//   const [armedId, arm] = useArmed();
//   <button onClick={() => arm(task.id, () => removeTask(task.id))}>
//     {armedId === task.id ? "sure?" : "✕"}
//   </button>
export function useArmed(ms = 2500) {
  const [armedId, setArmedId] = useState(null);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const arm = (id, fire) => {
    clearTimeout(timer.current);
    if (armedId === id) {
      setArmedId(null);
      fire();
      return;
    }
    setArmedId(id);
    timer.current = setTimeout(() => setArmedId(null), ms);
  };

  return [armedId, arm];
}
