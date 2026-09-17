import HomeTehillim from "../../../app/tehillim/HomeTehillim";
import TehillimReader from "../../../app/tehillim/TehillimReader";
import { fontVars } from "../../../app/tehillim/fonts";
import { useHashRoute } from "./shims/navigation";
import DailyReminder from "./DailyReminder";

/**
 * The whole app: the same two screens the website has, chosen by the hash.
 *
 * Both components come straight from `app/tehillim` — the website's own source.
 * Nothing about the reader is reimplemented here, so a fix to the web app is a
 * fix to this one as soon as it is rebuilt. The only thing added is the daily
 * reminder, which has no counterpart on the web because it is scheduled by the
 * phone itself.
 */
export default function App() {
  const screen = useHashRoute().split("?")[0];
  if (screen === "read") {
    return (
      <div className={`tehillim-page ${fontVars}`}>
        <TehillimReader />
      </div>
    );
  }
  return (
    <div className={`tehillim-page ${fontVars}`}>
      <HomeTehillim />
      <div className="native-extras">
        <DailyReminder />
      </div>
    </div>
  );
}
