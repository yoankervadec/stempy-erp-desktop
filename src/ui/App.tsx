function App() {
  return (
    <>
      <div
        style={{
          height: "100vh",
          overflow: "hidden",
        }}
      >
        <header
          className="app-header"
          style={{ border: "1px solid green", height: "35px", width: "100%" }}
        ></header>
        <div
          style={{
            display: "flex",
            width: "100%",
            height: "calc(100% - 35px)",
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
