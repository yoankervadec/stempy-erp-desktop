import { useEffect, useState } from "react";

import ApplicationHeader from "./component/ApplicationHeader";
import { ApplicationSidebar } from "./component/ApplicationSidebar";

function App() {
  const [stationInfo, setStationInfo] = useState<StationInfo | null>(null);

  useEffect(() => {
    async function load() {
      const info = await window.electron.getStationInfo();
      setStationInfo(info);
      console.log(info);
    }
    load();
  }, []);

  return (
    <>
      <div
        style={{
          height: "100vh",
          overflow: "hidden",
        }}
      >
        <ApplicationHeader />
        <div
          style={{
            display: "flex",
            width: "100%",
            height: "calc(100% - 35px)",
          }}
        >
          <main
            style={{
              width: "100%",
              height: "100%",
            }}
          >
            {stationInfo && <pre>{JSON.stringify(stationInfo, null, 2)}</pre>}
          </main>
          <ApplicationSidebar />
        </div>
      </div>
    </>
  );
}

export default App;
