import ApplicationHeader from "./component/ApplicationHeader";
import { ApplicationSidebar } from "./component/ApplicationSidebar";

function App() {
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
          ></main>
          <ApplicationSidebar />
        </div>
      </div>
    </>
  );
}

export default App;
