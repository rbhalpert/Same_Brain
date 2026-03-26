import { useEffect, useState } from "react";

export function useCountdown(deadline?: number) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!deadline) {
      return undefined;
    }

    setNow(Date.now());
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 250);

    return () => {
      window.clearInterval(interval);
    };
  }, [deadline]);

  if (!deadline) {
    return {
      isExpired: false,
      secondsRemaining: undefined as number | undefined
    };
  }

  const millisecondsRemaining = Math.max(0, deadline - now);
  return {
    isExpired: millisecondsRemaining <= 0,
    secondsRemaining: Math.ceil(millisecondsRemaining / 1000)
  };
}

