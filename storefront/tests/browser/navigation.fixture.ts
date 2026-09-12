import { useSyncExternalStore } from "react";

const subscribe = (listener: () => void) => {
  window.addEventListener("popstate", listener);
  return () => window.removeEventListener("popstate", listener);
};
export const usePathname = () => useSyncExternalStore(subscribe, () => location.pathname, () => "/");
export const useRouter = () => ({
  push(path: string) { history.pushState(null, "", path); window.dispatchEvent(new PopStateEvent("popstate")); },
  refresh() { /* Server content is covered by action tests; this fixture owns only client behavior. */ },
});
