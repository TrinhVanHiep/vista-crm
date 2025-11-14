import './App.css';

function App() {
  return (
    <div className="app">
      <header className="app__header">
        <img src="/vite.svg" className="app__logo" alt="Vista CRM logo" />
        <h1>Welcome to Vista CRM</h1>
        <p>Your React project is ready to build modern customer experiences.</p>
      </header>
      <main className="app__main">
        <section>
          <h2>Next steps</h2>
          <ul>
            <li>Start the dev server with <code>npm install</code> and <code>npm run dev</code>.</li>
            <li>Build features inside <code>src/</code>.</li>
            <li>Update this landing page to match your product vision.</li>
          </ul>
        </section>
      </main>
    </div>
  );
}

export default App;
