import { Component, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { ConsentManager } from "../../src/components/analytics/ConsentManager";
import { Baldrick } from "../../src/components/baldrick/Baldrick";
import { ShareRow } from "../../src/components/document/ShareRow";
import { OrderForm } from "../../src/components/document/OrderForm";
import { FunnelForm } from "../../src/components/analytics/FunnelForm";
import { ANALYTICS_EVENT_NAMES, emitAnalyticsEvent } from "../../src/lib/analytics";

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  override render() { return this.state.failed ? <p>Action refused</p> : this.props.children; }
}

declare global {
  interface Window {
    analyticsFixture: {
      render(config: { googleTagId: string | null; metaPixelId: string | null }): void;
      emit: typeof emitAnalyticsEvent;
      names: typeof ANALYTICS_EVENT_NAMES;
      completedActions: number;
    };
  }
}

const root = createRoot(document.getElementById("app") as HTMLElement);
async function action(data: FormData): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 100));
  if (data.get("result") === "fail") throw new Error("Action refused");
  window.analyticsFixture.completedActions += 1;
}
window.analyticsFixture = {
  render(config) {
    root.render(<>
      <h1>Analytics consent fixture</h1>
      <ConsentManager {...config} />
      <Baldrick />
      <ShareRow url="https://store.example/done-deals/SECRET" />
      <OrderForm label="Choose tier" variantId="variant_example" storeOpen action={async () => undefined} />
      <Boundary>
        <FunnelForm event="merch_added" action={action}>
          <label>Outcome<input name="result" defaultValue="success" /></label>
          <button>Add merchandise</button>
        </FunnelForm>
      </Boundary>
      <Boundary>
        <FunnelForm event="bad_discount_accepted" action={action}>
          <label>Code outcome<input name="result" defaultValue="success" /></label>
          <button>Accept code</button>
        </FunnelForm>
      </Boundary>
    </>);
  },
  emit: emitAnalyticsEvent,
  names: ANALYTICS_EVENT_NAMES,
  completedActions: 0,
};
