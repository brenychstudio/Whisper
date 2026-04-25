import { useEffect, useState } from "react";

let threeRuntimePromise = null;

function loadThreeRuntime() {
  if (!threeRuntimePromise) {
    threeRuntimePromise = import("three");
  }

  return threeRuntimePromise;
}

export function useThreeRuntimeLoader(enabled) {
  const [state, setState] = useState({
    isLoaded: false,
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    if (!enabled) return;

    let isMounted = true;

    setState({
      isLoaded: false,
      isLoading: true,
      error: null,
    });

    loadThreeRuntime()
      .then(() => {
        if (!isMounted) return;

        setState({
          isLoaded: true,
          isLoading: false,
          error: null,
        });
      })
      .catch((err) => {
        if (!isMounted) return;

        setState({
          isLoaded: false,
          isLoading: false,
          error: err instanceof Error ? err.message : "Failed to load three runtime",
        });
      });

    return () => {
      isMounted = false;
    };
  }, [enabled]);

  return state;
}
