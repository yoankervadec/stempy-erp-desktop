function App() {
  return (
    <>
      <div style={{ height: "100vh", overflow: "hidden" }}>
        <header
          className="app-header"
          style={{ border: "1px solid green", height: "30px", width: "100%" }}
        >
          {/* <button onClick={() => window.electron.minimize()}>_</button>
          <button onClick={() => window.electron.maximize()}>[]</button>
          <button onClick={() => window.electron.close()}>X</button> */}
        </header>
        <div
          style={{
            display: "flex",
            width: "100%",
            height: "calc(100% - 30px)",
          }}
        >
          <main style={{ width: "100%", border: "1px solid blue" }}></main>
          <nav
            style={{
              marginRight: "0",
              border: "1px solid red",
              width: "200px",
            }}
          ></nav>
        </div>
      </div>
    </>
  );
}

export default App;
